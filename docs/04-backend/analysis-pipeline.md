# 분석 파이프라인

## 지원서 분석 API

프론트는 `apiClient.requestJobAnalysis()` 또는 `apiClient.requestCoverLetterAnalysis()`에서 `/api/resume/analize/`를 호출합니다. 라우트명은 코드상 `analize`입니다.

근거:

- `frontend/src/api/backendClient.ts`
- `backend/api/urls.py`
- `backend/api/views.py`

## 입력 조회

`_get_analysis_inputs(request, resume_id)`:

1. 세션 사용자인 경우 `Resume`을 `job_description__account=request.user`로 제한합니다.
2. 비로그인 사용자인 경우 `X-API-Key`를 조회합니다.
3. API 키 경로는 `authorized_resume`에 포함된 resume id만 허용합니다.
4. `CompanyInfo`가 없으면 생성합니다.
5. `Resume.status`를 `processing`으로 바꿉니다.
6. `resume.to_dict()`, `company_info.to_dict()`, `job_description.to_dict()`를 반환합니다.

## LLM 분석

`backend/common/report.py`의 `invoke(resume_dict, company_dict, jd_dict)`가 전체 분석을 수행합니다.

순서:

1. `sum_resume()`: 지원서 요약
2. `sum_company()`: 회사 정보 요약
3. `sum_jd()`: JD 요약
4. `make_fit_checklist()`: 회사/JD/기본 DB 데이터를 기준으로 체크리스트 생성
5. `check_resume_fit()`: 지원서 요약이 체크리스트를 충족하는지 판단
6. `make_interview_questions()`: 면접 질문, 모범 답안, 질문 의도 생성
7. `make_report()`: 최종 분석 리포트 생성

모델명:

- 리포트 파이프라인: `gpt-4.1-mini`
- 임베딩 노트북: `text-embedding-3-small`

## 구조화 응답

`report.py`는 Pydantic 모델을 응답 스키마로 사용합니다.

- `InterviewQuestionsStructure`
- `FitChecklistStructure`
- `ChecklistCheckStructure`
- `ReportStructure`

OpenAI SDK의 `client.beta.chat.completions.parse`가 있으면 parse를 사용하고, 없으면 JSON object 응답을 받은 뒤 Pydantic으로 검증합니다.

## 결과 저장

`_save_analysis_result(resume_id, analysis_result)`:

1. `AnalysisReport.objects.update_or_create()`로 리포트를 upsert합니다.
2. 기존 `InterviewQuestion`을 모두 삭제합니다.
3. 새 질문을 `bulk_create()`합니다.
4. `Resume.status`를 `done`으로 변경합니다.
5. 저장된 report/questions dict를 반환합니다.

근거: `backend/api/views.py`

## 실패와 예외

- resume id 누락: 400
- 인증 실패: 400 응답 안에 403 메시지
- 이력서 없음: 400
- LLM/OpenAI/Pinecone 오류: 상위 try/except에서 500 메시지로 반환

## 관련 문서

- [모델 파이프라인](../07-ai-modeling/model-pipeline.md)
- [지원서 분석 기능](../08-features/resume-analysis.md)
