# 배포와 인프라

## 배포 대상

프로젝트는 React 정적 빌드와 Django/gunicorn 백엔드를 같은 Elastic Beanstalk 애플리케이션 패키지로 배포하도록 구성되어 있습니다.

근거:

- `.github/workflows/deploy-eb.yml`
- `Procfile`
- `.platform/nginx/conf.d/elasticbeanstalk/00_application.conf`

## Procfile

`Procfile`:

```Procfile
web: cd backend && gunicorn config.wsgi:application --bind 127.0.0.1:8000
```

gunicorn은 Django WSGI 앱을 `127.0.0.1:8000`에서 실행합니다.

## nginx 라우팅

`.platform/nginx/conf.d/elasticbeanstalk/00_application.conf`:

- `/api/` -> `http://127.0.0.1:8000/api/`
- `/admin/` -> `http://127.0.0.1:8000/admin/`
- `/static/` -> `/var/app/current/backend/staticfiles/`
- `/`와 나머지 경로 -> `frontend/dist` SPA

## Elastic Beanstalk hooks

`.platform/hooks/prebuild/01_mysqlclient_deps.sh`:

- `gcc`, `pkgconf-pkg-config`, `mariadb105-devel` 설치
- `mysqlclient` 빌드 의존성입니다.

`.platform/hooks/predeploy/01_collectstatic.sh`:

- EB 가상환경 Python을 찾아 `python manage.py collectstatic --noinput` 실행

`.platform/hooks/predeploy/02_migrate.sh`:

- EB 가상환경 Python을 찾아 `python manage.py migrate --noinput` 실행

## GitHub Actions

`.github/workflows/deploy-eb.yml`:

트리거:

- `dev` 브랜치 push
- `workflow_dispatch`

작업 순서:

1. checkout
2. Python 3.12 설정
3. Node.js 20 설정
4. 백엔드 의존성 설치
5. `python manage.py check`
6. `python manage.py test`
7. 프론트 `npm ci`
8. 프론트 `npm run build`
9. zip 패키지 생성
10. `einaregilsson/beanstalk-deploy@v22`로 EB 배포

필요한 GitHub Secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EB_APP_NAME`
- `EB_ENV_NAME`

리전:

- `ap-northeast-2`

## 운영 환경 변수

백엔드:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `DJANGO_CSRF_COOKIE_SECURE`
- `DJANGO_SESSION_COOKIE_SECURE`
- `RDS_HOSTNAME`, `RDS_PORT`, `RDS_USERNAME`, `RDS_PASSWORD`, `RDS_DB_NAME`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`, `PINECONE_HOST`

프론트 빌드:

- `VITE_USE_MOCK_API`
- `VITE_API_KEY`

주의: Vite 환경 변수는 빌드 시점에 주입됩니다.

## 패키지 제외

배포 zip 생성 시 다음이 제외됩니다.

- `.git`, `.github`
- 가상환경
- `frontend/node_modules`
- Python 캐시와 pyc
- `backend/db.sqlite3`
- `backend/staticfiles`
- `frontend/.env.local`
- `.elasticbeanstalk`

근거: `.github/workflows/deploy-eb.yml`

## 관련 문서

- [실행과 운영](../01-getting-started/run-and-operations.md)
- [시스템 아키텍처](../02-architecture/system-architecture.md)
