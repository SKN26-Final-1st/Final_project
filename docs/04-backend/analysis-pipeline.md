# 분석 파이프라인

## 지원서 분석 API

백엔드 엔드포인트: `POST /api/resume/analyze/` (`resume_analyze` in `backend/api/views/resume_endpoints.py`)

프론트는 `requestResumeAnalysisById()`에서 `resume/get`으로 대상 지원서를 확인한 뒤 `/api/resume/analyze/`를 호출합니다. 백엔드의 `AnalysisReport` 응답은 프론트에서 `report`와 `questions` 형태로 포장됩니다.

근거:

- `frontend/src/api/backendClient.ts`
- `backend/api/urls.py`
- `backend/api/views/resume_endpoints.py`

## 입력 조회

`_get_analysis_inputs(request, resume_id)`:

1. 세션 사용자인 경우 `Resume`을 `job_description__account=request.user`로 제한합니다.
2. 비로그인 사용자인 경우 `X-API-Key`를 조회합니다.
3. API 키 경로는 `authorized_resume`에 포함된 resume id만 허용합니다.
4. `CompanyInfo`가 없으면 생성합니다.
5. `Resume.status`를 `processing`으로 바꿉니다.
6. `resume.to_dict()`, `company_info.to_dict()`, `job_description.to_dict()`를 반환합니다.

## LLM 분석

`backend/common/report.py`의 `invoke(company_dict, jd_dict, checklist, resume_dict)`가 전체 분석을 수행합니다.

순서:

1. `sum_resume()`: 지원서 요약
2. `sum_company()`: 회사 정보 요약
3. `sum_jd()`: JD 요약
4. `check_resume_fit()`: DB에 저장된 JD 체크리스트를 지원서 요약이 충족하는지 판단
5. `make_interview_questions()`: 면접 질문, 모범 답안, 질문 의도 생성
6. `make_report()`: 최종 분석 리포트 생성

모델명:

- 리포트 파이프라인(운영): `gpt-4o-mini` — `backend/common/report.py`
- 임베딩 노트북: `text-embedding-3-small`

운영 API(`resume_analyze`)는 `report.py`만 사용합니다. 프롬프트 수정 실험용 `report2.py`, `report3.py`와 평가 노트북은 API에 연결되지 않습니다. 근거: `backend/api/views/resume_endpoints.py`, `backend/common/eval/middle_report*_eval.ipynb`

## 구조화 응답

`report.py`는 Pydantic 모델을 응답 스키마로 사용합니다.

- `InterviewQuestionsStructure`
- `FitChecklistStructure`
- `ChecklistCheckStructure`
- `ReportStructure`

OpenAI SDK의 `client.beta.chat.completions.parse`가 있으면 parse를 사용하고, 없으면 JSON object 응답을 받은 뒤 Pydantic으로 검증합니다.

## 결과 저장

`_save_analysis_result(resume_id, analysis_result)`:

1. LLM 결과에서 리포트 필드와 면접 질문 목록을 추출합니다.
2. `AnalysisReport.objects.create()`로 새 리포트를 저장합니다. 면접 질문은 `interview_question` JSON 필드에 넣습니다.
3. `Resume.status`를 `done`으로 변경합니다.
4. 저장된 `AnalysisReport.to_dict()`를 반환합니다.

이전 버전의 `InterviewQuestion` 별도 테이블 upsert/bulk_create 흐름은 제거되었습니다.

근거: `backend/api/views/resume_endpoints.py`, `backend/api/models.py`

## JD 체크리스트 생성 API

`POST /api/jd/analyze/`는 `{ id }`를 받아 해당 JD의 체크리스트를 AI로 보강합니다. 기존 체크리스트 수가 `backend/common/checklist.py`의 `CHECKLIST_COUNT`보다 적으면 부족한 개수만 생성하고, 저장된 전체 체크리스트 목록을 반환합니다.

근거: `backend/api/views/job_description_endpoints.py`, `backend/common/checklist.py`

## 실패와 예외

- resume id 누락: 400
- 인증 실패: 400 응답 안에 403 메시지
- 이력서 없음: 400
- LLM/OpenAI/Pinecone 오류: 상위 try/except에서 500 메시지로 반환

## 관련 문서

- [모델 파이프라인](../07-ai-modeling/model-pipeline.md)
- [지원서 분석 기능](../08-features/resume-analysis.md)
