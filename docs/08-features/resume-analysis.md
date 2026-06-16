# 지원서 분석

## 지원서 입력 화면

화면: `/cover-letter`

파일:

- `frontend/src/pages/CoverLetterPage.tsx`
- `frontend/src/components/cover-letter/CoverLetterInputPanel.tsx`
- `frontend/src/components/cover-letter/CoverLetterUploadPanel.tsx`

역할:

- JD 선택
- 지원자명과 자기소개 문항/답변 확인
- 지원서 추가·수정·삭제 (`addResume`, `saveResume`, `deleteResume`)
- 분석 요청
- 분석 완료 후 `/chat` 이동 버튼 표시

## 분석 요청

프론트:

- `apiClient.requestJobAnalysis(jdId)`
- `apiClient.requestCoverLetterAnalysis(jdId)`

두 함수 모두 선택 JD에 연결된 첫 번째 resume를 찾아 `/api/resume/analize/`를 호출합니다. 근거: `frontend/src/api/backendClient.ts`

백엔드:

- `resume_analize` in `backend/api/views.py`
- `_get_analysis_inputs()`
- `report_service.invoke()`
- `_save_analysis_result()`

## 분석 결과 조회 화면

화면: `/analysis-report` (nav: 리포트 / 질문 추천)

파일:

- `frontend/src/pages/AnalysisReportPage.tsx`
- `frontend/src/hooks/useAnalysisReportPageData.ts`

역할:

- 저장된 `AnalysisReport`와 연결 resume·JD·면접 질문을 목록으로 표시
- `?resumeId=` 쿼리로 선택 항목 유지 (`useSearchParams`)
- 리포트 탭 내용과 추천 질문 패널 표시

## 분석 결과 데이터

저장 모델:

- `AnalysisReport`
- `InterviewQuestion`
- `Resume.status = done`

프론트 표시:

- `mapAnalysisReport()`가 리포트 탭을 생성합니다.
- `mapTemplateQuestions()`가 면접 질문을 문항/가이드로 변환합니다.

근거: `frontend/src/api/adapters.ts`

## 자기소개서 포맷 작성 (후순위 MVP)

화면: `/cover-letter-template` (nav 숨김, `mvpStatus: 'planned'`)

파일:

- `frontend/src/pages/CoverLetterTemplatePage.tsx`

역할:

- 선택된 JD 요약 표시
- 생성된 면접 질문을 문항과 작성 가이드처럼 표시
- 문항 생성과 문서 다운로드 버튼 제공

현재 `generateCoverLetterTemplate()`와 `downloadTemplateDocument()`는 backend API가 없어 `unsupportedBackendFeature()` 오류를 던집니다. 근거: `frontend/src/api/backendClient.ts`

## 관련 문서

- [분석 파이프라인](../04-backend/analysis-pipeline.md)
- [모델 파이프라인](../07-ai-modeling/model-pipeline.md)
