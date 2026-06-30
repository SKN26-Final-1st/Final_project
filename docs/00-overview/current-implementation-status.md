# 현재 구현 범위

이 페이지는 실제 코드 기준으로 구현 완료, UI 보존·백엔드 미연동, 검증 필요 영역을 분리합니다.

## 구현되어 있는 영역

- Django 모델과 CRUD성 API: `backend/api/models.py`, `backend/api/views/`, `backend/api/urls.py`
- 세션 기반 인증과 일부 API 키 기반 접근: `backend/api/views/account_endpoints.py` 등 도메인별 endpoint 모듈
- JD별 체크리스트 CRUD: `Checklist` 모델, `backend/api/views/checklist_endpoints.py`
- JD 기반 AI 체크리스트 생성: `jd_analyze` in `backend/api/views/job_description_endpoints.py`, `backend/common/checklist.py`
- 지원서 분석 저장 흐름: `resume_analyze` in `backend/api/views/resume_endpoints.py`, `analyze_and_save_report`/`enqueue_report_analyze` in `backend/api/tasks.py`
- OpenAI 리포트/면접질문 생성 파이프라인(운영): `backend/common/report.py` — API는 이 모듈만 사용
- 리포트/채팅 평가 노트북: `backend/common/eval/*.ipynb`, `backend/common/eval/goldset_mock_data_fixed.csv`
- LangGraph 기반 채팅 의도 분류와 응답 병합: `backend/common/chat_graph.py`, `backend/common/chat_agent.py`
- React 화면, 라우팅, 전역 알림/로딩: `frontend/src/App.tsx`
- 페이지별 데이터·mutation 훅: `frontend/src/hooks/` (`useJdPageData`, `useCoverLetterPageData`, `useAnalysisReportPageData`, `useChatPageData`, `useAdminPageData`, `useDocumentChatState`, `hooks/mutations/*`)
- 지원서 선택·삭제 UI: `CoverLetterUploadPanel`, `CoverLetterDeleteModal`, `useCoverLetterPageData`의 `selectedResumeId`
- 뷰포트 고정 레이아웃(`viewport-page`): 주요 보호 화면 8개, `verify-viewport-layout.mjs`로 QA
- 전역 알림 토스트: `frontend/src/components/common/FloatingAlert.tsx`
- 인증 페이지 분리: `frontend/src/pages/auth/`, barrel `frontend/src/pages/AuthPages.tsx`
- 데스크톱 사이드바 핀 고정: `frontend/src/components/layout/SidebarNav.tsx`
- 프론트 Django API 클라이언트(CSRF, credentials, 명시 `apiKey` 시 `X-API-Key`): `frontend/src/api/httpClient.ts`, `frontend/src/api/backendClient.ts`
- 문서 채팅 참조 데이터 조합: `frontend/src/components/chat/chatContextData.tsx`
- 대시보드 데이터 조합과 화면 어댑터: `frontend/src/api/appDataService.ts`, `frontend/src/api/adapters.ts`
- Vite dev server `/api` 프록시: `frontend/vite.config.ts` → `http://127.0.0.1:8000`
- 공유 리포트 화면(API 키 + resume id): `frontend/src/pages/SharedReportPage.tsx`
- 관리자 AuthKey CRUD: `frontend/src/pages/AdminPage.tsx` → `/api/authkey/*`
- S3/SSM 기반 EC2 배포 워크플로: `.github/workflows/deploy.yml`, `.deploy/frontend.conf`, `.deploy/backend.conf`, `.deploy/gunicorn.service`, `.deploy/celery.service`
- 프론트 Vitest 단위·통합 테스트: `frontend/src/**/*.test.{ts,tsx}`, MSW 설정 `frontend/src/test/`
- 프론트 Playwright E2E·접근성: `frontend/tests/e2e/auth-accessibility.spec.ts`
- API 응답 Zod 검증: `frontend/src/api/backendSchemas.ts` → `backendClient.ts`

## UI 보존·백엔드 미연동 영역

- 후순위 MVP 라우트(`/recruitment-post`, `/cover-letter-template`)는 nav에서 숨기고 직접 접근 시 안내를 표시합니다. 근거: `frontend/src/data/appConfig.tsx`의 `mvpStatus: 'planned'`, `visibleInNav: false`
- 모집 공고 생성/PDF, 자기소개서 포맷 생성/다운로드는 `apiClient`가 `unsupportedBackendFeature()`로 명시적 오류를 던집니다. 근거: `frontend/src/api/backendClient.ts`
- 관리자 화면의 LLM 포인트, 면접방, 비밀번호 정책, LLM 사용 로그 일부는 `AdminData`와 화면 내부 계산을 사용합니다. AuthKey CRUD만 실제 API와 연결됩니다. 근거: `frontend/src/api/adapters.ts`, `frontend/src/pages/AdminPage.tsx`
- 모집 공고 미리보기는 `buildRecruitmentPreview()`가 회사/JD 필드로 프론트에서 조합합니다. 근거: `frontend/src/api/backendClient.ts`

## 주의할 실제 이름

- 비밀번호 질문 라우트는 코드상 `passqestion/`입니다. 근거: `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- 지원서 분석 라우트는 `resume/analyze/`입니다. 프론트 `backendClient.ts`도 이 경로를 호출합니다. 근거: `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- 면접 질문은 `AnalysisReport.interview_question` JSON 필드에 저장됩니다. `question/get`, `question/modify` 엔드포인트는 제거되었고, 프론트는 `getReportQuestions()`로 리포트 응답에서 질문 배열을 만듭니다. 근거: `backend/api/models.py`, `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- Resume 모델 필드는 코드상 `self_intoduction`입니다. 근거: `backend/api/models.py`, `frontend/src/data/backendTypes.ts`
- 크롤러 출력 파일명은 코드상 `qualification_requiremnets.csv`입니다. 근거: `database/crawling/*_scraper.py`

## 검증 필요

- 실제 OpenAI/Pinecone 환경 변수와 인덱스 스키마는 로컬 `.env` 또는 운영 환경에 의존합니다.
- `report/get` 백엔드 응답은 리스트를 반환하지만 프론트 `getReportsForResume()`는 빈 배열 fallback을 사용합니다. 근거: `backend/api/views/analysis_report_endpoints.py`, `frontend/src/api/backendClient.ts`
- Django 테스트 파일은 현재 별도 테스트 모듈로 보이지 않습니다. 배포 워크플로는 서버에서 `python manage.py check`, `migrate`, `collectstatic`을 실행하지만 `python manage.py test`는 실행하지 않습니다. 근거: `.github/workflows/deploy.yml`
- `frontend/.env.example`의 `VITE_USE_MOCK_API`는 현재 `backendClient.ts`에서 참조하지 않습니다. mock API 모드는 제거된 상태입니다.

## 관련 문서

- [프론트엔드 API 연동 README](../../frontend/README.md) — 연동 범위와 검증 스크립트 상세
- [프론트 API ID 매핑](../06-api/frontend-api-id-map.md)
- [실행과 운영](../01-getting-started/run-and-operations.md)
