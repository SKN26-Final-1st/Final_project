# 데이터 수집과 임베딩

이 폴더는 Django 런타임 DB 마이그레이션이 아니라, 채용 조건 데이터와 앱 사용법 RAG용 임베딩을 준비하는 보조 작업입니다.

## 채용공고 크롤러

위치: `database/crawling/`

사이트별 스크립트:

| 파일 | 사이트 | 입력 방식 |
| --- | --- | --- |
| `catch_scraper.py` | Catch | API와 HTML/JSON-LD |
| `jobkorea_scraper.py` | JobKorea | 리스트 HTML과 JSON-LD |
| `jobplanet_scraper.py` | Jobplanet | React Query payload |
| `jumpit_scraper.py` | Jumpit | Saramin Jumpit API |
| `linkareer_scraper.py` | Linkareer | GraphQL과 Next.js `__NEXT_DATA__` |
| `okky_scraper.py` | OKKY Jobs | OKKY API와 HTML section parsing |
| `rallit_scraper.py` | Rallit | 고정 URL 목록과 Next.js `__NEXT_DATA__` |
| `wanted_scraper.py` | Wanted | Wanted API |

## 공통 출력

각 크롤러는 동일한 `ConditionRow` 구조를 CSV로 저장합니다.

필드:

- `site`
- `company`
- `position_id`
- `title`
- `url`
- `condition_type`: `qualification` 또는 `preferred`
- `item_order`
- `condition`

출력 파일:

- `job_conditions.csv`
- `qualification_requiremnets.csv`
- `job_preferred_conditions.csv`

주의: `qualification_requiremnets.csv`는 코드상 오타가 포함된 실제 파일명입니다. 근거: `database/crawling/*_scraper.py`

## 직무명 정규화

각 크롤러는 사이트별 title/category/skill 텍스트를 기반으로 다음 계열로 정규화합니다.

- 프론트엔드 개발자
- 백엔드 개발자
- 풀스택 개발자
- 모바일 앱 개발자
- DevOps 엔지니어 / 인프라 엔지니어
- 데이터 엔지니어 / 데이터 분석가
- AI 엔지니어 / 머신러닝 엔지니어
- QA 엔지니어 / 테스트 엔지니어
- 보안 엔지니어
- 게임/그래픽스 개발자

정규화 규칙은 각 파일의 `normalize_title()`에 중복 구현되어 있습니다.

## 임베딩 노트북

위치: `database/embedding/`

### `chunk_embedding.ipynb`

역할:

1. `input.csv` 로드
2. 필수 컬럼 `content`, `feature` 확인
3. 텍스트 정규화
4. 문자 기준 청킹
5. `text-embedding-3-small`로 임베딩 생성
6. float32 벡터를 base64 BLOB로 저장
7. `result.csv` 출력

주요 설정:

- `CHUNK_SIZE = 1000`
- `CHUNK_OVERLAP = 120`
- `EMBEDDING_BATCH_SIZE = 100`

### `pinecone_uploader.ipynb`

역할:

1. `result.csv` 로드
2. 필수 컬럼 `content`, `feature`, `index`, `blob` 확인
3. base64 BLOB를 float32 벡터로 복원
4. vector id를 `{feature}_{index}`로 생성
5. metadata에 BLOB 외 모든 컬럼 저장
6. Pinecone index에 batch upsert

환경 변수:

- `PINECONE_API_KEY`
- `PINECONE_HOST`
- `PINECONE_NAMESPACE`, 기본값 `user_manual`

## 런타임과의 연결

채팅의 앱 사용법 RAG는 `backend/common/chat_agent.py`에서 Pinecone namespace `user_manual`을 검색합니다. 임베딩 노트북이 만드는 metadata의 `content`가 답변 근거 문서로 사용됩니다.

## 관련 문서

- [검색과 저장소](../07-ai-modeling/retrieval-and-storage.md)
- [문서 검색 채팅](../08-features/document-chat.md)
