# 스타일과 QA

## 스타일 파일

전체 스타일은 `frontend/src/styles.css`에 모여 있습니다.

주요 섹션:

- 전역 토큰과 Ant Design override
- 앱 쉘, 사이드바, 모바일 헤더/드로어
- 공통 page title, card, form, table 스타일
- 대시보드 히어로와 metric/summary card
- 관리자 화면 전용 grid, table, usage chart
- JD, 지원서, 모집 공고 화면
- 채팅 창, 문서 검색 FAB, 추천 패널
- 인증 화면
- dark theme override
- 반응형 breakpoint: 1399px, 1199px, 991px, 767px, 420px
- `prefers-reduced-motion`

## 테마

`frontend/src/App.tsx`에서 Ant Design token을 설정하고, `styles.css`는 `.app-root[data-theme="dark"]`로 dark mode를 보완합니다.

브랜드 색상은 `frontend/src/data/appConfig.tsx`의 `palette`를 Ant Design token과 함께 사용합니다.

## 반응형 규칙

- 데스크톱은 접히는 사이드바와 pin 상태를 지원합니다. 근거: `frontend/src/components/layout/SidebarNav.tsx`, `frontend/src/styles.css`
- 991px 이하에서는 데스크톱 사이드바를 숨기고 모바일 헤더와 Drawer를 사용합니다.
- 데이터 테이블은 데스크톱 Table과 모바일 카드 리스트를 병행합니다. 근거: `ApplicantReviewTable`, `CoverLetterUploadPanel`, `JdSelectionPanel`

## 뷰포트 고정 레이아웃

주요 보호 화면은 루트에 `viewport-page` 클래스를 붙여 셸 높이(`100dvh`) 안에서 스크롤을 내부 영역으로 제한합니다. 근거: `frontend/src/styles.css`, 각 `frontend/src/pages/*Page.tsx`

적용 페이지:

- `/dashboard`, `/admin`, `/company`, `/jd`, `/cover-letter`, `/analysis-report`, `/chat`, `/mypage`

주요 CSS 패턴:

- `.content:has(.viewport-page) .content-frame` — 페이지를 flex column으로 고정
- `.viewport-page > .split-editor-layout-row`, `.chat-page-layout-row` — 2열 편집·채팅 레이아웃이 남은 높이를 채움
- `.viewport-column-scroll`, `.scroll-card-body` — 카드 본문 내부 스크롤
- `.dashboard-body-scroll` — 대시보드 본문만 세로 스크롤

`verify-viewport-layout.mjs`는 위 8개 라우트를 1366×768, 1440×900, 1920×1080과 모바일(390×844, `/dashboard`)에서 검사합니다. 카드·내부 스크롤 컬럼 클리핑, `/dashboard` 가로 오버플로, `/chat` 입력창 가시성을 확인합니다.

## QA 스크립트

`frontend/scripts/`에 검증 스크립트가 있습니다. 상세는 [실행과 운영](../01-getting-started/run-and-operations.md)과 [프론트엔드 API 연동 README](../../frontend/README.md)를 참고하세요.

주요 스크립트:

- `verify-backend-contract.mjs` — backend API 계약 정적 검증
- `verify-live-django-api.mjs` — Django runserver 기반 API 시나리오 검증
- `verify-document-chat-widget.mjs` — 문서 검색 위젯 시각/동작 QA
- `verify-auth-flow.mjs`, `verify-auth-text-links.mjs` — 인증 UI 흐름·텍스트 링크 QA
- `verify-admin-layout.mjs`, `verify-admin-authkey-panel.mjs` — 관리자 화면 QA
- `verify-jd-create-flow.mjs`, `verify-cover-letter-save-flow.mjs`, `verify-cover-letter-selection-flow.mjs` — JD·자소서 저장·선택 UI QA
- `verify-viewport-layout.mjs` — 뷰포트 기반 페이지 레이아웃 QA
- `verify-shared-route.mjs` — `/shared` 공유 리포트 라우트 검증
- `verify-state-management-refactor.mjs` — `App.tsx`와 페이지 훅 분리 정적 검증
- `verify-analysis-report-page.mjs` — 분석 리포트 화면 QA
- `verify-chat-context-real-data.mjs` — 채팅 컨텍스트 실데이터 연결 검증
- `verify-qa-stability-fixes.mjs` — UI 안정성 회귀 검증

`verify-*.mjs` 스크립트는 npm script로 등록되어 있지 않으므로 `node scripts/<name>.mjs`로 실행합니다.

## 단위·통합 테스트 (Vitest)

`frontend/vite.config.ts`의 `test` 블록과 `frontend/src/test/setup.ts`가 Vitest 환경을 설정합니다.

- 테스트 러너: Vitest 4, jsdom 환경
- DOM 검증: Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
- API 모킹: MSW (`frontend/src/test/server.ts`)
- 대상: `src/**/*.test.{ts,tsx}` (`tests/e2e/**`는 제외)

현재 테스트 파일:

| 파일 | 역할 |
| --- | --- |
| `frontend/src/api/backendSchemas.test.ts` | Zod 스키마 파싱 검증 |
| `frontend/src/api/httpClient.test.ts` | 세션 요청에 `VITE_API_KEY` 미부착, 명시 `apiKey` 옵션만 `X-API-Key` 전달 |
| `frontend/src/components/admin/AuthKeyList.test.tsx` | AuthKey 목록 렌더링 |
| `frontend/src/components/admin/AuthKeyDeleteModal.test.tsx` | AuthKey 삭제 모달 |
| `frontend/src/hooks/useApiAction.test.tsx` | 동일 `loadingKey` 중복 액션 차단 |
| `frontend/src/hooks/useDocumentChatState.test.tsx` | 문서 채팅 상태 훅 |
| `frontend/src/pages/auth/SignupPage.test.tsx` | 회원가입 폼 검증 |

```bash
cd frontend
npm run test              # vitest run
npm run test:watch        # vitest watch
npm run test:coverage     # vitest run --coverage
```

## E2E·접근성 테스트 (Playwright)

`frontend/playwright.config.ts`와 `frontend/tests/e2e/`가 Playwright E2E를 담당합니다.

- `auth-accessibility.spec.ts`: Vite dev server를 띄운 뒤 `/login` 화면에 axe-core로 critical 접근성 위반을 검사합니다.
- 기본 포트: `E2E_PORT` 환경 변수, 미설정 시 `5181`
- Chrome/Edge 실행 파일은 Windows 경로 후보에서 자동 탐색합니다. 실패 시 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`을 지정합니다.

```bash
cd frontend
npm run test:e2e
```

`verify-document-chat-widget.mjs`는 Playwright Core를 직접 사용하는 별도 QA 스크립트입니다. `npm run test:e2e`와는 다른 실행 경로입니다.

## 빌드와 lint

`frontend/package.json`:

- `npm run dev`: Vite dev server (`--host 127.0.0.1`)
- `npm run build`: `tsc --noEmit && vite build`
- `npm run lint`: ESLint
- `npm run preview`: Vite preview
- `npm run analyze`: 번들 시각화 리포트 (`dist/bundle-report.html`)

## 관련 문서

- [디자인 시스템](design-system.md)
- [실행과 운영](../01-getting-started/run-and-operations.md)
