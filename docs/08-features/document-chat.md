# 문서 검색 채팅

## 화면 형태

문서 검색 채팅은 두 형태가 있습니다.

1. 전역 플로팅 위젯: `DocumentChatFab`
2. 전체 화면: `/chat`, `ChatPage`

근거:

- `frontend/src/components/chat/DocumentChatFab.tsx`
- `frontend/src/pages/ChatPage.tsx`

## 공유 상태

`frontend/src/App.tsx`가 `chatMessages`, `chatInput`, `sendChatMessage()`를 관리합니다. `/chat` 화면과 FAB 위젯은 같은 상태를 받으므로 대화 내용이 이어집니다.

위젯 내부의 검색 범위 칩(`전체 문서`, `회사 정책`, `JD`, `분석 리포트`)은 `DocumentChatFab` 내부 state입니다.

## 프론트 전송

`sendChatMessage()`:

1. 빈 메시지를 막습니다.
2. 현재 메시지 목록에 user 메시지를 추가합니다.
3. `apiClient.sendChatMessage(trimmed, nextChatMessages)`를 호출합니다.
4. 응답 메시지를 채팅 목록에 추가합니다.

실제 API 모드에서는 프론트 `assistant` role을 백엔드 `agent` role로 변환합니다. 근거: `frontend/src/api/backendClient.ts`

## 백엔드 처리

엔드포인트: `/api/chat/`

`backend/api/views.py`:

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

## Mock 모드

기본 mock 모드에서는 실제 `/api/chat/`를 호출하지 않고, 질문 문자열을 포함한 정적 안내 응답을 반환합니다. 근거: `frontend/src/api/backendClient.ts`

## QA

문서 검색 FAB는 `frontend/scripts/verify-document-chat-widget.mjs`로 데스크톱/모바일 위치, 추천 패널, 스크롤 모델, 오버플로우를 검증합니다.

## 관련 문서

- [검색과 저장소](../07-ai-modeling/retrieval-and-storage.md)
- [데이터 흐름](../02-architecture/data-flow.md)
