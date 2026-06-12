# 실행과 운영

## 백엔드 실행

백엔드 진입점은 `backend/manage.py`입니다.

일반적인 로컬 실행 순서:

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

로컬 DB는 `RDS_HOSTNAME`이 없을 때 `backend/db.sqlite3`를 사용합니다. 근거: `backend/config/settings.py`

## 프론트엔드 실행

프론트는 `frontend/package.json` 스크립트를 사용합니다.

```bash
cd frontend
npm ci
npm run dev
```

`dev` 스크립트는 `vite --host 127.0.0.1`입니다.

## 실제 API 연동 모드

프론트는 기본적으로 mock API를 사용합니다. 실제 Django API를 쓰려면 `frontend/.env`에 다음 값을 둡니다.

```env
VITE_USE_MOCK_API=false
```

필요하면 외부 API 키 접근 테스트를 위해 `VITE_API_KEY`도 설정합니다. 이 값은 `X-API-Key` 헤더로 전달됩니다. 근거: `frontend/src/api/backendClient.ts`

## 검사 명령

프론트:

```bash
cd frontend
npm run lint
npm run build
```

백엔드:

```bash
cd backend
python manage.py check
python manage.py test
```

GitHub Actions도 같은 성격의 검사를 수행합니다. 근거: `.github/workflows/deploy-eb.yml`

## 문서 검색 위젯 QA 스크립트

`frontend/scripts/verify-document-chat-widget.mjs`는 Vite dev server를 띄운 뒤 Playwright Core와 로컬 Chrome/Edge 실행 파일로 데스크톱/모바일 문서 검색 위젯을 검증합니다.

검증 내용:

- 가로 오버플로우 없음
- FAB과 위젯이 우측 하단에 고정됨
- 추천 패널 표시와 내용 확인
- 채팅 창이 단일 스크롤 컨테이너를 사용함
- 스크린샷을 `frontend/qa-screenshots/`에 저장

환경 변수:

- `VERIFY_PORT`: 기본 `5176`
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE`: Chrome/Edge 자동 탐색이 실패할 때 사용

## 관련 문서

- [프론트엔드 스타일과 QA](../03-frontend/styling-and-qa.md)
- [배포와 인프라](../09-deployment/deployment.md)
