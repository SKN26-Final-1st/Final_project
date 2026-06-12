# 개발 환경

## 요구 런타임

- Python: GitHub Actions는 Python 3.12를 사용합니다. 근거: `.github/workflows/deploy-eb.yml`
- Node.js: GitHub Actions는 Node.js 20을 사용합니다. 근거: `.github/workflows/deploy-eb.yml`
- 프론트 패키지 매니저: `npm`, lockfile은 `frontend/package-lock.json`입니다.

## 백엔드 의존성

백엔드 의존성은 `backend/requirements.txt`에 있습니다.

주요 패키지:

- `Django`, `gunicorn`, `django-cors-headers`
- `openai`, `pinecone`
- `langchain-core`, `langchain-openai`, `langgraph`
- `mysqlclient`
- `pydantic`, `python-dotenv`, `typing-extensions`

루트 `requirements.txt`는 `-r backend/requirements.txt`만 참조합니다.

## 프론트엔드 의존성

프론트 설정은 `frontend/package.json`, `frontend/tsconfig.json`, `frontend/eslint.config.js`, `frontend/vite.config.ts`에 있습니다.

주요 런타임 패키지:

- React 19
- React Router 7
- Ant Design 6
- Ant Design X
- TanStack Query
- Axios
- ECharts

## 환경 변수

### 프론트엔드

`frontend/.env.example`:

```env
VITE_USE_MOCK_API=true
VITE_API_KEY=
```

- `VITE_USE_MOCK_API=false`로 설정해야 실제 Django API 호출을 사용합니다.
- `VITE_API_KEY`가 있으면 Axios 요청에 `X-API-Key` 헤더를 붙입니다. 근거: `frontend/src/api/backendClient.ts`

### 백엔드

백엔드는 다음 환경 변수를 사용합니다.

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_CSRF_COOKIE_SECURE`
- `DJANGO_SESSION_COOKIE_SECURE`
- `RDS_HOSTNAME`, `RDS_PORT`, `RDS_USERNAME`, `RDS_PASSWORD`, `RDS_DB_NAME`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`, `PINECONE_HOST`

`RDS_HOSTNAME`이 없으면 로컬 SQLite를 사용하고, `backend/common`의 AI 모듈은 `backend/.env`를 읽습니다. 근거: `backend/config/settings.py`, `backend/common/report.py`, `backend/common/chat_agent.py`

## 관련 문서

- [실행과 운영](run-and-operations.md)
- [배포와 인프라](../09-deployment/deployment.md)
