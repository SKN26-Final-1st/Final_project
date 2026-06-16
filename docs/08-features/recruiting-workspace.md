# 채용 운영 워크스페이스

## 대시보드

화면: `/dashboard`

파일:

- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/dashboard/DashboardHero.tsx`
- `frontend/src/components/dashboard/DashboardMetrics.tsx`
- `frontend/src/components/dashboard/ApplicantReviewTable.tsx`
- `frontend/src/components/dashboard/AnalysisSummaryPanel.tsx`
- `frontend/src/components/dashboard/TaskListPanel.tsx`

역할:

- 진행 중 JD, 등록 지원서, 분석 리포트, 크레딧 지표 표시
- 지원자 검토 목록 표시
- 평균 등급 점수 도넛 차트 표시
- 오늘의 작업 표시
- JD 생성, 새로고침, 지원서 분석 화면 이동

데이터 원천:

- `mapDashboard()` in `frontend/src/api/adapters.ts`

## 회사 정보

화면: `/company`

파일:

- `frontend/src/pages/CompanyPage.tsx`
- `frontend/src/components/company/CompanyProfileForm.tsx`
- `frontend/src/components/company/CompanyCompletionPanel.tsx`

역할:

- 회사명, 직원 수, 회사 소개, 팀 구성, 선호 인재상 표시
- 입력 완성도 계산 결과 표시
- 저장 버튼은 `apiClient.saveCompanyProfile()` 호출

실제 백엔드:

- `/api/compinfo/get/`
- `/api/compinfo/modify/`

## JD 관리

화면: `/jd`

파일:

- `frontend/src/pages/JdPage.tsx`
- `frontend/src/hooks/useJdPageData.ts`, `frontend/src/hooks/mutations/useJdMutations.ts`
- `frontend/src/components/jd/JdListPanel.tsx`
- `frontend/src/components/jd/JdEditorPanel.tsx`
- `frontend/src/components/jd/JdDeleteModal.tsx`
- `frontend/src/components/jd/JdListEmptyState.tsx`

역할:

- JD 목록 선택·생성·수정·삭제 (`useJdMutations`)
- JD 상세 표시
- 분석 요청 버튼으로 지원서 분석 흐름 시작
- 모집 공고 작성 화면으로 이동

실제 백엔드:

- `/api/jd/add/`
- `/api/jd/get/`
- `/api/jd/modify/`

## 모집 공고 작성

화면: `/recruitment-post`

파일:

- `frontend/src/pages/RecruitmentPostPage.tsx`
- `frontend/src/components/recruitment/JdSelectionPanel.tsx`
- `frontend/src/components/recruitment/SelectedJdSummary.tsx`
- `frontend/src/components/recruitment/RecruitmentPreviewPanel.tsx`

현재 동작:

- 복수 JD 선택
- 선택 요약 표시
- 공고 미리보기 표시 (`buildRecruitmentPreview()`가 회사/JD 필드로 프론트 조합)
- `apiClient.generateRecruitmentPost()`와 `downloadRecruitmentPdf()`는 backend API가 없어 `unsupportedBackendFeature()` 오류를 던집니다.

nav에서는 숨겨져 있으며(`visibleInNav: false`), 직접 접근 시 후순위 MVP 안내를 표시합니다. 근거: `frontend/src/data/appConfig.tsx`

## 관련 문서

- [지원서 분석](resume-analysis.md)
- [상태와 API 어댑터](../03-frontend/state-and-api-adapters.md)
