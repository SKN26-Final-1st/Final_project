# 실행과 운영

## 백엔드 실행

백엔드 진입점은 `backend/manage.py`입니다.

일반적인 로컬 실행 순서:

```bash
python -m venv backend/.venv
# Windows: backend\.venv\Scripts\activate
# macOS/Linux: source backend/.venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

로컬 DB는 `IS_REMOTE_HOST`가 없을 때 `backend/db.sqlite3`를 사용합니다. 근거: `backend/config/settings.py`

## 프론트엔드 실행

프론트는 `frontend/package.json` 스크립트를 사용합니다. **백엔드가 `127.0.0.1:8000`에서 실행 중이어야** API 호출이 성공합니다.

```bash
cd frontend
npm ci
npm run dev
```

`dev` 스크립트는 `vite --host 127.0.0.1`이며, 기본 포트는 `5173`입니다. `/api` 요청은 Vite 프록시를 통해 백엔드로 전달됩니다. 근거: `frontend/vite.config.ts`

API 키 기반 접근(`/shared` 등)은 화면에서 사용자가 입력한 키를 `apiClient` 호출 시 `{ apiKey }` 옵션으로 넘깁니다. 세션 API에는 자동으로 `X-API-Key`가 붙지 않습니다. 근거: `frontend/src/api/httpClient.ts`, `frontend/src/api/httpClient.test.ts`

## 검사 명령

프론트:

```bash
cd frontend
npm run lint
npm run build
npm run test          # Vitest 단위·통합 테스트
npm run test:e2e      # Playwright E2E (로그인 접근성)
```

백엔드:

```bash
cd backend
python manage.py check
python manage.py test
```

배포 워크플로는 프론트 `npm ci`/`npm run build`를 실행하고, 백엔드는 SSM으로 EC2에서 `python manage.py check`, `migrate`, `collectstatic`을 실행합니다. 로컬 `python manage.py test`는 수동 검사 명령으로 남아 있습니다. 근거: `.github/workflows/deploy.yml`

## 프론트 검증 스크립트

`frontend/scripts/`에 API 계약과 UI 흐름 검증 스크립트가 있습니다.

| 스크립트 | 역할 |
| --- | --- |
| `verify-backend-contract.mjs` | frontend 코드가 backend API 계약(경로, 필드명)을 지키는지 정적 검증 |
| `verify-live-django-api.mjs` | 임시 SQLite DB와 Django runserver로 실제 API 시나리오 검증 |
| `verify-auth-flow.mjs` | 로그인/회원가입/비밀번호 재설정 UI 흐름 검증 |
| `verify-auth-text-links.mjs` | 인증 화면 보조 링크가 텍스트 링크 스타일인지 검증 |
| `verify-admin-layout.mjs` | 관리자 화면 레이아웃 검증 |
| `verify-admin-authkey-panel.mjs` | 관리자 AuthKey 생성·표시·복사 패널 검증 |
| `verify-jd-create-flow.mjs` | JD 생성·삭제 UI 흐름 검증 |
| `verify-cover-letter-save-flow.mjs` | 자기소개서 저장 UI 흐름 검증 |
| `verify-cover-letter-selection-flow.mjs` | 자기소개서 선택·삭제 UI 흐름 검증 |
| `verify-viewport-layout.mjs` | 뷰포트 기반 페이지 레이아웃 검증 |
| `verify-document-chat-widget.mjs` | 문서 검색 FAB/위젯 데스크톱·모바일 검증 |
| `verify-shared-route.mjs` | `/shared` 공유 리포트 라우트 검증 |
| `verify-state-management-refactor.mjs` | `App.tsx`와 페이지 훅·mutation 분리 정적 검증 |
| `verify-analysis-report-page.mjs` | 분석 리포트 화면 QA |
| `verify-chat-context-real-data.mjs` | 채팅 컨텍스트 실데이터 연결 검증 |
| `verify-qa-stability-fixes.mjs` | UI 안정성 회귀 검증 |

`verify-*.mjs` 스크립트는 npm script로 등록되어 있지 않으므로, 프론트 루트에서 직접 실행합니다. Vitest(`npm run test`)와 Playwright E2E(`npm run test:e2e`)는 `package.json`에 등록되어 있습니다.

```bash
cd frontend
node scripts/verify-backend-contract.mjs
node scripts/verify-live-django-api.mjs
```

상세 시나리오와 나머지 스크립트 실행 방법은 [프론트엔드 API 연동 README](../../frontend/README.md)를 참고하세요.

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

- [프론트엔드 디자인 시스템](../03-frontend/design-system.md)
- [배포와 인프라](../09-deployment/deployment.md)
- [프론트엔드 API 연동 README](../../frontend/README.md)
