# 분석 파이프라인

## 지원서 분석 API

백엔드 엔드포인트: `POST /api/resume/analyze/` (`resume_analyze` in `backend/api/views/resume_endpoints.py`)

프론트는 `requestResumeAnalysisById()`에서 `resume/get`으로 대상 지원서를 확인한 뒤 `/api/resume/analyze/`를 호출합니다. 백엔드의 `AnalysisReport` 응답은 프론트에서 `report`와 `questions` 형태로 포장됩니다.

근거:

- `frontend/src/api/clients/resumeReportClient.ts`
- `backend/api/urls.py`
- `backend/api/views/resume_endpoints.py`

## 입력 조회

`_get_analysis_resume(request, resume_id)`:

1. 세션 사용자인 경우 `Resume`을 `job_description__account=request.user`로 제한합니다.
2. 비로그인 사용자인 경우 `X-API-Key`를 조회합니다.
3. API 키 경로는 `authorized_resume`에 포함된 resume id만 허용합니다.
4. 조건에 맞는 `Resume` 객체를 반환하고, 없으면 `None`을 반환합니다.

`resume_analyze(request)`:

1. `{ id }`로 resume id를 받습니다.
2. `_get_analysis_resume()`로 권한과 대상 지원서를 확인합니다.
3. 빈 `AnalysisReport`를 `status=onqueue`로 먼저 생성합니다.
4. Celery worker가 있으면 `enqueue_report_analyze.delay(report.id)`를 호출하고 queued 리포트를 즉시 반환합니다.
5. Celery worker가 없거나 enqueue가 실패하면 `analyze_and_save_report(report.id)`를 동기로 실행합니다.

## LLM 분석

`backend/api/tasks.py`의 `analyze_and_save_report(report_id)`가 DB에서 분석 입력을 모으고, `backend/common/analysis_graph.py`의 `invoke(company_dict, jd_dict, checklist, resume_dict)`가 전체 LLM 분석을 수행합니다.

입력 구성:

- `CompanyInfo.to_masked_dict()`
- `JobDescription.to_masked_dict()`
- `Resume.to_masked_dict()`
- 해당 JD의 `Checklist.content` 목록

순서:

1. `mask_inputs`: 회사·JD·지원서의 민감 식별자를 마스킹
2. `star_analysis`: 자기소개서 문항별 STAR 구조와 원문 품질 생성
3. `check_resume_fit`: DB의 JD 체크리스트를 지원서가 충족하는지 판단
4. `fit_feedback`: 최소 95점, 최대 3회로 적합도 판정 검증·보정
5. `interview_questions`: 면접 질문 10개, 모범 답안, 질문 의도 생성
6. `question_feedback`: 최소 85점, 최대 3회로 질문 검증·보정
7. `report`: 최종 분석 리포트 생성
8. `report_feedback`: 최소 95점, 최대 3회로 리포트 검증·보정
9. `finalize`: 결과에 버전을 넣고 마스킹 토큰을 원문으로 복원

모델명:

- 적합도 판정·품질 평가 모델: `gpt-4o-mini`; 면접 질문·최종 리포트 생성 모델: `gpt-4.1` — `backend/common/analysis_agent.py`, `feedback_agent.py`
- 임베딩 노트북: `text-embedding-3-small`

운영 API(`resume_analyze`)는 `backend/api/tasks.py`를 거쳐 `analysis_graph.py`를 사용합니다. 분석 실패 시 차감한 계정/API 키 크레딧을 환불합니다. 근거: `backend/api/views/resume_endpoints.py`, `backend/api/tasks.py`

## 구조화 응답

`analysis_agent.py`는 Pydantic 모델을 구조화 출력 스키마로 사용합니다. 그래프는 마스킹 → STAR 분석 → 체크리스트 적합도 → 품질 피드백 → 면접 질문 → 품질 피드백 → 리포트 → 품질 피드백 순으로 실행합니다.

- `InterviewQuestionsStructure`
- `FitChecklistStructure`
- `ChecklistCheckStructure`
- `ReportStructure`

`analysis_agent.py`는 LangChain `ChatOpenAI.with_structured_output()`으로 Pydantic 스키마를 강제합니다. OpenAI SDK의 JSON object 응답과 Pydantic 검증은 RunPod 폴백 구현인 `masking.py`, `star_analysis.py`에서 사용합니다.

## 결과 저장

`_apply_analysis_result(report, report_data)`:

1. LLM 결과에서 리포트 필드와 면접 질문 목록을 추출합니다.
2. 기존 `AnalysisReport` 행에 결과 필드를 채웁니다. 면접 질문은 `interview_question` JSON 필드에 넣습니다.
3. `AnalysisReport.status`를 `done`으로 변경합니다.
4. 저장된 `AnalysisReport.to_dict()`를 반환합니다.

이전 버전의 `InterviewQuestion` 별도 테이블 upsert/bulk_create 흐름은 제거되었습니다.

근거: `backend/api/tasks.py`, `backend/api/models.py`

## JD 체크리스트 생성 API

`POST /api/jd/analyze/`는 `{ id, query?, cnt? }`를 받아 해당 JD의 체크리스트 생성을 시작합니다. `checklist_status`는 `onqueue → processing → done` 또는 `fail`로 바뀌며, Celery worker가 없으면 동기로 실행합니다. 그래프는 검색 쿼리를 만든 뒤 Pinecone `qualify_conditions`와 코드상 철자인 `preffered_conditions` namespace를 3:2 비율로 조회하고, 마스킹된 참고 조건으로 체크리스트를 생성·복원합니다. 기본 목표 개수는 10개이며 기존 항목 수를 고려합니다.

근거: `backend/api/views/job_description_endpoints.py`, `backend/api/tasks.py`, `backend/common/checklist_graph.py`

## 실패와 예외

- resume id 누락: 400
- 인증 실패: 400 응답 안에 403 메시지
- 이력서 없음: 400
- LLM/OpenAI/Pinecone/RunPod 오류: 상위 try/except에서 500 메시지로 반환하고, 이미 차감한 분석 비용은 task 계층에서 환불

## 관련 문서

- [모델 파이프라인](../07-ai-modeling/model-pipeline.md)
- [지원서 분석 기능](../08-features/resume-analysis.md)
