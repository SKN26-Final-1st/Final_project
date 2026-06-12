# 페이지와 라우트

라우트 타입과 메뉴 정의는 `frontend/src/data/mockData.tsx`, 실제 라우트 목록은 `frontend/src/utils/routes.ts`, 렌더링 분기는 `frontend/src/App.tsx`에 있습니다.

## 라우트 목록

| 라우트 | 페이지 파일 | 역할 |
| --- | --- | --- |
| `/dashboard` | `frontend/src/pages/DashboardPage.tsx` | 채용/JD/지원자/분석 현황 요약 |
| `/admin` | `frontend/src/pages/AdminPage.tsx` | 스타트업 관리자, LLM 포인트, 면접방/비밀번호 정책 목업 |
| `/company` | `frontend/src/pages/CompanyPage.tsx` | 회사 프로필과 분석 기준 입력 |
| `/jd` | `frontend/src/pages/JdPage.tsx` | JD 목록, JD 상세, 분석 요청 시작 |
| `/cover-letter` | `frontend/src/pages/CoverLetterPage.tsx` | 지원서 입력, 업로드 미리보기, 분석 요청 |
| `/chat` | `frontend/src/pages/ChatPage.tsx` | 전체 화면 문서 검색 채팅 |
| `/mypage` | `frontend/src/pages/MyPage.tsx` | 프로필, 계정, 보안, 회사 요약 |
| `/recruitment-post` | `frontend/src/pages/RecruitmentPostPage.tsx` | 복수 JD 기반 모집 공고 미리보기 |
| `/cover-letter-template` | `frontend/src/pages/CoverLetterTemplatePage.tsx` | JD 기반 문항/가이드 표시 |
| `/login` | `frontend/src/pages/AuthPages.tsx` | 로그인 |
| `/signup` | `frontend/src/pages/AuthPages.tsx` | 회원가입 |
| `/password-reset` | `frontend/src/pages/AuthPages.tsx` | 비밀번호 찾기 |

`/`와 알 수 없는 라우트는 `/dashboard`로 이동합니다. 근거: `frontend/src/App.tsx`

## 인증 라우트

`/login`, `/signup`, `/password-reset`은 `authRoutes`로 분리되어 `AppShell` 없이 `AuthScreen`을 사용합니다. 근거: `frontend/src/utils/routes.ts`, `frontend/src/components/layout/AuthScreen.tsx`

## 보호 화면 레이아웃

인증 라우트가 아닌 화면은 `AppShell`로 감싸집니다.

- 데스크톱: `SidebarNav`
- 모바일: `MobileShellHeader`, Drawer 메뉴
- 전역 문서 검색 FAB: `/chat`이 아닌 화면에 표시
- 계정 popover: 마이페이지, 로그아웃, 크레딧 표시

근거: `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/SidebarNav.tsx`

## 라우트 상태

`App.tsx`가 `useLocation()`과 `getRouteFromPathname()`으로 현재 라우트를 계산합니다. 선택 JD, 선택 행, 채팅 입력/메시지, 업로드/분석/생성 완료 여부는 앱 컴포넌트 state로 관리됩니다.

## 관련 문서

- [컴포넌트 구조](components.md)
- [채용 운영 워크스페이스](../08-features/recruiting-workspace.md)
