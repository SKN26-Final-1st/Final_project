# 백엔드 모듈

## Django 설정

`backend/config/settings.py`:

- `AUTH_USER_MODEL = "api.Account"`로 커스텀 유저 모델을 사용합니다.
- `RDS_HOSTNAME`이 있으면 MySQL, 없으면 SQLite를 사용합니다.
- `corsheaders`를 설치 앱과 middleware에 포함합니다.
- 로컬 기본 CORS/CSRF origin은 `http://localhost:5173`, `http://127.0.0.1:5173`입니다.
- `STATIC_ROOT = BASE_DIR / "staticfiles"`입니다.

`backend/config/urls.py`:

- `/admin/`
- `/api/`

## API 앱

`backend/api/models.py`:

- `Account`: Django `AbstractUser` 기반 계정
- `CompanyInfo`: 계정당 하나의 회사 정보
- `AuthKey`: API 키와 허용 이력서 목록
- `JobDescription`: 채용공고/JD
- `Resume`: 지원서
- `AnalysisReport`: 지원서별 분석 리포트
- `InterviewQuestion`: 지원서별 면접 질문

각 모델은 프론트 응답용 `to_dict()`를 제공합니다.

`backend/api/views.py`:

- 모든 주요 API를 함수 기반 view로 처리합니다.
- 대부분 POST만 허용합니다.
- 세션 인증과 `X-API-Key` 기반 접근을 혼합해 지원합니다.
- `resume_analize`와 `chat`은 async view입니다.

`backend/api/columns.py`:

- add/modify 시 차단 필드와 허용 필드를 중앙 관리합니다.
- 예: 계정 `id`, `username`, `account_hash`는 수정 금지입니다.

`backend/api/error_code.py`:

- 숫자 코드별 표준 메시지를 제공합니다.
- 로컬 환경에서는 상세 메시지를 붙이고, RDS 환경에서는 표준 메시지만 반환합니다.

## Common 모듈

`backend/common/report.py`:

- OpenAI 클라이언트 생성
- 지원서/회사/JD 요약
- 체크리스트 생성
- 지원서 적합성 판정
- 면접 질문 생성
- 최종 리포트 생성
- 운영 API(`resume_analize`)가 import하는 유일한 리포트 모듈

`backend/common/report2.py`, `backend/common/report3.py`:

- `report.py`와 같은 public 함수 시그니처(`invoke`, `sum_resume` 등)를 유지한 프롬프트/후처리 실험 버전
- API view에는 연결되지 않음
- `report3.py`는 `make_report()`에서 체크리스트 충족 개수로 등급을 코드로 계산한 뒤 LLM 출력과 동기화

`backend/common/eval/`:

- `middle_report_eval.ipynb`, `middle_report2_eval.ipynb`, `middle_report3_eval.ipynb`: 리포트 파이프라인 버전별 평가
- `chat_eval.ipynb`: 채팅 파이프라인 평가
- `goldset_mock_data_fixed.csv`: 리포트 평가 골드셋

`backend/common/chat_agent.py`:

- LangChain `ChatOpenAI`
- 질문 의도 분류
- 이전 대화 수치/맥락 추출
- HR 데이터 분석 답변
- Pinecone 기반 앱 사용법 RAG 검색
- 최종 답변 병합

`backend/common/chat_graph.py`:

- LangGraph `StateGraph`
- 질문 분류 후 HR 분석과 앱 매뉴얼 RAG를 조건부 fan-out
- summary node에서 응답 병합
- CLI 테스트 실행 지원

`backend/common/utils.py`:

- 현재는 모델 import 편의 모듈입니다.

## 마이그레이션

`backend/api/migrations/0001_squashed_0008_initial.py`가 기존 0001-0008을 squash합니다. 개별 migration 파일도 남아 있으므로 새 환경에서는 Django migration 상태를 확인해야 합니다.

주요 변경:

- `Account.account_hash` 추가
- `AuthKey.name`, `AuthKey.credit_limit`, 고유 `value` 추가
- 기존 `Block` 모델 삭제 이력

근거: `backend/api/migrations/0008_account_hash_authkey_fields.py`

## 관련 문서

- [인증과 권한](auth-and-permissions.md)
- [분석 파이프라인](analysis-pipeline.md)
