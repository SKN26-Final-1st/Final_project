# 디자인 시스템

이 문서는 현재 웹 UI를 분석해 정리한 HumouR 프론트엔드 디자인 시스템 초안입니다. 실제 스타일 구현은 `frontend/src/styles.css`, Ant Design 테마 연결은 `frontend/src/App.tsx`, 브랜드/차트 팔레트 일부는 `frontend/src/data/mockData.tsx`와 `frontend/src/components/charts/chartTheme.ts`에 있습니다.

## 디자인 방향

HumouR UI는 채용 운영자가 반복적으로 확인하고 조작하는 B2B 운영 도구입니다. 따라서 첫 화면과 주요 기능은 장식적인 랜딩 페이지보다 다음 기준을 우선합니다.

- 정보를 빠르게 스캔할 수 있는 카드, 표, 메트릭 중심 구성
- 페이지마다 일관된 제목 영역, 액션 버튼, 섹션 카드 구조
- 파란색 primary와 청록색 accent를 중심으로 한 신뢰감 있는 SaaS 톤
- light/dark mode 모두 지원하는 토큰 기반 색상
- 데스크톱에서는 사이드바 탐색, 모바일에서는 상단 헤더와 Drawer 탐색
- 문서 검색 AI는 전역 FAB와 `/chat` 전체 화면을 병행

## 디자인 토큰

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

주의: `frontend/src/data/mockData.tsx`의 `palette.primary`는 `#2563EB`이고 CSS의 `--primary`는 `#2f73f6`입니다. 차트와 Ant Design token은 `palette`를 함께 참조하므로, 추후 색상 정리 시 단일 소스가 필요합니다.

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

인증 라우트(`/login`, `/signup`, `/password-reset`)는 `AuthScreen`을 사용하고 앱 shell을 쓰지 않습니다. 좌측 설명 영역과 우측 카드 폼의 2열 구성이며, 1199px 이하에서는 1열로 전환됩니다. 근거: `frontend/src/components/layout/AuthScreen.tsx`, `frontend/src/pages/AuthPages.tsx`

## 컴포넌트 규칙

### 버튼

Ant Design `Button`을 기본으로 사용합니다. 근거: `frontend/src/App.tsx`, `frontend/src/styles.css`

- 주요 실행: `type="primary"`와 아이콘을 함께 사용
- 보조 실행: default button
- 보조 탐색/상세 보기: `type="link"`
- 원형 도구 버튼: `shape="circle"`과 아이콘 사용
- disabled 상태는 opacity 0.6, shadow 제거
- hover는 translateY 또는 primary strong 색상으로 가볍게 반응

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
- 긴 액션 버튼은 모바일에서 full width grid로 전환
- 비밀번호 찾기처럼 단계가 있는 흐름은 `Steps size="small"` 사용

근거: `frontend/src/pages/AuthPages.tsx`, `frontend/src/components/company/CompanyProfileForm.tsx`, `frontend/src/components/jd/JdEditorPanel.tsx`

### 데이터 표시

- 데스크톱 표: Ant Design `Table` + `desktop-data-table`
- 모바일 표 대체: 카드 리스트 + `mobile-data-list`
- 적합도/사용량: `Progress`
- 상태: `Tag` 또는 `statusTag()`
- 핵심 수치: `Statistic`, metric card, hero stat

상태 색상 매핑은 `frontend/src/utils/statusTag.tsx`에 있습니다.

### 차트

도넛 차트는 ECharts SVG renderer를 사용합니다. 근거: `frontend/src/components/charts/DonutChart.tsx`, `frontend/src/components/charts/chartAdapters.ts`, `frontend/src/components/charts/chartTheme.ts`

- primary/accent/warning/track 4개 키를 사용
- legend는 숨기고, 중앙 text graphic으로 핵심 수치를 표시
- tooltip은 light/dark theme token을 따릅니다.

## 주요 화면별 패턴

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

## 반응형 기준

| Breakpoint | 역할 |
| --- | --- |
| `1399px` 이하 | 대시보드 hero 3열을 2열/summary full row로 완화 |
| `1199px` 이하 | layout gap 22px, 주요 grid 1열/2열 전환 |
| `991px` 이하 | 데스크톱 sidebar 제거, 모바일 header/drawer 활성화 |
| `767px` 이하 | page title/card/input/action을 모바일 밀도로 축소, table을 card list로 대체 |
| `420px` 이하 | 가장 작은 모바일에서 gap 14px, 로고/hero/widget 크기 추가 축소 |

모션 민감도는 `prefers-reduced-motion: reduce`에서 transition/animation 시간을 거의 제거합니다.

## 접근성과 인터랙션

- 탐색 항목은 `aria-current`, `aria-label`을 사용합니다.
- 채팅 위젯은 `role="dialog"`, 추천 패널은 `aria-expanded`/`aria-controls`를 사용합니다.
- 아이콘만 있는 버튼은 `aria-label`을 둡니다.
- hover/focus-visible 스타일을 함께 정의해 키보드 탐색을 고려합니다.
- 모바일 Drawer와 Popover는 `.app-root`를 popup container로 사용해 theme context를 유지합니다.

## 새 UI 작성 체크리스트

- 새 보호 화면은 `PageTitle`로 시작하고, 주요 업무 단위는 `SectionCard`로 나눈다.
- 색상은 CSS custom property 또는 Ant Design theme token을 우선 사용한다.
- primary는 실행/활성, accent는 보조 강조, warning/danger는 상태 의미에만 사용한다.
- 데스크톱 table을 만들면 767px 이하의 card list 대체 UI도 함께 고려한다.
- 버튼에는 가능한 한 Ant Design icon을 함께 붙이고, icon-only button에는 `aria-label`을 넣는다.
- 카드 반경, gap, shadow는 `--radius`, `--radius-lg`, `--layout-gap`, `--shadow-*`를 우선 사용한다.
- light/dark mode에서 새 배경, border, chart 색상이 모두 읽히는지 확인한다.
- motion이 필요한 경우 `prefers-reduced-motion` 아래에서 안전하게 줄어드는지 확인한다.

## 현재 개선 후보

- `palette`와 CSS custom property의 primary 색상을 단일 소스로 통합
- `styles.css`가 4,000줄을 넘으므로 도메인별 CSS module 또는 layer 분리를 검토
- `TopHeader`는 현재 코드에 존재하지만 `AppShell`에서 사용하지 않으므로 유지 여부 정리
- 반복되는 카드 선택 패턴(`jd-card`, `selection-card`, `mobile-data-card`)을 공통 컴포넌트화할지 검토

## 관련 문서

- [프론트엔드 개요](overview.md)
- [컴포넌트 구조](components.md)
- [스타일과 QA](styling-and-qa.md)
- [페이지와 라우트](pages-and-routes.md)
