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

## 앱 진입점

- `frontend/src/main.tsx`: React root 생성, `AppQueryProvider`, `BrowserRouter`, `App` 연결
- `frontend/src/providers/AppQueryProvider.tsx`: TanStack Query `QueryClientProvider`
- `frontend/src/api/queryClient.ts`: query 기본 옵션 설정
- `frontend/src/App.tsx`: 라우트별 페이지 렌더링, 테마, 알림, 로딩 상태, 채팅 상태, 선택 JD 상태, 인증 가드

## 테마와 UI 시스템

`App.tsx`는 Ant Design `XProvider`와 `AntApp`을 사용하고, light/dark 모드를 Ant Design token과 CSS `data-theme`로 반영합니다.

공통 스타일은 `frontend/src/styles.css`에 있습니다. 주요 영역:

- 앱 쉘과 사이드바
- 모바일 헤더/드로어
- 대시보드 히어로와 카드
- 관리자 화면
- JD/지원서/공고 테이블
- 문서 검색 FAB와 채팅 위젯
- 인증 화면
- 반응형 미디어쿼리와 reduced motion 처리

## 데이터 소스

프론트는 Django API를 직접 호출합니다. mock API 모드는 제거되었습니다.

- API 클라이언트: `frontend/src/api/backendClient.ts` — Axios, CSRF, credentials, `X-API-Key`
- 타입 정의: `frontend/src/data/backendTypes.ts` — Django `to_dict()` 응답 shape
- 라우트/메뉴/팔레트: `frontend/src/data/appConfig.tsx`
- 화면 표시 모델 변환: `frontend/src/api/adapters.ts`
- 전체 앱 데이터 조립: `frontend/src/api/appDataService.ts`
- dev server 프록시: `frontend/vite.config.ts` — `/api` → `http://127.0.0.1:8000`

로컬 개발 시 백엔드를 `127.0.0.1:8000`에서 실행해야 프론트가 데이터를 불러올 수 있습니다.

## 관련 문서

- [상태와 API 어댑터](state-and-api-adapters.md)
- [페이지와 라우트](pages-and-routes.md)
- [프론트엔드 API 연동 README](../../frontend/README.md)
