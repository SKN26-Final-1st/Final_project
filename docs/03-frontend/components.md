# 컴포넌트 구조

## 레이아웃

- `frontend/src/components/layout/AppShell.tsx`: 보호 화면 공통 shell
- `frontend/src/components/layout/SidebarNav.tsx`: 데스크톱 사이드바, 브랜드, 핀 고정, 계정 popover
- `frontend/src/components/layout/MobileShellHeader.tsx`: 모바일 헤더, Drawer 메뉴, 계정 popover (`SidebarNav.tsx`에서 re-export)
- `frontend/src/components/layout/MenuItems.tsx`: `activeMainMenu` 기반 nav 항목
- `frontend/src/components/layout/navigationTypes.ts`, `navigationUtils.ts`: 네비게이션 공통 타입·유틸
- `frontend/src/components/layout/AccountMenu.tsx`: 계정 popover 내부(크레딧, 테마, 마이페이지, 로그아웃)
- `frontend/src/components/layout/AuthScreen.tsx`: 인증 화면 전용 레이아웃
- `frontend/src/components/layout/CreditSummary.tsx`: 분석 크레딧 카드
- `frontend/src/components/layout/TopHeader.tsx`: 현재 코드에 존재하지만 `AppShell`에서는 직접 사용하지 않습니다.

## 공통 UI

- `frontend/src/components/common/PageTitle.tsx`: 페이지 상단 제목과 액션
- `frontend/src/components/common/SectionCard.tsx`: Ant Design Card 래퍼
- `frontend/src/components/common/PageState.tsx`: 로딩, 에러, empty 상태
- `frontend/src/components/common/InlineLoading.tsx`: 버튼 내부 spinner
- `frontend/src/components/common/MetricCard.tsx`: 대시보드 지표 카드
- `frontend/src/components/common/FloatingAlert.tsx`: 전역 알림 토스트

## 대시보드

- `DashboardHero`: 주요 액션, 핵심 지표, 크레딧 요약
- `DashboardMetrics`: metric grid
- `ApplicantReviewTable`: 데스크톱 Table과 모바일 card list
- `AnalysisSummaryPanel`: 도넛 차트와 insight list
- `TaskListPanel`: 오늘의 작업 목록

근거: `frontend/src/components/dashboard/`

## 차트

- `DonutChart`: `AnalysisSummary`를 ECharts option으로 변환
- `EChart`: `echarts.init`, `ResizeObserver`, `setOption`, dispose 처리
- `chartAdapters`: 도넛 차트 option 생성
- `chartTheme`: light/dark 차트 토큰

근거: `frontend/src/components/charts/`

## 채팅

- `ChatWindowPanel`: Ant Design X `Bubble.List`, `Sender` 기반 채팅 창
- `DocumentChatFab`: 전역 플로팅 문서 검색 위젯
- `DocumentSearchContextPanel`: `/chat` 왼쪽 검색 컨텍스트/추천 질문
- `chatContextData.tsx`: JD·지원서·리포트·면접 질문 기반 추천 자료·빠른 질문·범위 칩 데이터 조합
- `ReportContextPanel`: 리포트 탭과 예시 질문 패널. 현재 `ChatPage`에는 직접 연결되어 있지 않습니다.

근거: `frontend/src/components/chat/`

## 도메인 패널

- 회사: `CompanyProfileForm`, `CompanyCompletionPanel`
- JD: `JdListPanel`, `JdEditorPanel`, `JdDeleteModal`, `JdListEmptyState`
- 관리자: `AdminSummaryCards`, `AdminCreditPanel`, `AuthKeyCreateForm`, `AuthKeyList`, `AuthKeyDeleteModal`, `CreatedAuthKeyPanel`, `UnsupportedBackendPanel`, `authKeyUtils.ts`
- 지원서: `CoverLetterInputPanel`, `CoverLetterUploadPanel`(목록 선택·삭제 트리거), `CoverLetterDeleteModal`
- 마이페이지: `ProfileSummaryCard`, `AccountSettingsForm`, `SecuritySettingsForm`, `CompanySummaryPanel`
- 모집 공고: `JdSelectionPanel`, `SelectedJdSummary`, `RecruitmentPreviewPanel`

## 관련 문서

- [페이지와 라우트](pages-and-routes.md)
- [스타일과 QA](styling-and-qa.md)
