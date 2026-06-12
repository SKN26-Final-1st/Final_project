# 검색과 저장소

## Pinecone 사용 지점

앱 사용법 RAG 검색은 `backend/common/chat_agent.py`의 `search_app_manual()`에서 수행합니다.

흐름:

1. OpenAI `text-embedding-3-small`로 사용자 검색 쿼리를 임베딩합니다.
2. Pinecone index에 vector query를 보냅니다.
3. namespace는 `user_manual`로 고정되어 있습니다.
4. `top_k=2` 결과의 `metadata.content`를 답변 프롬프트에 넣습니다.

환경 변수:

- `PINECONE_API_KEY`
- `PINECONE_HOST`

## 임베딩 생성

`database/embedding/chunk_embedding.ipynb`:

- 입력: `input.csv`
- 필수 컬럼: `content`, `feature`
- 출력: `result.csv`
- 임베딩 모델: `text-embedding-3-small`
- vector 저장 방식: float32 배열을 base64 BLOB 문자열로 변환

## Pinecone 업로드

`database/embedding/pinecone_uploader.ipynb`:

- 입력: `result.csv`
- 필수 컬럼: `content`, `feature`, `index`, `blob`
- vector id: `{feature}_{index}`
- metadata: `blob`을 제외한 모든 컬럼
- namespace: `PINECONE_NAMESPACE` 또는 기본 `user_manual`
- batch size: 100

## 런타임 검색과 노트북 namespace 차이

런타임 검색은 `backend/common/chat_agent.py`에서 namespace를 `user_manual`로 직접 지정합니다. 업로드 노트북은 `PINECONE_NAMESPACE`를 읽되 기본값이 `user_manual`입니다.

운영에서 namespace를 바꾸려면 런타임 코드와 업로드 노트북 설정을 함께 맞춰야 합니다.

## 관련 문서

- [데이터 수집과 임베딩](../05-database/data-collection-and-embedding.md)
- [문서 검색 채팅](../08-features/document-chat.md)
