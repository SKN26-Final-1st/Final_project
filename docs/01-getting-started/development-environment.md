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
- Zod

주요 개발·테스트 패키지:

- Vitest, `@vitest/coverage-v8`, jsdom
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- MSW
- `@playwright/test`, `@axe-core/playwright`, `playwright-core`

## 환경 변수

### 프론트엔드

`frontend/.env.example`:

```env
VITE_USE_MOCK_API=true
VITE_API_KEY=
```

주의: `VITE_USE_MOCK_API`는 현재 `backendClient.ts`에서 참조하지 않습니다. mock API 모드는 제거되었고, 프론트는 항상 Django API를 호출합니다.

실제로 사용되는 변수:

- `VITE_API_KEY`: 설정 시 Axios 요청에 `X-API-Key` 헤더를 붙입니다. 공유 리포트·비로그인 API 접근 테스트에 사용합니다. 근거: `frontend/src/api/backendClient.ts`

로컬 개발 시 Vite dev server가 `/api`를 `http://127.0.0.1:8000`으로 프록시하므로 별도 API base URL 설정은 필요 없습니다. 근거: `frontend/vite.config.ts`

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
- [프론트엔드 API 연동 README](../../frontend/README.md)
