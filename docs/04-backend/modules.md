# 백엔드 모듈

## Django 설정

`backend/config/settings.py`:

- `AUTH_USER_MODEL = "api.Account"`로 커스텀 유저 모델을 사용합니다.
- `IS_REMOTE_HOST`가 있으면 MySQL/RDS 환경 변수로 DB에 연결하고, 없으면 SQLite를 사용합니다.
- `corsheaders`를 설치 앱과 middleware에 포함합니다.
- 로컬 기본 CORS/CSRF origin은 `http://localhost:5173`, `http://127.0.0.1:5173`입니다.
- `STATIC_ROOT = BASE_DIR / "staticfiles"`입니다.
- Celery broker/result backend는 로컬 `redis://127.0.0.1:6379`를 사용합니다.

`backend/config/urls.py`:

- `/admin/`
- `/api/`

## API 앱

`backend/api/models.py`:

- `Account`: Django `AbstractUser` 기반 계정
- `CompanyInfo`: 계정당 하나의 회사 정보
- `AuthKey`: API 키와 허용 이력서 목록
- `JobDescription`: 채용공고/JD
- `Checklist`: JD별 수동 체크리스트 항목
- `Resume`: 지원서
- `AnalysisReport`: 지원서별 분석 리포트 (`interview_question` JSON 필드에 면접 질문 포함)

각 모델은 프론트 응답용 `to_dict()`를 제공합니다.

`backend/api/views/`:

- 도메인별 endpoint 모듈로 분리되어 있습니다. `__init__.py`가 `urls.py`와 호환되도록 view 함수를 re-export합니다.
- 파일 예: `account_endpoints.py`, `resume_endpoints.py`, `checklist_endpoints.py`, `analysis_report_endpoints.py`
- 대부분 POST만 허용합니다.
- 세션 인증과 `X-API-Key` 기반 접근을 혼합해 지원합니다.
- `resume_analyze`와 `chat`은 async view입니다.

`backend/api/views/columns.py`:

- add/modify 시 차단 필드와 허용 필드를 중앙 관리합니다.
- 예: 계정 `id`, `username`, `account_hash`는 수정 금지입니다.

`backend/api/views/error_code.py`:

- 숫자 코드별 표준 메시지를 제공합니다.
- 로컬 환경에서는 상세 메시지를 붙이고, RDS 환경에서는 표준 메시지만 반환합니다.

## Common 모듈

`backend/common/analysis_graph.py`, `analysis_agent.py`:

- 입력 마스킹과 자기소개서 STAR 구조화
- 체크리스트 적합성 판정
- 면접 질문과 최종 리포트 생성
- `feedback_graph.py`를 통한 생성 결과 평가·보정

`backend/api/tasks.py`:

- Celery worker 가용성 확인
- `AnalysisReport.status`를 `processing`/`done`으로 전환
- `CompanyInfo`, `JobDescription`, `Resume`, `Checklist`를 읽어 `analysis_graph.invoke()`에 전달
- 분석 실패 시 차감한 계정/API 키 크레딧 환불
- Celery worker가 없을 때 `resume_analyze`의 동기 fallback으로도 사용

`llm/eval/`:

- `middle_report_eval.ipynb`, `middle_report2_eval.ipynb`, `middle_report3_eval.ipynb`: 리포트 파이프라인 평가 노트북
- `chat_eval.ipynb`: 채팅 파이프라인 평가
- `masking_quality_eval.ipynb`, `star_eval.ipynb`: 마스킹·STAR 품질 평가

`backend/common/chat_agent.py`:

- LangChain `ChatOpenAI`
- 질문 의도 분류
- 이전 대화 수치/맥락 추출
- 구조화된 필터로 권한 범위의 채용 데이터를 조회하는 `search_recruiting_data` tool과 HR 분석 답변
- Pinecone 기반 앱 사용법 RAG 검색
- 최종 답변 병합

`backend/common/chat_graph.py`:

- LangGraph `StateGraph`
- 질문 분류 후 HR 분석과 앱 매뉴얼 RAG를 조건부 fan-out
- summary node에서 응답 병합
- CLI 테스트 실행 지원

`backend/common/utils.py`:

- `backend/.env`를 찾아 로드합니다.
- 중첩된 dict/list/string에 마스킹 토큰을 적용하고 원문으로 복원합니다.

## 마이그레이션

현재 tracked migration은 다음 다섯 개입니다.

- `0001_initial.py`: `Account`, `CompanyInfo`, `AuthKey`, `JobDescription`, `Checklist`, `Resume`, `AnalysisReport` 초기 생성
- `0002_analysisreport_status.py`: `AnalysisReport.status`, `AnalysisReport.created_at` 추가, `Resume.status` 제거
- `0003_analysisreport_version_user_feedback.py`: 리포트 `version`, `user_feedback` 추가
- `0004_analysisreport_review_text_and_more.py`: `review_text` 추가, 리포트 상태 선택지에 `fail` 반영
- `0005_jobdescription_checklist_status.py`: JD 체크리스트 생성 상태 필드 추가

근거: `backend/api/migrations/0001_initial.py`부터 `0005_jobdescription_checklist_status.py`

## 관련 문서

- [인증과 권한](auth-and-permissions.md)
- [분석 파이프라인](analysis-pipeline.md)
