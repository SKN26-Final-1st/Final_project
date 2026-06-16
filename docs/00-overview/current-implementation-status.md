# 현재 구현 범위

이 페이지는 실제 코드 기준으로 구현 완료, UI 보존·백엔드 미연동, 검증 필요 영역을 분리합니다.

## 구현되어 있는 영역

- Django 모델과 CRUD성 API: `backend/api/models.py`, `backend/api/views.py`, `backend/api/urls.py`
- 세션 기반 인증과 일부 API 키 기반 접근: `backend/api/views.py`
- 지원서 분석 저장 흐름: `_get_analysis_inputs`, `_save_analysis_result`, `resume_analize` in `backend/api/views.py`
- OpenAI 리포트/면접질문 생성 파이프라인(운영): `backend/common/report.py` — API는 이 모듈만 사용
- 리포트 프롬프트 실험·평가: `backend/common/report2.py`, `report3.py`, `backend/common/eval/middle_report*_eval.ipynb`
- LangGraph 기반 채팅 의도 분류와 응답 병합: `backend/common/chat_graph.py`, `backend/common/chat_agent.py`
- React 화면, 라우팅, 전역 알림/로딩: `frontend/src/App.tsx`
- 페이지별 데이터·mutation 훅: `frontend/src/hooks/` (`useJdPageData`, `useCoverLetterPageData`, `useAnalysisReportPageData`, `useChatPageData`, `useAdminPageData`, `useDocumentChatState`, `hooks/mutations/*`)
- 전역 알림 토스트: `frontend/src/components/common/FloatingAlert.tsx`
- 인증 페이지 분리: `frontend/src/pages/auth/`, barrel `frontend/src/pages/AuthPages.tsx`
- 데스크톱 사이드바 핀 고정: `frontend/src/components/layout/SidebarNav.tsx`
- 프론트 Django API 클라이언트(CSRF, credentials, `X-API-Key`): `frontend/src/api/backendClient.ts`
- 대시보드 데이터 조합과 화면 어댑터: `frontend/src/api/appDataService.ts`, `frontend/src/api/adapters.ts`
- Vite dev server `/api` 프록시: `frontend/vite.config.ts` → `http://127.0.0.1:8000`
- 공유 리포트 화면(API 키 + resume id): `frontend/src/pages/SharedReportPage.tsx`
- 관리자 AuthKey CRUD: `frontend/src/pages/AdminPage.tsx` → `/api/authkey/*`
- Elastic Beanstalk 배포 워크플로: `.github/workflows/deploy-eb.yml`

## UI 보존·백엔드 미연동 영역

- 후순위 MVP 라우트(`/recruitment-post`, `/cover-letter-template`)는 nav에서 숨기고 직접 접근 시 안내를 표시합니다. 근거: `frontend/src/data/appConfig.tsx`의 `mvpStatus: 'planned'`, `visibleInNav: false`
- 모집 공고 생성/PDF, 자기소개서 포맷 생성/다운로드는 `apiClient`가 `unsupportedBackendFeature()`로 명시적 오류를 던집니다. 근거: `frontend/src/api/backendClient.ts`
- 관리자 화면의 LLM 포인트, 면접방, 비밀번호 정책, LLM 사용 로그 일부는 `AdminData`와 화면 내부 계산을 사용합니다. AuthKey CRUD만 실제 API와 연결됩니다. 근거: `frontend/src/api/adapters.ts`, `frontend/src/pages/AdminPage.tsx`
- 모집 공고 미리보기는 `buildRecruitmentPreview()`가 회사/JD 필드로 프론트에서 조합합니다. 근거: `frontend/src/api/backendClient.ts`

## 주의할 실제 이름

- 비밀번호 질문 라우트는 코드상 `passqestion/`입니다. 근거: `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- 지원서 분석 라우트는 코드상 `resume/analize/`입니다. 근거: `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- Resume 모델 필드는 코드상 `self_intoduction`입니다. 근거: `backend/api/models.py`, `frontend/src/data/backendTypes.ts`
- 크롤러 출력 파일명은 코드상 `qualification_requiremnets.csv`입니다. 근거: `database/crawling/*_scraper.py`

## 검증 필요

- 실제 OpenAI/Pinecone 환경 변수와 인덱스 스키마는 로컬 `.env` 또는 운영 환경에 의존합니다.
- `report/get` 백엔드 응답은 리스트를 반환하지만 프론트 `getReportsForResume()`는 빈 배열 fallback을 사용합니다. 근거: `backend/api/views.py`, `frontend/src/api/backendClient.ts`
- Django 테스트 파일은 현재 별도 테스트 모듈로 보이지 않습니다. CI는 `python manage.py test`를 실행합니다. 근거: `.github/workflows/deploy-eb.yml`
- `frontend/.env.example`의 `VITE_USE_MOCK_API`는 현재 `backendClient.ts`에서 참조하지 않습니다. mock API 모드는 제거된 상태입니다.

## 관련 문서

- [프론트엔드 API 연동 README](../../frontend/README.md) — 연동 범위와 검증 스크립트 상세
- [실행과 운영](../01-getting-started/run-and-operations.md)
