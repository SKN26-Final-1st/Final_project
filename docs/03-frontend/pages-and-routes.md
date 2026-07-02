# 페이지와 라우트

라우트 타입과 메뉴 정의는 `frontend/src/data/appConfig.tsx`, 실제 라우트 목록은 `frontend/src/utils/routes.ts`, 렌더링 분기는 `frontend/src/App.tsx`에 있습니다.

## 라우트 목록

| 라우트 | 페이지 파일 | nav 표시 | 역할 |
| --- | --- | --- | --- |
| `/dashboard` | `frontend/src/pages/DashboardPage.tsx` | O | 채용/JD/지원자/분석 현황 요약 (`useAppDataQuery`로 캐시 직접 조회) |
| `/admin` | `frontend/src/pages/AdminPage.tsx` | O | AuthKey 관리, 운영 지표 표시 |
| `/company` | `frontend/src/pages/CompanyPage.tsx` | O | 회사 프로필과 분석 기준 입력 |
| `/jd` | `frontend/src/pages/JdPage.tsx` | O | JD 목록, JD 상세, 분석 요청 시작 |
| `/cover-letter` | `frontend/src/pages/CoverLetterPage.tsx` | O | 지원서 입력, 업로드, 분석 요청 |
| `/analysis-report` | `frontend/src/pages/AnalysisReportPage.tsx` | O | 저장된 분석 리포트·면접 질문 조회 |
| `/mypage` | `frontend/src/pages/MyPage.tsx` | O | 프로필, 계정, 보안, 회사 요약 |
| `/chat` | `frontend/src/pages/ChatPage.tsx` | FAB | 전체 화면 문서 검색 채팅 |
| `/recruitment-post` | `frontend/src/pages/RecruitmentPostPage.tsx` | X (planned MVP) | 복수 JD 기반 모집 공고 미리보기 |
| `/cover-letter-template` | `frontend/src/pages/CoverLetterTemplatePage.tsx` | X (planned MVP) | JD 기반 문항/가이드 표시 |
| `/shared` | `frontend/src/pages/SharedReportPage.tsx` | X | API 키 기반 공유 리포트 조회 |
| `/login` | `frontend/src/pages/auth/LoginPage.tsx` | X | 로그인 |
| `/signup` | `frontend/src/pages/auth/SignupPage.tsx` | X | 회원가입 |
| `/password-reset` | `frontend/src/pages/auth/PasswordResetPage.tsx` | X | 비밀번호 찾기 |

`/`와 알 수 없는 라우트는 `/dashboard`로 이동합니다. 근거: `frontend/src/App.tsx`

후순위 MVP 라우트는 `appConfig.tsx`에서 `mvpStatus: 'planned'`, `visibleInNav: false`로 nav에서 숨깁니다. `activeMainMenu`는 이 항목을 제외합니다.

## 뷰포트 고정 레이아웃

`/dashboard`부터 `/mypage`까지 주요 보호 화면(인증 라우트·`/shared` 제외)은 루트에 `viewport-page` 클래스를 사용해 셸 높이 안에서 내부 스크롤만 허용합니다. CSS 규칙과 QA 스크립트는 [디자인 시스템](design-system.md)을 참고하세요.

## 인증 라우트

`/login`, `/signup`, `/password-reset`은 `authRoutes`로 분리되어 `AppShell` 없이 `AuthScreen`을 사용합니다. 각 페이지 구현은 `frontend/src/pages/auth/`에 있고, `frontend/src/pages/AuthPages.tsx`는 `App.tsx`용 re-export barrel입니다. 근거: `frontend/src/utils/routes.ts`, `frontend/src/components/layout/AuthScreen.tsx`, `frontend/src/pages/AuthPages.tsx`

## 공유 리포트 라우트

`/shared`는 인증 없이 접근합니다. `?resumeId=` 쿼리와 API 키 입력으로 `getSharedResumeBundle()`을 호출합니다. `AppShell`과 FAB 없이 독립 레이아웃을 사용합니다. 근거: `frontend/src/pages/SharedReportPage.tsx`, `frontend/src/App.tsx`

## API Key 제한 모드

`/login`의 API Key 탭에서 키 검증에 성공하면 key를 `sessionStorage`에 저장하고 `authMode: 'apiKey'`로 보호 화면에 진입합니다. 이 모드에서는 `/jd`, `/cover-letter`, `/analysis-report`만 접근할 수 있고 기본 진입점은 `/jd`입니다. `AppShell`은 허용 라우트만 메뉴에 노출하며 전역 문서 검색 FAB는 숨깁니다.

근거: `frontend/src/App.tsx`, `frontend/src/pages/auth/LoginPage.tsx`, `frontend/src/utils/apiKeySession.ts`

## 보호 화면 레이아웃

인증 라우트가 아닌 화면은 `AppShell`로 감싸집니다.

- 데스크톱: `SidebarNav` (브랜드, 메뉴, 핀 고정, 계정 popover)
- 모바일: `MobileShellHeader`와 Drawer 메뉴 (`SidebarNav.tsx`에서 함께 export)
- 전역 문서 검색 FAB: `/chat`이 아닌 화면에 표시
- 계정 popover: 마이페이지, 로그아웃, 크레딧 표시

근거: `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/SidebarNav.tsx`

## 라우트 상태

`App.tsx`가 `useLocation()`과 `getRouteFromPathname()`으로 현재 라우트를 계산합니다. 페이지별 선택 상태·채팅·mutation은 각 화면 훅이 담당합니다. 예: JD 선택은 `useJdPageData`, 리포트 선택은 `useAnalysisReportPageData`(`?reportId=` 우선, `?resumeId=` 레거시 지원), 채팅은 `DocumentChatProvider`. 자세한 표는 [상태와 API 어댑터](state-and-api-adapters.md)를 참고하세요.

## 관련 문서

- [디자인 시스템](design-system.md)
- [채용 운영 워크스페이스](../08-features/recruiting-workspace.md)
- [프론트엔드 API 연동 README](../../frontend/README.md)
