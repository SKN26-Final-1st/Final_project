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

브랜드 색상은 `frontend/src/data/mockData.tsx`의 `palette`를 사용합니다.

## 반응형 규칙

- 데스크톱은 접히는 사이드바와 pin 상태를 지원합니다. 근거: `frontend/src/components/layout/SidebarNav.tsx`, `frontend/src/styles.css`
- 991px 이하에서는 데스크톱 사이드바를 숨기고 모바일 헤더와 Drawer를 사용합니다.
- 데이터 테이블은 데스크톱 Table과 모바일 카드 리스트를 병행합니다. 근거: `ApplicantReviewTable`, `CoverLetterUploadPanel`, `JdSelectionPanel`

## QA 스크립트

`frontend/scripts/verify-document-chat-widget.mjs`는 문서 검색 위젯 전용 시각/동작 QA입니다.

검증 대상:

- 데스크톱 1440x900
- 모바일 390x844
- FAB/위젯 우측 하단 고정
- 추천 패널 표시
- 단일 스크롤 모델
- 가로 오버플로우 없음
- 스크린샷 저장

## 빌드와 lint

`frontend/package.json`:

- `npm run dev`: Vite dev server
- `npm run build`: `tsc --noEmit && vite build`
- `npm run lint`: ESLint
- `npm run preview`: Vite preview

## 관련 문서

- [디자인 시스템](design-system.md)
- [실행과 운영](../01-getting-started/run-and-operations.md)
