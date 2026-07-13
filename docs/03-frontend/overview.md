# 프론트엔드 개요

## 기술 스택

근거: `frontend/package.json`, `frontend/package-lock.json`

- React 19
- TypeScript 5
- Vite 7
- Ant Design 6
- Ant Design X
- TanStack Query 5
- Axios
- ECharts
- React Router 7
- Zod 4 (API 응답 런타임 검증)

개발·검증 도구:

- Vitest, Testing Library, MSW (단위·통합 테스트)
- Playwright, axe-core (E2E·접근성 테스트)

## 앱 진입점

- `frontend/src/main.tsx`: React root 생성, `AppQueryProvider`, `BrowserRouter`, `App` 연결
- `frontend/src/providers/AppQueryProvider.tsx`: TanStack Query `QueryClientProvider`
- `frontend/src/api/queryClient.ts`: query 기본 옵션 설정
- `frontend/src/App.tsx`: 라우트별 페이지 렌더링, 테마, 전역 알림·로딩, 인증 가드, `DocumentChatProvider` 래핑
- `frontend/src/hooks/`: 페이지별 데이터 slice·로컬 UI 상태, mutation 훅 (`mutations/`)

## 테마와 UI 시스템

`App.tsx`는 Ant Design `XProvider`와 `AntApp`을 사용하고, light/dark 모드를 Ant Design token과 CSS `data-theme`로 반영합니다.

공통 스타일 진입점은 `frontend/src/styles/index.css`이며, 역할별 CSS를 정해진 cascade 순서로 불러옵니다. 주요 영역:

- 앱 쉘과 사이드바
- 모바일 헤더/드로어
- 대시보드 히어로와 카드
- 관리자 화면
- JD/지원서/공고 테이블
- 문서 검색 FAB와 채팅 위젯
- 인증 화면
- 반응형 미디어쿼리와 reduced motion 처리

## 컴포넌트 구조

프론트엔드 컴포넌트는 `frontend/src/components/` 아래에서 역할별 폴더로 나뉩니다. 컴포넌트 사용 기준과 디자인 QA는 [디자인 시스템](design-system.md)을 기준으로 삼습니다.

| 폴더 | 역할 |
| --- | --- |
| `layout/` | `AppShell`, `SidebarNav`, `MobileShellHeader`, `AuthScreen`, 계정/크레딧 UI처럼 화면 뼈대를 구성합니다. `TopHeader`는 코드에 존재하지만 현재 `AppShell`에서 직접 사용하지 않습니다. |
| `common/` | `PageTitle`, `SectionCard`, `PageState`, `InlineLoading`, `MetricCard`, `FloatingAlert`, `SearchSuggestions`처럼 화면 전반에서 재사용되는 UI를 둡니다. |
| `dashboard/` | 대시보드 hero, 지표, 지원자 표, 분석 요약, 작업 목록을 구성합니다. |
| `charts/` | ECharts 래퍼, 도넛 차트 option 생성, light/dark 차트 테마를 관리합니다. |
| `chat/` | 전체 채팅 화면, 문서 검색 FAB, 추천 자료/빠른 질문 패널, 채팅 컨텍스트 데이터를 관리합니다. |
| `admin/`, `company/`, `jd/`, `cover-letter/`, `mypage/`, `recruitment/` | 각 도메인 화면의 폼, 목록, 삭제 모달, 요약 패널처럼 업무 맥락이 강한 컴포넌트를 둡니다. |

새 컴포넌트는 먼저 `common/`으로 올릴 만큼 재사용성이 있는지 확인하고, 특정 업무 흐름에 묶여 있으면 도메인 폴더에 둡니다. 같은 UI가 2개 이상 화면에서 반복되거나 접근성/상태 처리가 복잡하면 공통 컴포넌트 후보로 검토합니다.

## 데이터 소스

프론트는 Django API를 직접 호출합니다. mock API 모드는 제거되었습니다.

- API 클라이언트: `frontend/src/api/backendClient.ts` — Django API 메서드, `httpClient.ts` — Axios/CSRF
- 응답 검증: `frontend/src/api/backendSchemas.ts` — Zod 스키마와 `parse*` 헬퍼
- 타입 정의: `frontend/src/data/backendTypes.ts` — Django `to_dict()` 응답 shape
- 라우트/메뉴/팔레트: `frontend/src/data/appConfig.tsx`
- 화면 표시 모델 변환: `frontend/src/api/adapters.ts`
- 전체 앱 데이터 조립: `frontend/src/api/appDataService.ts`
- dev server 프록시: `frontend/vite.config.ts` — `/api` → `http://127.0.0.1:8000`

로컬 개발 시 백엔드를 `127.0.0.1:8000`에서 실행해야 프론트가 데이터를 불러올 수 있습니다.

## 관련 문서

- [상태와 API 어댑터](state-and-api-adapters.md)
- [페이지와 라우트](pages-and-routes.md)
- [디자인 시스템](design-system.md)
- [프론트엔드 운영·검증 가이드](../../frontend/README.md)
