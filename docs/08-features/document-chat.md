# 문서 검색 채팅

## 화면 형태

문서 검색 채팅은 두 형태가 있습니다.

1. 전역 플로팅 위젯: `DocumentChatFab`
2. 전체 화면: `/chat`, `ChatPage`

근거:

- `frontend/src/components/chat/DocumentChatFab.tsx`
- `frontend/src/pages/ChatPage.tsx`

## 공유 상태

`App.tsx`의 `DocumentChatProvider`(`frontend/src/hooks/useDocumentChatState.ts`)가 `chatMessages`, `chatInput`, `sendChatMessage()`, `resetChatMessages()`를 관리합니다. `/chat` 화면과 FAB 위젯은 `useDocumentChatState()`로 같은 컨텍스트를 읽으므로 대화 내용이 이어집니다.

채팅 메시지 state는 빈 배열로 시작합니다. `ChatPage`의 "대화 초기화" 버튼이 `resetChatMessages()`를 호출합니다. 근거: `frontend/src/hooks/useDocumentChatState.ts`, `frontend/src/pages/ChatPage.tsx`

UI 안내 문구는 state와 분리되어 있습니다.

- FAB: `DocumentChatFab`가 첫 번째 버블에 고정 intro 문구를 렌더링합니다.
- `/chat`: `ChatWindowPanel`이 메시지가 없을 때 empty state와 `suggestedQuestions`를 표시합니다. 추천 질문은 `ChatPage`가 `jdList` 첫 항목을 기준으로 생성합니다.

`mapAnalysisReport()`의 `chatMessages` 필드는 `AppData.analysisReport` view model에 남아 있지만, `DocumentChatProvider`에는 연결되지 않습니다. 근거: `frontend/src/api/adapters.ts`, `frontend/src/api/appDataService.ts`

## 참조 데이터·추천 패널

FAB와 `/chat` 왼쪽 패널은 `useChatPageData()`로 JD·지원서·리포트·면접 질문 slice를 읽고, `frontend/src/components/chat/chatContextData.tsx`의 `buildChatContextData()`로 추천 자료·빠른 질문을 조합합니다.

FAB의 검색 범위 칩은 `chatScopeOptions` 기준이며 라벨은 `전체`, `JD`, `분석 리포트`, `면접 질문`, `사용 가이드`입니다. `DocumentChatFab` 내부 `scope` state로 필터링합니다. 근거: `frontend/src/components/chat/chatContextData.tsx`, `frontend/src/components/chat/DocumentChatFab.tsx`

## 프론트 전송

`sendChatMessage()`:

1. 빈 메시지를 막습니다.
2. 현재 메시지 목록에 user 메시지를 추가합니다.
3. `apiClient.sendChatMessage(trimmed, nextChatMessages)`를 호출합니다.
4. 응답 메시지를 채팅 목록에 추가합니다.

실제 API 모드에서는 프론트 `assistant` role을 백엔드 `agent` role로 변환합니다. 근거: `frontend/src/api/backendClient.ts`

## 백엔드 처리

엔드포인트: `/api/chat/`

`backend/api/views/chat_endpoints.py`:

- `chat` 배열 형식 검증
- 사용자 또는 API 키로 접근 가능한 JD 목록 조회
- `invoke_graph()` 호출

`backend/common/chat_graph.py`:

- 의도 분류
- HR 데이터 분석 branch
- 앱 매뉴얼 RAG branch
- 최종 요약 branch

`backend/common/chat_agent.py`:

- `FallCaseStructure`: 범위 밖/HR 데이터/앱 매뉴얼 분류
- `ContextExtractorStructure`: 이전 대화 수치/값 추출
- `search_app_manual()`: Pinecone 검색
- `invoke_summary_agent()`: 답변 병합

## QA

문서 검색 FAB는 `frontend/scripts/verify-document-chat-widget.mjs`로 데스크톱/모바일 위치, 추천 패널, 스크롤 모델, 오버플로우를 검증합니다.

## 관련 문서

- [검색과 저장소](../07-ai-modeling/retrieval-and-storage.md)
- [데이터 흐름](../02-architecture/data-flow.md)
