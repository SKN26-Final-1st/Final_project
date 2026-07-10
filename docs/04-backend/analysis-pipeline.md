# 분석 파이프라인

## 지원서 분석 API

백엔드 엔드포인트: `POST /api/resume/analyze/` (`resume_analyze` in `backend/api/views/resume_endpoints.py`)

프론트는 `requestResumeAnalysisById()`에서 `resume/get`으로 대상 지원서를 확인한 뒤 `/api/resume/analyze/`를 호출합니다. 백엔드의 `AnalysisReport` 응답은 프론트에서 `report`와 `questions` 형태로 포장됩니다.

근거:

- `frontend/src/api/backendClient.ts`
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

1. `sum_resume()`: 지원서 요약
2. `sum_company()`: 회사 정보 요약
3. `sum_jd()`: JD 요약
4. `check_resume_fit()`: DB에 저장된 JD 체크리스트를 지원서 요약이 충족하는지 판단
5. `make_interview_questions()`: 면접 질문, 모범 답안, 질문 의도 생성
6. `make_report()`: 최종 분석 리포트 생성

모델명:

- 분석·평가 기본 모델: `gpt-4o-mini`; 면접 질문 생성 모델: `gpt-4.1` — `backend/common/analysis_agent.py`
- 임베딩 노트북: `text-embedding-3-small`

운영 API(`resume_analyze`)는 `backend/api/tasks.py`를 거쳐 `analysis_graph.py`를 사용합니다. 분석 실패 시 차감한 계정/API 키 크레딧을 환불합니다. 근거: `backend/api/views/resume_endpoints.py`, `backend/api/tasks.py`

## 구조화 응답

`analysis_agent.py`는 Pydantic 모델을 구조화 출력 스키마로 사용합니다. 그래프는 마스킹 → STAR 분석 → 체크리스트 적합도 → 품질 피드백 → 면접 질문 → 품질 피드백 → 리포트 → 품질 피드백 순으로 실행합니다.

- `InterviewQuestionsStructure`
- `FitChecklistStructure`
- `ChecklistCheckStructure`
- `ReportStructure`

OpenAI SDK의 `client.beta.chat.completions.parse`가 있으면 parse를 사용하고, 없으면 JSON object 응답을 받은 뒤 Pydantic으로 검증합니다.

## 결과 저장

`_apply_analysis_result(report, report_data)`:

1. LLM 결과에서 리포트 필드와 면접 질문 목록을 추출합니다.
2. 기존 `AnalysisReport` 행에 결과 필드를 채웁니다. 면접 질문은 `interview_question` JSON 필드에 넣습니다.
3. `AnalysisReport.status`를 `done`으로 변경합니다.
4. 저장된 `AnalysisReport.to_dict()`를 반환합니다.

이전 버전의 `InterviewQuestion` 별도 테이블 upsert/bulk_create 흐름은 제거되었습니다.

근거: `backend/api/tasks.py`, `backend/api/models.py`

## JD 체크리스트 생성 API

`POST /api/jd/analyze/`는 `{ id, query?, cnt? }`를 받아 해당 JD의 체크리스트 생성을 시작합니다. `checklist_status`는 `onqueue → processing → done` 또는 `fail`로 바뀌며, Celery worker가 없으면 동기로 실행합니다. 기존 개수를 고려해 `backend/common/checklist_graph.py`의 목표 개수까지만 저장합니다.

근거: `backend/api/views/job_description_endpoints.py`, `backend/api/tasks.py`, `backend/common/checklist_graph.py`

## 실패와 예외

- resume id 누락: 400
- 인증 실패: 400 응답 안에 403 메시지
- 이력서 없음: 400
- LLM/OpenAI/Pinecone 오류: 상위 try/except에서 500 메시지로 반환

## 관련 문서

- [모델 파이프라인](../07-ai-modeling/model-pipeline.md)
- [지원서 분석 기능](../08-features/resume-analysis.md)
