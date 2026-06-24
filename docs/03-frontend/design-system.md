# 디자인 시스템

HumouR 프론트엔드 디자인 시스템은 채용 운영 화면을 일관되게 만들기 위한 기준입니다. 새 화면과 컴포넌트를 만들 때 색상, 간격, 상태, 반응형, 접근성, 문구를 같은 방식으로 판단할 수 있도록 정의합니다.

실제 구현 기준은 `frontend/src/styles.css`, Ant Design 테마 설정은 `frontend/src/App.tsx`, 브랜드 팔레트는 `frontend/src/data/appConfig.tsx`, 차트 기준은 `frontend/src/components/charts/`에 있습니다.

## 1. 디자인 토큰

디자인 토큰은 색상, 간격, 반경, 그림자, 레이아웃 폭, 화면별 글자 크기를 관리하는 가장 작은 단위입니다. 새 UI를 만들 때는 임의의 hex/px 값을 추가하기보다 기존 토큰을 먼저 사용합니다.

### 색상 토큰

| 토큰 | Light | Dark | 용도 |
| --- | --- | --- | --- |
| `--primary` | `#2f73f6` | `#6ea3ff` | 주요 액션, 활성 메뉴, 핵심 인터랙션 |
| `--primary-strong` | `#1e56d8` | `#8fb7ff` | primary hover, 강조 상태 |
| `--primary-soft` | `#e9f1ff` | `rgba(110, 163, 255, 0.16)` | 선택 배경, focus/hover 배경 |
| `--accent` | `#14b8a6` | `#43d9c6` | 보조 강조, 성공/AI 보조 지표 |
| `--accent-soft` | `#e6fbf7` | `rgba(67, 217, 198, 0.13)` | accent 계열 배경 |
| `--warning` | `#f59e0b` | `#fbbf24` | 대기, 주의 상태 |
| `--danger` | `#ef4444` | `#ef4444` | 삭제, 실패, 위험 상태 |
| `--dark` | `#183872` | `#0d1b35` | 어두운 브랜드 보조색 |
| `--bg` | `#f4f7ff` | `#0f172a` | 앱 전체 배경 |
| `--surface` | `#ffffff` | `rgba(22, 34, 58, 0.92)` | 기본 카드, 패널 배경 |
| `--surface-raised` | `rgba(255, 255, 255, 0.92)` | `rgba(30, 43, 70, 0.92)` | 떠 있는 사이드바, 팝오버, 채팅 위젯 |
| `--surface-soft` | `#f7faff` | `rgba(255, 255, 255, 0.06)` | 카드 헤더, 보조 패널, 약한 배경 |
| `--text` | `#102033` | `#f8fbff` | 제목, 본문 텍스트 |
| `--muted` | `rgba(16, 32, 51, 0.64)` | `rgba(248, 251, 255, 0.68)` | 설명, 보조 텍스트 |
| `--subtle` | `rgba(16, 32, 51, 0.42)` | `rgba(248, 251, 255, 0.42)` | 라벨, 힌트, 약한 텍스트 |
| `--border` | `rgba(47, 115, 246, 0.14)` | `rgba(255, 255, 255, 0.12)` | 기본 경계선 |
| `--border-strong` | `rgba(47, 115, 246, 0.28)` | `rgba(110, 163, 255, 0.34)` | hover/focus 경계선 |

### 그림자와 반경 토큰

| 토큰 | 기본값 | 용도 |
| --- | --- | --- |
| `--shadow-sm` | `0 8px 22px rgba(31, 77, 161, 0.08)` | 입력창, 작은 카드 |
| `--shadow-md` | `0 14px 34px rgba(31, 77, 161, 0.1)` | 보조 패널, 위젯 |
| `--shadow` | `0 18px 50px rgba(31, 77, 161, 0.12)` | 주요 카드, 사이드바 |
| `--shadow-lg` | `0 26px 70px rgba(31, 77, 161, 0.18)` | 팝오버, floating widget |
| `--radius-sm` | `10px` | 작은 아이콘, 내부 요소 |
| `--radius` | `16px` | 기본 카드, 입력 컨테이너 |
| `--radius-lg` | `22px` | 큰 패널, page title, sidebar |

Dark theme에서는 `--shadow-sm`을 제거하고, 나머지 shadow는 더 어두운 그림자 값으로 대체합니다.

### 간격과 레이아웃 토큰

| 토큰 | 기본값 | 용도 |
| --- | --- | --- |
| `--layout-gap` | `24px` | 페이지 그리드 기본 간격 |
| `--section-inner-gap` | `12px` | 섹션 내부 표준 간격 |
| `--section-tight-gap` | `8px` | 좁은 섹션 내부 간격 |
| `--content-max` | `1540px` | 보호 화면 최대 콘텐츠 너비 |
| `--shell-content-pad` | `var(--layout-gap)` | 앱 shell 콘텐츠 여백 |
| `--sidebar-card-gap` | `var(--layout-gap)` | 사이드바 내부 카드 간격 |
| `--sidebar-width` | `292px` | 펼친 사이드바 너비 |
| `--sidebar-collapsed-width` | `84px` | 접힌 사이드바 너비 |
| `--sidebar-current-width` | 상태별 변경 | 현재 사이드바 상태에 따른 너비 |

반응형 기준에 따라 `--layout-gap`, `--section-inner-gap`, `--section-tight-gap`, `--shell-content-pad`, `--radius`, `--radius-lg`는 화면 폭별로 줄어듭니다.

### 도메인별 크기 토큰

특정 화면의 밀도와 반응형 조정을 위해 일부 도메인 전용 토큰을 사용합니다. 새 화면에서 그대로 복사하기보다 공통화가 필요한지 먼저 판단합니다.

| 토큰 계열 | 토큰 |
| --- | --- |
| 대시보드 hero | `--dashboard-hero-title-size`, `--dashboard-hero-copy-size`, `--dashboard-hero-stat-label-size`, `--dashboard-hero-stat-value-size` |
| 대시보드 요약 | `--dashboard-summary-title-size`, `--dashboard-summary-meta-size`, `--dashboard-summary-progress-size` |
| 대시보드 지표/섹션 | `--dashboard-metric-title-size`, `--dashboard-metric-value-size`, `--dashboard-metric-change-size`, `--dashboard-section-title-size` |
| 대시보드 목록 | `--dashboard-table-text-size`, `--dashboard-insight-title-size`, `--dashboard-insight-desc-size`, `--dashboard-task-text-size` |
| 모집 공고 | `--recruitment-card-title-size`, `--recruitment-table-text-size`, `--recruitment-tag-size`, `--recruitment-preview-title-size`, `--recruitment-preview-text-size` |

### 토큰 사용 원칙

- Primary는 주요 실행과 활성 상태에만 사용합니다.
- Accent는 보조 강조, AI/성공 계열 정보에 사용합니다.
- Warning/Danger는 상태 의미가 있을 때만 사용합니다.
- Light/Dark theme에서 같은 토큰은 같은 의미를 유지합니다.
- CSS token, Ant Design token, 차트 색상이 서로 어긋나지 않게 관리합니다.
- 도메인별 크기 토큰이 여러 화면에서 반복되면 공통 typography token으로 승격을 검토합니다.

## 2. 기초 요소

기초 요소는 화면 전반의 시각적 기준입니다. HumouR는 반복 사용되는 B2B 운영 도구이므로 장식보다 정보 인식, 조작 효율, 접근성을 우선합니다.

| 항목 | 기준 |
| --- | --- |
| Typography | 제목, 본문, 라벨, 태그, 숫자, 표 텍스트의 크기와 굵기를 구분합니다. |
| Color Usage | primary/accent/warning/danger의 사용 범위를 지킵니다. |
| Spacing | 페이지 간격, 카드 내부 간격, 모바일 간격 축소 기준을 토큰으로 관리합니다. |
| Radius/Shadow | 카드, 패널, 팝오버, FAB의 깊이와 위계를 일관되게 유지합니다. |
| Icon/Logo | Ant Design icon을 우선 사용하고, 브랜드 로고는 인증/사이드바/모바일 헤더에 일관되게 배치합니다. |
| Breakpoint | 1399, 1199, 991, 767, 420px 기준의 레이아웃 변화를 관리합니다. |
| Motion | hover/focus/transition을 가볍게 사용하고 `prefers-reduced-motion`에 대응합니다. |
| Accessibility | 키보드 접근, focus-visible, aria-label, 색상 대비, touch target을 기본 요구사항으로 둡니다. |

## 3. 기본 컴포넌트

기본 컴포넌트는 독립적으로 재사용 가능한 UI 단위입니다. Ant Design 컴포넌트를 기본으로 사용하고, 반복되는 사용 방식은 공통 컴포넌트로 정리합니다.

### 문서화 항목

| 항목 | 내용 |
| --- | --- |
| 용도 | 언제 사용하는 컴포넌트인지 |
| 사용하지 말아야 할 경우 | 다른 컴포넌트를 써야 하는 상황 |
| Anatomy | label, icon, helper text, action 등 구성 요소 |
| Variants | primary, default, link, danger 등 |
| States | default, hover, focus, disabled, loading, error, empty |
| Size | desktop/mobile에서의 높이, 여백, 터치 영역 |
| Behavior | 클릭, 제출, 닫기, 키보드 조작 |
| Accessibility | role, aria-label, aria-current, aria-pressed |
| Content Rule | 버튼 문구, 오류 문구, 빈 상태 문구 |
| 사용 예시 | 대표 화면과 관련 컴포넌트 경로 |

### 우선 관리 대상

| 컴포넌트 | 기준 |
| --- | --- |
| Button | 주요 실행은 primary, 보조 실행은 default, 보조 이동은 link, 위험 실행은 danger를 사용합니다. |
| Input / TextArea / Select | label, helper text, validation message를 함께 설계합니다. |
| Form / Validation | 필수값, 오류 위치, 제출 가능 상태, 단계형 흐름을 일관되게 관리합니다. |
| Tag / Badge / Status | 색상과 텍스트를 함께 사용하고, 상태 용어를 화면마다 다르게 쓰지 않습니다. |
| Tooltip | 아이콘 전용 버튼이나 짧은 보조 설명에만 사용합니다. |
| Loading / Empty / Error | 전체 페이지, 카드 내부, 버튼 내부의 상태 표현을 구분합니다. |
| Progress / Statistic | 크레딧, 완성도, 적합도처럼 수치 판단이 필요한 곳에 사용합니다. |
| Icon-only Button | 항상 `aria-label`을 제공하고 40px 이상의 터치 영역을 확보합니다. |

## 4. 복합 컴포넌트

복합 컴포넌트는 여러 기본 요소가 결합된 기능 단위입니다. 한 컴포넌트는 하나의 명확한 업무 목적을 가져야 합니다.

### 우선 관리 대상

| 컴포넌트 | 역할 |
| --- | --- |
| `PageTitle` | 화면 목적, 설명, 주요 액션을 제공하는 보호 화면 상단 영역 |
| `SectionCard` | 업무 단위를 나누는 기본 카드 |
| `MetricCard` | 핵심 지표 카드 |
| `FloatingAlert` | 저장/삭제/복사 등 짧은 피드백 |
| Modal / Confirm | 삭제, 권한 변경, 되돌릴 수 없는 작업 확인 |
| Table + Mobile Card List | 데스크톱/모바일 데이터 표시 패턴 |
| `SearchSuggestions` | 검색어, 추천어, 선택 chip |
| `DocumentChatFab` / `ChatWindowPanel` | AI 채팅 위젯과 전체 채팅 화면 |
| `DonutChart` / `EChart` | 분석 결과 시각화 |

### 문서화 항목

- 어떤 기본 컴포넌트로 구성되는지
- desktop/mobile에서 레이아웃이 어떻게 바뀌는지
- loading/empty/error 상태를 어떻게 처리하는지
- props와 데이터 입력 기준
- 접근성 요구사항
- 사용 중인 대표 화면
- 새로 만들지 않고 이 컴포넌트를 재사용해야 하는 조건

## 5. 템플릿 / 레이아웃

템플릿은 페이지의 뼈대와 배치 규칙입니다. 화면이 늘어날수록 가장 중요한 통일 기준입니다.

### 관리 대상

| 템플릿 | 역할 |
| --- | --- |
| `AppShell` | 로그인 후 보호 화면 공통 레이아웃 |
| `SidebarNav` | 데스크톱 탐색 |
| `MobileShellHeader` | 모바일 헤더와 Drawer |
| `AuthScreen` | 로그인, 회원가입, 비밀번호 찾기 |
| Shared Report Layout | 비인증 공유 리포트 화면 |
| Split Editor Layout | 목록 + 편집/상세 2열 화면 |
| Chat Layout | 참조 데이터 + 채팅 패널 |
| Dashboard Layout | hero, metric, table, task, insight 조합 |

### 레이아웃 기준

- 보호 화면은 `PageTitle` -> 주요 `SectionCard` -> 도메인 패널 순서를 기본으로 합니다.
- 콘텐츠 최대 너비와 내부 스크롤 기준을 `AppShell` 안에서 유지합니다.
- sidebar 고정/접힘 상태에 따라 콘텐츠 위치가 자연스럽게 조정되어야 합니다.
- 모바일 전환 시 Drawer, card list, full-width action을 우선 고려합니다.
- FAB와 safe-area 여백을 고려해 모바일 하단 UI가 겹치지 않게 합니다.
- `/chat`처럼 예외가 되는 화면은 예외 기준을 명시하고 같은 채팅 패턴을 재사용합니다.

## 6. 스타일 구현 기준

전체 스타일은 `frontend/src/styles.css`에 모여 있습니다. 이 파일은 토큰, Ant Design override, 앱 shell, 공통 컴포넌트, 도메인 화면, 반응형, dark theme를 함께 관리합니다.

주요 섹션:

- 전역 토큰과 Ant Design override
- 앱 shell, 사이드바, 모바일 헤더/Drawer
- 공통 page title, card, form, table 스타일
- 대시보드 hero, metric, summary card
- 관리자 화면 grid, table, usage chart
- JD, 자기소개서, 모집 공고 화면
- 채팅 창, 문서 검색 FAB, 추천 패널
- 인증 화면
- dark theme override
- 반응형 breakpoint와 `prefers-reduced-motion`

테마 연결 기준:

- `frontend/src/App.tsx`에서 Ant Design token을 설정합니다.
- `frontend/src/styles.css`는 `.app-root[data-theme="dark"]`로 dark mode를 보완합니다.
- `frontend/src/data/appConfig.tsx`의 `palette`는 Ant Design token과 함께 쓰입니다.
- 차트 색상은 `frontend/src/components/charts/chartTheme.ts`를 기준으로 light/dark theme를 맞춥니다.

## 7. 콘텐츠 스타일

문구도 디자인 시스템의 일부입니다. 같은 기능은 같은 말투와 같은 용어로 설명해야 합니다.

| 상황 | 지양 | 권장 |
| --- | --- | --- |
| 버튼 | 확인 | 저장하기, 다시 시도, 삭제하기 |
| 삭제 확인 | 정말로 진행하시겠습니까? | 이 항목을 삭제할까요? 삭제 후에는 복구할 수 없습니다. |
| 오류 | 오류가 발생했습니다. | 분석 결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요. |
| 빈 상태 | 데이터 없음 | 아직 등록된 JD가 없습니다. 새 JD를 작성해 분석을 시작하세요. |

문구 작성 기준:

- 버튼은 가능한 한 동사형으로 씁니다.
- 오류 메시지는 원인, 영향, 사용자가 할 수 있는 다음 행동을 포함합니다.
- 빈 상태는 현재 상태와 다음 행동을 함께 안내합니다.
- 삭제 확인은 대상과 복구 가능 여부를 명확히 씁니다.
- 날짜, 숫자, 포인트, 퍼센트 표기는 화면 안에서 같은 형식을 유지합니다.
- 제품 용어는 `JD`, `자기소개서`, `리포트`, `크레딧`, `문서 검색`처럼 문서와 UI에서 동일하게 사용합니다.

## 8. 접근성과 인터랙션

접근성은 나중에 추가하는 옵션이 아니라 컴포넌트 기본 스펙입니다.

| 항목 | 기준 |
| --- | --- |
| 색상 대비 | 텍스트와 배경 대비를 light/dark mode 모두에서 확인합니다. |
| 키보드 접근 | Tab, Enter, Space, Esc 조작 가능 여부를 확인합니다. |
| Focus state | `:focus-visible` 스타일을 hover와 별도로 유지합니다. |
| Screen reader | 아이콘 전용 버튼은 `aria-label`, 현재 탐색 항목은 `aria-current`를 사용합니다. |
| Toggle/Selection | 선택형 버튼과 카드에는 `aria-pressed` 또는 적절한 선택 상태를 제공합니다. |
| Touch target | 모바일 버튼과 FAB는 40px 이상 영역을 확보합니다. |
| Error message | 색상만으로 오류를 전달하지 않고 텍스트/아이콘을 함께 사용합니다. |
| Motion | `prefers-reduced-motion: reduce`에서 transition/animation을 거의 제거합니다. |
| Form label | 모든 입력 요소에 명확한 label 또는 접근 가능한 이름을 제공합니다. |

현재 구현 기준:

- 탐색 항목은 `aria-current`, `aria-label`을 사용합니다.
- 채팅 위젯은 `role="dialog"`, 추천 패널은 `aria-expanded`/`aria-controls`를 사용합니다.
- 아이콘만 있는 버튼은 `aria-label`을 둡니다.
- 모바일 Drawer와 Popover는 `.app-root`를 popup container로 사용해 theme context를 유지합니다.

## 9. 반응형 / 뷰포트 레이아웃

| Breakpoint | 역할 |
| --- | --- |
| `1399px` 이하 | 대시보드 hero 3열을 완화합니다. |
| `1199px` 이하 | layout gap을 줄이고 주요 grid를 1열/2열로 전환합니다. |
| `991px` 이하 | 데스크톱 sidebar를 제거하고 모바일 header/drawer를 활성화합니다. |
| `767px` 이하 | page title/card/input/action을 모바일 밀도로 축소하고 table을 card list로 대체합니다. |
| `420px` 이하 | 가장 작은 모바일에서 gap, 로고, hero, widget 크기를 추가로 줄입니다. |

주요 보호 화면은 루트에 `viewport-page` 클래스를 붙여 shell 높이(`100dvh`) 안에서 스크롤을 내부 영역으로 제한합니다.

적용 페이지:

- `/dashboard`
- `/admin`
- `/company`
- `/jd`
- `/cover-letter`
- `/analysis-report`
- `/chat`
- `/mypage`

주요 CSS 패턴:

- `.content:has(.viewport-page) .content-frame`: 페이지를 flex column으로 고정
- `.viewport-page > .split-editor-layout-row`, `.chat-page-layout-row`: 2열 편집/채팅 레이아웃이 남은 높이를 채움
- `.viewport-column-scroll`, `.scroll-card-body`: 카드 본문 내부 스크롤
- `.dashboard-body-scroll`: 대시보드 본문만 세로 스크롤

반응형 화면에서는 정보량을 줄이기보다 우선순위를 조정합니다. 주요 액션, 현재 상태, 오류/빈 상태 안내는 모바일에서도 반드시 보여야 합니다.

## 10. 디자인 QA와 테스트

새 화면이나 컴포넌트를 추가할 때 다음을 확인합니다.

- 기존 Ant Design 또는 공통 컴포넌트로 해결 가능한가?
- 새 색상, 간격, 반경이 기존 토큰으로 표현 가능한가?
- hover, focus, disabled, loading, error, empty 상태가 있는가?
- desktop table을 만들었다면 mobile card list도 고려했는가?
- Light/Dark theme에서 대비와 배경이 깨지지 않는가?
- 아이콘 전용 버튼에 `aria-label`이 있는가?
- 모달, Drawer, 채팅 위젯의 닫기/키보드 동작이 명확한가?
- 같은 UI가 2개 이상 화면에서 반복되면 공통 컴포넌트 후보로 검토했는가?
- 새 패턴을 만들었다면 사용 기준과 대체 기준을 문서화했는가?

### QA 스크립트

`frontend/scripts/`에 API 계약과 UI 흐름 검증 스크립트가 있습니다. `verify-*.mjs` 스크립트는 npm script로 등록되어 있지 않으므로 `frontend` 루트에서 `node scripts/<name>.mjs`로 실행합니다.

| 스크립트 | 역할 |
| --- | --- |
| `verify-backend-contract.mjs` | backend API 계약 정적 검증 |
| `verify-live-django-api.mjs` | Django runserver 기반 API 시나리오 검증 |
| `verify-document-chat-widget.mjs` | 문서 검색 위젯 시각/동작 QA |
| `verify-auth-flow.mjs`, `verify-auth-text-links.mjs` | 인증 UI 흐름과 텍스트 링크 QA |
| `verify-admin-layout.mjs`, `verify-admin-authkey-panel.mjs` | 관리자 화면 QA |
| `verify-jd-create-flow.mjs` | JD 생성/삭제 UI 흐름 QA |
| `verify-cover-letter-save-flow.mjs`, `verify-cover-letter-selection-flow.mjs` | 자기소개서 저장/선택/삭제 UI QA |
| `verify-viewport-layout.mjs` | 뷰포트 기반 페이지 레이아웃 QA |
| `verify-shared-route.mjs` | `/shared` 공유 리포트 라우트 검증 |
| `verify-state-management-refactor.mjs` | `App.tsx`와 페이지 훅 분리 정적 검증 |
| `verify-analysis-report-page.mjs` | 분석 리포트 화면 QA |
| `verify-chat-context-real-data.mjs` | 채팅 컨텍스트 실데이터 연결 검증 |
| `verify-qa-stability-fixes.mjs` | UI 안정성 회귀 검증 |

`verify-viewport-layout.mjs`는 주요 보호 화면을 1366x768, 1440x900, 1920x1080과 모바일 390x844에서 검사합니다. 카드/내부 스크롤 컬럼 클리핑, `/dashboard` 가로 오버플로, `/chat` 입력창 가시성을 확인합니다.

### Vitest

`frontend/vite.config.ts`의 `test` 블록과 `frontend/src/test/setup.ts`가 Vitest 환경을 설정합니다.

- 테스트 러너: Vitest 4, jsdom 환경
- DOM 검증: Testing Library
- API 모킹: MSW
- 대상: `src/**/*.test.{ts,tsx}` (`tests/e2e/**` 제외)

```bash
cd frontend
npm run test
npm run test:watch
npm run test:coverage
```

### Playwright

`frontend/playwright.config.ts`와 `frontend/tests/e2e/`가 Playwright E2E를 담당합니다.

- `auth-accessibility.spec.ts`는 `/login` 화면에 axe-core로 critical 접근성 위반을 검사합니다.
- 기본 포트는 `E2E_PORT` 환경 변수, 미설정 시 `5181`입니다.
- Chrome/Edge 실행 파일은 Windows 경로 후보에서 자동 탐색합니다. 실패 시 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`을 지정합니다.

```bash
cd frontend
npm run test:e2e
```

### 빌드와 lint

```bash
cd frontend
npm run lint
npm run build
npm run preview
npm run analyze
```

## 11. 운영 기준

1. 기존 Ant Design 컴포넌트와 CSS 토큰 조합으로 해결 가능한지 확인합니다.
2. 2개 이상 화면에서 같은 UI가 반복되거나, 접근성/상태 처리가 복잡하면 공통 컴포넌트 후보로 봅니다.
3. 공통 컴포넌트로 만들 때는 props, states, 접근성, 모바일 동작, 예시 사용처를 문서화합니다.
4. 기존 패턴을 대체한다면 마이그레이션 범위와 deprecated 시점을 함께 기록합니다.
5. 토큰, 패턴, 컴포넌트 API 변경 이유는 관련 문서나 PR 설명에 남깁니다.

## 관련 문서

- [프론트엔드 개요](overview.md)
- [페이지와 라우트](pages-and-routes.md)
- [상태와 API 어댑터](state-and-api-adapters.md)
- [실행과 운영](../01-getting-started/run-and-operations.md)
- [프론트엔드 API 연동 README](../../frontend/README.md)
