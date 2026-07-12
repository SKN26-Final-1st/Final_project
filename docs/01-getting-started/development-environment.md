# 개발 환경

## 요구 런타임

- Python: 운영 배포 스크립트는 EC2에서 `python3.14`로 백엔드 가상환경을 생성합니다. 로컬은 Django 6을 지원하는 Python 런타임을 사용합니다. 근거: `.github/workflows/deploy.yml`
- Node.js: GitHub Actions는 프론트 빌드에 Node.js 20을 사용합니다. 근거: `.github/workflows/deploy.yml`
- 프론트 패키지 매니저: `npm`, lockfile은 `frontend/package-lock.json`입니다.

## 백엔드 의존성

백엔드 의존성은 `backend/requirements.txt`에 있습니다.

주요 패키지:

- `Django`, `gunicorn`, `django-cors-headers`
- `openai`, `pinecone`
- `langchain-core`, `langchain-openai`, `langgraph`
- `mysqlclient`
- `pydantic`, `python-dotenv`, `typing-extensions`
- `celery`, `redis`

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
VITE_API_PROXY_TARGET=http://0.0.0.0
```

주의:

- `VITE_USE_MOCK_API`는 현재 `backendClient.ts`에서 참조하지 않습니다. mock API 모드는 제거되었고, 프론트는 항상 Django API를 호출합니다.
- `VITE_API_PROXY_TARGET`은 Vite 개발 서버의 `/api` 프록시 대상입니다. 설정하지 않으면 `http://127.0.0.1:8000`을 사용합니다. 일반적인 로컬 실행에서는 기본값을 사용하고, 컨테이너나 원격 백엔드에 연결할 때만 덮어씁니다.
- `frontend/.env.example`에 `VITE_API_KEY`가 없으며, `httpClient.ts`도 `VITE_API_KEY`를 읽지 않습니다. `X-API-Key`는 공유 리포트처럼 호출부가 `{ apiKey }`를 명시할 때만 전달됩니다. 근거: `frontend/src/api/httpClient.ts`, `frontend/src/pages/SharedReportPage.tsx`

로컬 개발 시 Vite dev server가 `/api`를 기본적으로 `http://127.0.0.1:8000`으로 프록시하므로 별도 API base URL 설정은 필요 없습니다. 근거: `frontend/vite.config.ts`

### 백엔드

백엔드는 다음 환경 변수를 사용합니다.

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_CSRF_COOKIE_SECURE`
- `DJANGO_SESSION_COOKIE_SECURE`
- `IS_REMOTE_HOST`
- `RDS_HOSTNAME`, `RDS_PORT`, `RDS_USERNAME`, `RDS_PASSWORD`, `RDS_DB_NAME`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`, `PINECONE_HOST`

`IS_REMOTE_HOST`가 설정되면 MySQL/RDS 환경 변수로 DB에 연결하고, 없으면 로컬 SQLite를 사용합니다. `backend/common`의 AI 모듈은 `backend/.env`를 읽습니다. OpenAI 외에 RunPod 경로를 쓰려면 `RUNPOD_API_KEY`, `RUNPOD_MASKING_ENDPOINT_ID`, `RUNPOD_STAR_ENDPOINT_ID`가 필요합니다. 근거: `backend/config/settings.py`, `backend/common/utils.py`, `backend/common/masking.py`, `backend/common/star_analysis.py`

## 관련 문서

- [실행과 운영](run-and-operations.md)
- [배포와 인프라](../09-deployment/deployment.md)
- [프론트엔드 운영·검증 가이드](../../frontend/README.md)
