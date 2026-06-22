# 디자인 시스템

이 문서는 HumouR 프론트엔드 디자인 시스템의 기준 문서입니다. 디자인 시스템은 예쁜 컴포넌트 모음이 아니라, 제품을 일관되게 만들기 위한 기준, 재사용 자산, 운영 규칙의 집합입니다. 따라서 이 문서는 현재 구현된 UI 자산을 나열하는 데서 끝나지 않고, 새 화면과 컴포넌트를 만들 때의 판단 기준까지 함께 정의합니다.

실제 스타일 구현은 `frontend/src/styles.css`, Ant Design 테마 연결은 `frontend/src/App.tsx`, 브랜드/차트 팔레트 일부는 `frontend/src/data/appConfig.tsx`와 `frontend/src/components/charts/chartTheme.ts`에 있습니다.

## 목적과 범위

HumouR UI는 채용 운영자가 반복적으로 확인하고 조작하는 B2B 운영 도구입니다. 디자인 시스템의 목표는 화면을 빠르게 늘리는 것보다, 같은 문제를 같은 방식으로 풀 수 있게 만드는 것입니다.

| 항목 | HumouR 기준 |
| --- | --- |
| 목적 | 브랜드 일관성, 개발 효율, UX 품질 향상, 접근성 기본화 |
| 적용 범위 | 보호 화면, 인증 화면, 공유 리포트 화면, 관리자/운영 패널, 문서 검색 AI 위젯 |
| 대상 사용자 | 프론트엔드 개발자, PM, 디자이너, QA 담당자 |
| 운영 원칙 | 빠르게 만들기보다 일관되게 만들기, 접근성을 기본값으로 하기, 실제 코드와 문서를 함께 갱신하기 |
| 성공 기준 | 중복 UI 감소, 디자인 QA 이슈 감소, 새 화면 구현 리드타임 단축, 모바일/다크모드 회귀 감소 |

## 디자인 원칙

| 원칙 | 설명 | 적용 예 |
| --- | --- | --- |
| 명확성 | 사용자가 다음 행동과 현재 상태를 빠르게 이해해야 합니다. | `PageTitle`, 명확한 CTA, 상태별 `Tag` |
| 일관성 | 같은 기능은 같은 컴포넌트와 패턴으로 표현합니다. | 보호 화면은 `PageTitle` + `SectionCard` 구조를 기본으로 사용 |
| 접근성 | 키보드, 스크린 리더, 색상 대비, 모션 민감도를 기본 요구사항으로 다룹니다. | 아이콘 전용 버튼 `aria-label`, `prefers-reduced-motion` |
| 효율성 | 반복 업무는 줄이고 핵심 작업은 빠르게 끝낼 수 있게 합니다. | 사이드바 탐색, 테이블/카드 병행, 문서 검색 FAB |
| 신뢰성 | 상태, 오류, 결과를 숨기지 않고 투명하게 전달합니다. | `PageError`, `FloatingAlert`, 삭제 확인 모달 |

## 시스템 구성

디자인 시스템은 다음 4개 층으로 운영합니다.

| 층 | 포함 내용 | 현재 근거 |
| --- | --- | --- |
| Foundation | 색상, 타이포그래피, 간격, 반경, 그림자, breakpoint, motion | `frontend/src/styles.css` |
| Design Tokens | 의미 기반 CSS custom property, Ant Design token, 차트 토큰 | `frontend/src/styles.css`, `frontend/src/App.tsx`, `frontend/src/components/charts/chartTheme.ts` |
| Components | 공통 레이아웃, 카드, 폼, 상태, 차트, 채팅, 도메인 패널 | `frontend/src/components/` |
| Operations | 사용 기준, 접근성 체크, QA 스크립트, 변경/폐기 규칙 | 이 문서, `docs/03-frontend/styling-and-qa.md`, `frontend/scripts/` |

## 디자인 토큰

### 토큰 원칙

색상과 간격은 단순 값이 아니라 의미 기반 토큰으로 사용합니다. 예를 들어 `#2f73f6`을 직접 반복하기보다 `--primary` 또는 Ant Design의 `colorPrimary`를 사용합니다.

```text
primitive value
blue-500 = #2f73f6

semantic token
--primary = blue-500
color.action.primary = --primary
color.background.surface = --surface
```

이 구조를 유지하면 브랜드 컬러 변경, 다크모드, 차트/컴포넌트 동기화가 쉬워집니다.

### 색상

CSS 토큰 기준 색상은 `.app-root`에 정의되어 있습니다. 근거: `frontend/src/styles.css`

| 토큰 | Light | Dark | 용도 |
| --- | --- | --- | --- |
| `--primary` | `#2f73f6` | `#6ea3ff` | 주요 버튼, 활성 메뉴, 핵심 인터랙션 |
| `--primary-strong` | `#1e56d8` | `#8fb7ff` | primary hover/강조 |
| `--primary-soft` | `#e9f1ff` | `rgba(110, 163, 255, 0.16)` | 선택 배경, focus/hover 배경 |
| `--accent` | `#14b8a6` | `#43d9c6` | 보조 강조, 성공/AI 보조 지표 |
| `--accent-soft` | `#e6fbf7` | `rgba(67, 217, 198, 0.13)` | accent 배경 |
| `--warning` | `#f59e0b` | `#fbbf24` | 대기/주의 상태 |
| `--danger` | `#ef4444` | 동일 | 위험/삭제/오류 상태 |
| `--bg` | `#f4f7ff` | `#0f172a` | 앱 배경 |
| `--surface` | `#ffffff` | `rgba(22, 34, 58, 0.92)` | 기본 카드/패널 |
| `--surface-raised` | `rgba(255, 255, 255, 0.92)` | `rgba(30, 43, 70, 0.92)` | 떠 있는 사이드바, 팝오버, 위젯 |
| `--surface-soft` | `#f7faff` | `rgba(255, 255, 255, 0.06)` | 카드 헤더, 보조 패널 |
| `--text` | `#102033` | `#f8fbff` | 본문/제목 |
| `--muted` | `rgba(16, 32, 51, 0.64)` | `rgba(248, 251, 255, 0.68)` | 설명/보조 텍스트 |
| `--subtle` | `rgba(16, 32, 51, 0.42)` | `rgba(248, 251, 255, 0.42)` | 라벨/힌트 |
| `--border` | `rgba(47, 115, 246, 0.14)` | `rgba(255, 255, 255, 0.12)` | 기본 경계선 |
| `--border-strong` | `rgba(47, 115, 246, 0.28)` | `rgba(110, 163, 255, 0.34)` | hover/focus 경계선 |

주의: `frontend/src/data/appConfig.tsx`의 `palette`는 CSS custom property의 light theme 기준값과 동기화되어 있습니다. 차트, Ant Design token, CSS 표현이 갈라지지 않도록 primary/accent/background/text 값을 변경할 때 두 위치를 함께 업데이트하세요.

### 그림자, 반경, 간격

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--shadow-sm` | `0 8px 22px rgba(31, 77, 161, 0.08)` | 입력/작은 카드 |
| `--shadow-md` | `0 14px 34px rgba(31, 77, 161, 0.1)` | 위젯 보조 패널 |
| `--shadow` | `0 18px 50px rgba(31, 77, 161, 0.12)` | 주요 카드/사이드바 |
| `--shadow-lg` | `0 26px 70px rgba(31, 77, 161, 0.18)` | popover, floating widget |
| `--radius-sm` | `10px` | 작은 아이콘/내부 요소 |
| `--radius` | `16px` | 기본 카드/입력 컨테이너 |
| `--radius-lg` | `22px` | page title, sidebar, 큰 패널 |
| `--layout-gap` | `24px` | 페이지 그리드 기본 간격 |
| `--section-inner-gap` | `12px` | 섹션 내부 표준 간격 |
| `--section-tight-gap` | `8px` | 좁은 섹션 내부 간격 |
| `--content-max` | `1540px` | 보호 화면 최대 콘텐츠 너비 |

모바일에서는 `--layout-gap`이 16px, 420px 이하에서는 14px로 줄어듭니다. 근거: `frontend/src/styles.css`

### 타이포그래피

- 기본 폰트: `"Noto Sans KR Clean", "Noto Sans KR", system-ui, sans-serif`
- 제목은 보통 `font-weight: 900`, 본문/설명은 700-800 범위를 사용합니다.
- 운영 UI 특성상 letter spacing은 0으로 유지합니다.
- 대표 크기:
  - page title: 30px, 모바일 25px
  - dashboard hero title: 38px, 모바일 27px, 420px 이하 24px
  - 카드 제목: 14-16px
  - 보조 라벨/태그: 11-13px

## 레이아웃 패턴

### 보호 화면

보호 화면은 `AppShell` 아래에서 공통 레이아웃을 공유합니다. 근거: `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/SidebarNav.tsx`

- 데스크톱: 왼쪽 fixed sidebar, 콘텐츠는 `content-frame` 안에서 최대 1540px로 정렬
- sidebar 기본 폭: 접힘 84px, 펼침 292px
- pin 상태일 때 콘텐츠 margin을 sidebar 폭에 맞춰 조정
- 991px 이하: sidebar를 숨기고 `MobileShellHeader`와 Drawer를 사용
- 767px 이하: 콘텐츠 하단에 FAB와 safe-area를 고려한 여백 유지

### 페이지 구조

새 보호 페이지는 다음 순서를 기본으로 합니다.

1. `PageTitle`: eyebrow, h1, 설명, 주요 액션
2. `SectionCard`: 화면 기능을 한 주제씩 나누는 카드
3. 도메인 패널: 테이블, 폼, 미리보기, 차트, 작업 목록
4. 전역 `DocumentChatFab`: `/chat`을 제외한 보호 화면에서 표시

관련 컴포넌트: `frontend/src/components/common/PageTitle.tsx`, `frontend/src/components/common/SectionCard.tsx`

### 인증 화면

인증 라우트(`/login`, `/signup`, `/password-reset`)는 `AuthScreen`을 사용하고 앱 shell을 쓰지 않습니다. 좌측 설명 영역과 우측 카드 폼의 2열 구성이며, 1199px 이하에서는 1열로 전환됩니다. 근거: `frontend/src/components/layout/AuthScreen.tsx`, `frontend/src/pages/auth/`

### 공유 리포트 화면

공유 리포트(`/shared`)는 비인증 사용자가 접근할 수 있는 공개 화면입니다. 보호 화면 shell과 분리하되, 동일한 `--primary`, `--surface`, `--text` 계열 토큰을 사용해 브랜드 일관성을 유지합니다. 근거: `frontend/src/pages/SharedReportPage.tsx`, `frontend/src/styles.css`

## 컴포넌트 라이브러리

컴포넌트 문서는 모양만 설명하지 않고 언제, 왜, 어떻게 써야 하는지를 함께 설명해야 합니다.

| 문서 항목 | 포함할 내용 |
| --- | --- |
| 용도 | 언제 쓰는 컴포넌트인지 |
| 사용하지 말아야 할 경우 | 다른 컴포넌트를 써야 하는 상황 |
| Anatomy | label, icon, container, helper text 등 구성 요소 |
| Variants | primary, secondary, ghost, danger 등 |
| States | default, hover, pressed, focused, disabled, loading, error |
| Size | sm, md, lg 등 |
| Behavior | 클릭, 포커스, 키보드 조작, 닫힘 동작 |
| Responsive | 모바일/데스크톱에서의 변화 |
| Accessibility | role, aria-label, keyboard interaction, focus ring |
| Content rule | 버튼 문구, 에러 메시지 작성법 |
| Code | props, API, 사용 예시 |

### 버튼

Ant Design `Button`을 기본으로 사용합니다. 근거: `frontend/src/App.tsx`, `frontend/src/styles.css`

- 주요 실행: `type="primary"`와 아이콘을 함께 사용
- 보조 실행: default button
- 보조 탐색/상세 보기: `type="link"`
- 원형 도구 버튼: `shape="circle"`과 아이콘 사용
- 위험 실행: `danger` 또는 `--danger` 계열을 사용하고 확인 절차를 둠
- disabled 상태: opacity 0.6, shadow 제거
- hover/focus: translateY 또는 primary strong 색상으로 가볍게 반응

버튼 문구는 "확인"처럼 추상적인 말보다 "저장하기", "다시 시도", "삭제하기"처럼 행동을 드러내는 동사형을 우선합니다.

### 카드와 섹션

카드 계층은 과도하게 중첩하지 않고 한 카드가 하나의 업무 단위를 담습니다.

- 공통 섹션: `SectionCard`
- 지표: `MetricCard`
- 선택 목록: `selection-card`, `jd-card`
- 모바일 리스트: `mobile-data-card`
- 작업 목록: `task-item`

`SectionCard`는 상단 3px primary bar를 갖고, header 배경은 `--surface-soft`를 사용합니다. 근거: `frontend/src/components/common/SectionCard.tsx`, `frontend/src/styles.css`

### 폼과 입력

Ant Design `Input`, `Select`, `Form`, `Steps`를 사용합니다.

- 입력 기본 높이: 40px 이상
- focus: primary border와 `0 0 0 3px` soft ring
- label, helper text, validation message를 함께 설계
- 긴 액션 버튼은 모바일에서 full width grid로 전환
- 비밀번호 찾기처럼 단계가 있는 흐름은 `Steps size="small"` 사용

근거: `frontend/src/pages/auth/`, `frontend/src/components/company/CompanyProfileForm.tsx`, `frontend/src/components/jd/JdEditorPanel.tsx`

### 상태와 피드백

| 상황 | 기본 컴포넌트 | 사용 기준 |
| --- | --- | --- |
| 페이지 로딩 | `PageLoading` | 전체 데이터가 아직 준비되지 않았을 때 |
| 페이지 오류 | `PageError` | API 데이터를 불러오지 못했거나 초기 데이터가 없을 때 |
| 빈 상태 | `EmptyState` | 데이터가 없지만 사용자가 다음 행동을 할 수 있을 때 |
| 짧은 알림 | `FloatingAlert` | 저장/삭제/복사 성공처럼 작업을 막지 않는 피드백 |
| 위험 확인 | `Modal`/확인 패턴 | 삭제, 권한 변경처럼 되돌리기 어려운 행동 |

근거: `frontend/src/components/common/PageState.tsx`, `frontend/src/components/common/FloatingAlert.tsx`, `frontend/src/components/admin/AuthKeyDeleteModal.tsx`, `frontend/src/components/jd/JdDeleteModal.tsx`, `frontend/src/components/cover-letter/CoverLetterDeleteModal.tsx`

### 데이터 표시

- 데스크톱 표: Ant Design `Table` + `desktop-data-table`
- 모바일 표 대체: 카드 리스트 + `mobile-data-list`
- 적합도/사용량: `Progress`
- 상태: `Tag` 또는 `statusTag()`
- 핵심 수치: `Statistic`, `MetricCard`, hero stat

상태 색상 매핑은 `frontend/src/utils/statusTag.tsx`에 있습니다.

### 차트

도넛 차트는 ECharts SVG renderer를 사용합니다. 근거: `frontend/src/components/charts/DonutChart.tsx`, `frontend/src/components/charts/chartAdapters.ts`, `frontend/src/components/charts/chartTheme.ts`

- primary/accent/warning/track 4개 키를 사용
- legend는 숨기고, 중앙 text graphic으로 핵심 수치를 표시
- tooltip은 light/dark theme token을 따릅니다.

## 주요 패턴과 플로우

컴포넌트는 부품이고, 패턴은 조립 방식입니다. HumouR에서는 다음 패턴을 우선 관리합니다.

| 패턴 | 기준 |
| --- | --- |
| Form pattern | label, helper text, validation, required 표시, submit rule을 일관되게 둠 |
| Error pattern | inline error, page error, network error, permission error를 구분 |
| Empty state | 현재 상태와 다음 행동을 함께 안내 |
| Loading state | 전체 로딩은 skeleton/card, 버튼 내부 로딩은 `InlineLoading` 또는 Ant Design loading |
| Search/filter | 검색어, 필터 chip, 정렬, 결과 초기화가 한 흐름으로 보이게 구성 |
| Table pattern | 데스크톱 table과 모바일 card list를 함께 설계 |
| Auth pattern | 로그인, 회원가입, 비밀번호 재설정은 `AuthScreen`과 단계형 피드백 사용 |
| Notification | toast, alert, modal을 중요도와 차단 여부에 따라 구분 |
| Permission | 접근 불가, 인증 만료, 관리자 문의를 명확히 분리 |

### 대시보드

`DashboardHero`는 현재 디자인 시스템에서 가장 큰 화면 패턴입니다. 근거: `frontend/src/components/dashboard/DashboardHero.tsx`

- 3열 구성: hero copy, visual mock, summary
- KPI는 `hero-stat-grid`로 3개까지 노출
- CTA는 primary + secondary 조합
- 시각 요소는 실제 이미지가 아니라 CSS 기반 채용/분석 보드 모형

`DashboardMetrics`, `ApplicantReviewTable`, `AnalysisSummaryPanel`, `TaskListPanel`은 이후 모든 운영 화면의 밀도와 간격 기준으로 삼습니다.

### 채팅과 AI 보조

채팅 UI는 Ant Design X `Bubble.List`, `Sender`, `Sources`, `Prompts`를 사용합니다. 근거: `frontend/src/components/chat/ChatWindowPanel.tsx`, `frontend/src/components/chat/DocumentChatFab.tsx`

- 전역 FAB는 bottom-right 고정
- 열린 widget은 `role="dialog"`로 표시
- 추천 패널은 좌측 슬라이드 형태로 열림
- `/chat` 페이지는 동일한 채팅 패턴을 full-page card 안에서 사용
- loading은 `InlineLoading`으로 텍스트와 spinner를 함께 표시

### 관리자와 운영 패널

관리자 페이지는 여러 개의 요약 카드, 미니 progress, table-like row, 정책 카드로 구성됩니다. 근거: `frontend/src/pages/AdminPage.tsx`

- tone class: primary, accent, warning, danger
- LLM 포인트/면접방/보안 정책처럼 빠른 판단이 필요한 정보는 작은 카드와 tag를 함께 사용
- 비밀번호/복사 같은 단발 작업은 작은 button으로 처리

## 콘텐츠 스타일

디자인 시스템에는 시각 요소뿐 아니라 문구 작성 기준도 포함합니다. 버튼, 오류, 빈 상태, 알림 문구는 사용자의 다음 행동을 직접 결정합니다.

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
- 날짜, 숫자, 포인트, 퍼센트 표기는 화면 안에서 같은 형식을 유지합니다.
- 제품 용어는 `JD`, `자기소개서`, `리포트`, `크레딧`, `문서 검색`처럼 문서와 UI에서 동일하게 씁니다.

## 접근성과 인터랙션

접근성은 나중에 추가하는 옵션이 아니라 컴포넌트 기본 스펙입니다.

| 항목 | HumouR 기준 |
| --- | --- |
| 색상 대비 | 텍스트와 배경 대비를 light/dark mode 모두에서 확인 |
| 키보드 접근 | Tab, Enter, Space, Esc 조작 가능 여부 확인 |
| Focus state | `:focus-visible` 스타일을 hover와 별도로 유지 |
| Screen reader | 아이콘 전용 버튼은 `aria-label`, 현재 탐색 항목은 `aria-current` 사용 |
| Touch target | 모바일 버튼과 FAB는 40px 이상 영역을 확보 |
| Error message | 색상만으로 오류를 전달하지 않고 텍스트/아이콘을 함께 사용 |
| Motion | `prefers-reduced-motion: reduce`에서 transition/animation을 거의 제거 |
| Form label | 모든 입력 요소에 명확한 label 또는 접근 가능한 이름 제공 |

현재 구현 기준:

- 탐색 항목은 `aria-current`, `aria-label`을 사용합니다.
- 채팅 위젯은 `role="dialog"`, 추천 패널은 `aria-expanded`/`aria-controls`를 사용합니다.
- 아이콘만 있는 버튼은 `aria-label`을 둡니다.
- hover/focus-visible 스타일을 함께 정의해 키보드 탐색을 고려합니다.
- 모바일 Drawer와 Popover는 `.app-root`를 popup container로 사용해 theme context를 유지합니다.

## 반응형 기준

| Breakpoint | 역할 |
| --- | --- |
| `1399px` 이하 | 대시보드 hero 3열을 2열/summary full row로 완화 |
| `1199px` 이하 | layout gap 22px, 주요 grid 1열/2열 전환 |
| `991px` 이하 | 데스크톱 sidebar 제거, 모바일 header/drawer 활성화 |
| `767px` 이하 | page title/card/input/action을 모바일 밀도로 축소, table을 card list로 대체 |
| `420px` 이하 | 가장 작은 모바일에서 gap 14px, 로고/hero/widget 크기 추가 축소 |

모션 민감도는 `prefers-reduced-motion: reduce`에서 transition/animation 시간을 거의 제거합니다.

## 디자인 QA 체크리스트

새 화면이나 컴포넌트를 추가할 때 다음 항목을 확인합니다.

- 새 보호 화면은 `PageTitle`로 시작하고, 주요 업무 단위는 `SectionCard`로 나눈다.
- 색상은 CSS custom property 또는 Ant Design theme token을 우선 사용한다.
- primary는 실행/활성, accent는 보조 강조, warning/danger는 상태 의미에만 사용한다.
- 임의의 hex 값을 추가했다면 기존 토큰으로 대체할 수 없는 이유를 남긴다.
- 버튼에는 가능한 한 Ant Design icon을 함께 붙이고, icon-only button에는 `aria-label`을 넣는다.
- 데스크톱 table을 만들면 767px 이하의 card list 대체 UI도 함께 고려한다.
- 카드 반경, gap, shadow는 `--radius`, `--radius-lg`, `--layout-gap`, `--shadow-*`를 우선 사용한다.
- hover, focus, disabled, loading, error 상태를 빠뜨리지 않는다.
- light/dark mode에서 새 배경, border, chart 색상이 모두 읽히는지 확인한다.
- 텍스트가 줄바꿈되어도 버튼, 카드, 표, FAB 레이아웃이 깨지지 않는지 확인한다.
- motion이 필요한 경우 `prefers-reduced-motion` 아래에서 안전하게 줄어드는지 확인한다.

QA 스크립트와 테스트 기준은 [스타일과 QA](styling-and-qa.md)를 참고합니다.

## 운영 방식

디자인 시스템이 유지되려면 컴포넌트보다 운영 규칙이 먼저 안정되어야 합니다.

| 항목 | 현재 기준 |
| --- | --- |
| Owner | 프론트엔드 담당자가 코드 기준 오너, 디자인/PM과 함께 변경 검토 |
| Contribution process | 새 컴포넌트가 필요하면 기존 Ant Design/공통 컴포넌트로 해결 가능한지 먼저 확인 |
| Review process | 디자인 일관성, 접근성, 모바일, 다크모드, API 상태를 함께 리뷰 |
| Release process | 문서와 코드 변경을 같은 PR/작업 단위에서 갱신 |
| Deprecation rule | 더 이상 쓰지 않는 컴포넌트는 문서에 대체 컴포넌트와 제거 예정 범위를 남김 |
| Decision log | 토큰, 패턴, 컴포넌트 API 변경 이유를 관련 문서나 PR 설명에 기록 |
| Adoption metric | 중복 컴포넌트 수, 디자인 QA 이슈 수, 접근성 오류 수, 새 화면 구현 시간 |

### 새 컴포넌트 추가 기준

1. 기존 Ant Design 컴포넌트와 CSS 토큰 조합으로 해결 가능한지 확인합니다.
2. 2개 이상 화면에서 같은 UI가 반복되거나, 접근성/상태 처리가 복잡하면 공통 컴포넌트 후보로 봅니다.
3. 공통 컴포넌트로 만들 때는 props, states, 접근성, 모바일 동작, 예시 사용처를 문서화합니다.
4. 기존 패턴을 대체한다면 마이그레이션 범위와 deprecated 시점을 함께 기록합니다.

## 단계별 개선 우선순위

현재 문서와 코드 기준으로 다음 순서를 권장합니다.

1. 현재 UI 감사: 버튼, 입력, 카드, 테이블, 모달, 빈 상태, 오류 상태의 중복을 수집합니다.
2. Foundation 정리: primary/accent/text/background 값을 CSS token, `palette`, 차트 토큰에서 단일 기준으로 맞춥니다.
3. 핵심 컴포넌트 안정화: `Button`, `Text Field`, `Select`, `Modal`, `Toast/Alert`, `Table`, `Card` 사용 기준을 먼저 확정합니다.
4. 사용 가이드 보강: 각 공통 컴포넌트에 용도, variants, states, 접근성, 좋은 예/나쁜 예를 추가합니다.
5. 운영 프로세스 정리: 새 컴포넌트 요청, 리뷰, breaking change, deprecated 규칙을 문서화합니다.

## 현재 개선 후보

- `palette`와 CSS custom property의 primary 색상을 단일 소스로 통합
- `styles.css`가 6,000줄 이상이므로 도메인별 CSS module 또는 layer 분리를 검토
- `TopHeader`는 현재 코드에 존재하지만 `AppShell`에서 사용하지 않으므로 유지 여부 정리
- 반복되는 카드 선택 패턴(`jd-card`, `selection-card`, `mobile-data-card`)을 공통 컴포넌트화할지 검토
- 컴포넌트 성숙도(`Draft`, `Beta`, `Stable`, `Deprecated`)를 공통 문서에 표시할지 검토
- Storybook 또는 유사한 컴포넌트 카탈로그 도입 여부 검토

## 참고 기준

- [NN/g Design Systems 101](https://www.nngroup.com/articles/design-systems-101/)
- [Material Design](https://m3.material.io/)
- [Figma Design Systems](https://www.figma.com/design-systems/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Storybook](https://storybook.js.org/)

## 관련 문서

- [프론트엔드 개요](overview.md)
- [컴포넌트 구조](components.md)
- [스타일과 QA](styling-and-qa.md)
- [페이지와 라우트](pages-and-routes.md)
