# 배포와 인프라

## 배포 대상

프로젝트는 프론트엔드와 백엔드를 분리해 EC2에 배포합니다.

- 프론트엔드: GitHub Actions에서 `frontend/dist`를 빌드한 뒤 S3에 업로드하고, SSM으로 프론트 EC2의 `/var/www/app/frontend`에 동기화합니다.
- 백엔드: GitHub Actions에서 `backend/` 소스를 S3에 업로드하고, SSM으로 백엔드 EC2의 `/var/www/app/backend`에 동기화합니다.
- nginx와 systemd 설정은 `.deploy/` 파일을 S3에 올린 뒤 각 EC2에 설치합니다.

근거:

- `.github/workflows/deploy.yml`
- `.deploy/frontend.conf`
- `.deploy/backend.conf`
- `.deploy/gunicorn.service`
- `.deploy/celery.service`

## GitHub Actions

워크플로: `.github/workflows/deploy.yml`

트리거:

- `dev` 브랜치 push
- `workflow_dispatch`

감시 경로:

- `frontend/**`
- `backend/**`
- `.deploy/frontend.conf`
- `.deploy/backend.conf`
- `.deploy/gunicorn.service`
- `.deploy/celery.service`
- `.github/workflows/deploy.yml`

동시성:

- `deploy-${{ github.ref }}` 그룹으로 같은 ref의 이전 배포를 취소합니다.

## 프론트엔드 배포

작업: `deploy-frontend`

순서:

1. checkout
2. Node.js 20 설정
3. `frontend`에서 `npm ci`
4. `frontend`에서 `npm run build`
5. AWS 인증 설정
6. `frontend/dist`를 `s3://${S3_DEPLOY_BUCKET}/frontend/`로 sync
7. `.deploy/frontend.conf`를 `s3://${S3_DEPLOY_BUCKET}/nginx/frontend.conf`로 업로드
8. SSM `AWS-RunShellScript`로 프론트 EC2에 배포 명령 실행
9. SSM 결과 조회 후 성공 여부 확인

프론트 EC2에서 수행하는 주요 작업:

- `/var/www/app/frontend` 생성
- S3의 프론트 빌드 파일을 `/var/www/app/frontend/`로 sync
- nginx 설정을 `/etc/nginx/conf.d/frontend.conf`에 복사
- `nginx -t`
- `systemctl enable nginx`
- `systemctl reload-or-restart nginx`

## 프론트 nginx

`.deploy/frontend.conf`:

- `root /var/www/app/frontend`
- `index index.html`
- `/api/` 요청을 `http://10.0.94.7`의 백엔드로 proxy하고 `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` 헤더를 전달합니다.
- 모든 경로를 `try_files $uri $uri/ /index.html`로 처리해 SPA 라우팅을 지원합니다.

## 백엔드 배포

작업: `deploy-backend`

순서:

1. checkout
2. AWS 인증 설정
3. `backend/`를 `s3://${S3_DEPLOY_BUCKET}/backend/`로 sync
4. `.deploy/backend.conf`를 S3 nginx 경로에 업로드
5. `.deploy/gunicorn.service`, `.deploy/celery.service`를 S3 systemd 경로에 업로드
6. SSM으로 백엔드 EC2에 소스 동기화
7. SSM으로 nginx/systemd 설정 설치
8. EC2에서 Python 가상환경과 `backend/requirements.txt` 설치
9. EC2에서 `python manage.py check`
10. EC2에서 `python manage.py migrate`
11. EC2에서 `python manage.py collectstatic --noinput`
12. Valkey와 Celery 재시작
13. Gunicorn 재시작
14. nginx reload
15. `curl -f http://127.0.0.1/api/ping/` 헬스 체크

백엔드 S3 업로드 제외 항목:

- `.venv/*`
- `__pycache__/*`
- `*.pyc`
- `db.sqlite3`
- `.env`

## 백엔드 nginx

`.deploy/backend.conf`:

- `client_max_body_size 20M`
- 모든 요청을 `http://127.0.0.1:8000`으로 proxy합니다.
- `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` 헤더를 전달합니다.

## Gunicorn

`.deploy/gunicorn.service`:

- systemd service 이름은 배포 중 `/etc/systemd/system/myapp-gunicorn.service`로 설치됩니다.
- `User=ec2-user`, `Group=nginx`
- `WorkingDirectory=/var/www/app/backend`
- `EnvironmentFile=/etc/secrets.env`
- 가상환경 경로: `/var/www/app/backend/.venv/bin`
- 실행 명령: `gunicorn --workers 3 --bind 127.0.0.1:8000 config.wsgi:application`

## Celery와 Valkey

`.deploy/celery.service`:

- systemd service 이름은 배포 중 `/etc/systemd/system/myapp-celery.service`로 설치됩니다.
- `Requires=valkey.service`
- `DJANGO_SETTINGS_MODULE=config.settings`
- `EnvironmentFile=/etc/secrets.env`
- 실행 명령: `celery -A config worker --loglevel=info`

배포 워크플로는 `systemctl enable --now valkey` 후 `myapp-celery`를 재시작하고 활성 상태를 확인합니다.

## 운영 환경 변수

백엔드는 `/etc/secrets.env`를 systemd와 SSM 명령에서 읽습니다.

주요 변수:

- `IS_REMOTE_HOST`
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

- 현재 필수 Vite 환경 변수는 없습니다. API 키는 빌드 시 주입하지 않고, `/shared` 화면에서 사용자 입력값을 요청마다 `{ apiKey }`로 전달합니다.
- `frontend/.env.example`의 `VITE_USE_MOCK_API`는 현재 코드에서 참조하지 않습니다.
- `VITE_API_PROXY_TARGET`은 개발 서버 전용 프록시 설정이며, 운영의 `/api/` 전달은 `.deploy/frontend.conf`가 담당합니다.

## GitHub Secrets

워크플로가 참조하는 secret:

- `AWS_ACCESS_KEY_ID`
- `AWS_ACCESS_KEY`
- `AWS_ACCESS_REGION`
- `S3_DEPLOY_BUCKET`
- `AWS_FRONTEND_INSTANCE_ID`
- `AWS_BACKEND_INSTANCE_ID`

## 관련 문서

- [실행과 운영](../01-getting-started/run-and-operations.md)
- [시스템 아키텍처](../02-architecture/system-architecture.md)
