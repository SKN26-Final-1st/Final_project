# Frontend API Integration README

이 문서는 frontend에서 실제 Django API로 전환한 범위, 주요 사용자 플로우, 검증 방법, 후순위 MVP 처리 원칙을 정리한다.

## 현재 상태 요약

- 실제 API가 존재하는 MVP 기능은 `src/api/backendClient.ts`를 통해 Django API로 연결되어 있다.
- session 기반 요청은 `withCredentials`와 `X-CSRFToken`을 사용한다.
- 공유/비로그인 접근은 `X-API-Key` 헤더를 사용한다.
- backend 응답은 HTTP status보다 body의 `error: boolean`을 기준으로 처리한다.
- backend 계약상 오탈자처럼 보이는 경로/필드는 그대로 사용한다.
  - `/api/passqestion/`
  - `/api/resume/analize/`
  - `self_intoduction`
- backend API가 아직 없는 후순위 MVP 화면은 삭제하지 않고 보존했다. 다만 nav/sidebar에서는 숨기고, 직접 접근하면 “후순위 MVP / 백엔드 API 연동 예정” 안내를 보여준다.

## 주요 파일

- `src/api/httpClient.ts`
  - Axios 인스턴스, CSRF 쿠키 읽기, credentials 기본값.
- `src/api/backendClient.ts`
  - 실제 API 호출, CSRF, credentials, `X-API-Key`, `payload.error` 처리.
- `src/data/backendTypes.ts`
  - Django `to_dict()` 응답 shape에 맞춘 frontend 타입.
- `src/api/appDataService.ts`
  - dashboard에서 필요한 account/company/JD/resume/report/question/authkey 데이터를 실제 API로 조합.
- `src/api/adapters.ts`
  - backend shape를 화면 view model로 변환.
- `src/data/appConfig.tsx`
  - route/menu 정의. 후순위 MVP route는 `mvpStatus: 'planned'`, `visibleInNav: false`.
- `src/utils/routes.ts`
  - route 목록. 후순위 MVP route는 직접 접근 보존을 위해 `appRoutes`에는 남아 있다.
- `scripts/verify-backend-contract.mjs`
  - frontend 코드가 backend 계약을 지키는지 정적 검증.
- `scripts/verify-live-django-api.mjs`
  - 임시 SQLite DB와 Django runserver로 실제 API 시나리오 검증.

## 실제 API 연결 범위

### Auth / Account

연결 화면/함수:

- `src/pages/auth/LoginPage.tsx`, `SignupPage.tsx`, `PasswordResetPage.tsx`
- `src/pages/AuthPages.tsx` (re-export barrel)
- `src/pages/MyPage.tsx`
- `apiClient.checkSignupId`
- `apiClient.completeSignup`
- `apiClient.login`
- `apiClient.logout`
- `apiClient.getPasswordQuestion`
- `apiClient.resetPassword`
- `apiClient.getUserProfile`
- `apiClient.saveUserProfile`

backend endpoint:

- `POST /api/checkuser/`
- `POST /api/signin/`
- `POST /api/login/`
- `POST /api/logout/`
- `POST /api/passqestion/`
- `POST /api/passreset/`
- `POST /api/account/get/`
- `POST /api/account/modify/`

주의:

- 회원가입 완료 후 backend가 자동 로그인하지 않으므로 로그인 화면으로 보낸다.
- 로그인 성공 후 `/api/account/get/`으로 실제 계정을 다시 조회한다.
- 비밀번호 변경은 `{ formal_password, password }`만 보낸다.
- `id`, `username`, `account_hash`는 `account/modify` payload에서 제거한다.

### Company

연결 화면/함수:

- `src/pages/CompanyPage.tsx`
- `apiClient.getCompanyProfile`
- `apiClient.saveCompanyProfile`

backend endpoint:

- `POST /api/compinfo/get/`
- `POST /api/compinfo/modify/`

주의:

- `compinfo/get`은 회사 정보가 없으면 backend에서 생성 후 반환한다.
- 수정 payload는 `company_name`, `employee_count`, `team_composition`, `company_description`, `employ_style`만 보낸다.

### JD

연결 화면/함수:

- `src/pages/JdPage.tsx`
- `apiClient.getJobDescriptions`
- `apiClient.addJobDescription`
- `apiClient.saveJobDescription`
- `apiClient.deleteJobDescription`

backend endpoint:

- `POST /api/jd/add/`
- `POST /api/jd/get/`
- `POST /api/jd/modify/`

주의:

- 생성 시 `job_name`, `career_level`, `required_skill`을 필수로 취급한다.
- `status`는 `prepare`, `on_going`, `closed`만 사용한다.
- 삭제는 `jd/modify`에 `{ id, delete: true }`를 보낸다.

### Resume / 자소서 / 분석

연결 화면/함수:

- `src/pages/CoverLetterPage.tsx`
- `apiClient.addResume`
- `apiClient.saveResume`
- `apiClient.deleteResume`
- `apiClient.requestCoverLetterAnalysis`
- `apiClient.requestJobAnalysis`

backend endpoint:

- `POST /api/resume/add/`
- `POST /api/resume/get/`
- `POST /api/resume/modify/`
- `POST /api/resume/analize/`

주의:

- backend에서는 자소서가 별도 모델이 아니라 `Resume.self_intoduction`에 포함된다.
- 분석 실행은 JD id가 아니라 resume id로 `/api/resume/analize/`를 호출해야 한다.
- UI에서 JD 기준으로 분석을 누르면 해당 JD의 첫 resume을 찾아 분석한다.

### Report / Interview Question

연결 화면/함수:

- `src/pages/DashboardPage.tsx`
- `src/pages/ChatPage.tsx`
- `src/pages/SharedReportPage.tsx`
- `apiClient.saveReport`
- `apiClient.saveQuestion`

backend endpoint:

- `POST /api/report/get/`
- `POST /api/report/modify/`
- `POST /api/question/get/`
- `POST /api/question/modify/`

주의:

- 조회 기준은 `resume_id`다.
- report/question 삭제 API는 없으므로 삭제 UI를 만들지 않는다.

### Chat

연결 화면/함수:

- `src/pages/ChatPage.tsx`
- `src/components/chat/DocumentChatFab.tsx`
- `src/pages/SharedReportPage.tsx`
- `apiClient.sendChatMessage`

backend endpoint:

- `POST /api/chat/`

주의:

- frontend의 `assistant` role은 backend 요청 전 `agent`로 변환한다.
- backend 응답의 `agent`는 UI에서 `assistant`로 변환한다.
- backend chat API는 특정 report/question id를 직접 받지 않으므로, 공유 리포트 화면에서는 현재 report/JD/question 요약을 대화 문맥에 포함한다.

### AuthKey / 공유 접근

연결 화면/함수:

- `src/pages/AdminPage.tsx`
- `src/pages/SharedReportPage.tsx`
- `apiClient.getAuthKeys`
- `apiClient.addAuthKey`
- `apiClient.saveAuthKey`
- `apiClient.deleteAuthKey`
- `apiClient.getSharedResumeBundle`

backend endpoint:

- `POST /api/authkey/add/`
- `POST /api/authkey/get/`
- `POST /api/authkey/modify/`
- `POST /api/jd/get/` with `X-API-Key`
- `POST /api/resume/get/` with `X-API-Key`
- `POST /api/report/get/` with `X-API-Key`
- `POST /api/question/get/` with `X-API-Key`
- `POST /api/chat/` with `X-API-Key`
- `POST /api/resume/analize/` with `X-API-Key`

주의:

- `authkey/add` 응답에서만 full key가 내려온다.
- `authkey/get` 응답의 `value`는 마스킹된다.
- `authorized_resume` 권한 설정은 `authkey/modify`로 한다.
- 공유 화면은 API key를 URL query에 넣지 않고 입력값으로 받은 뒤 헤더로만 보낸다.

## 사용자 플로우별 수동 테스트

아래 플로우는 Django backend가 `127.0.0.1:8000`, Vite frontend가 `127.0.0.1:5173`에서 실행된다는 전제다.

### 1. 회원가입 / 로그인 / 로그아웃

1. `/signup`으로 이동한다.
2. 아이디 입력 후 “중복 확인”을 누른다.
3. 빈 값 또는 공백 아이디는 API 호출 없이 validation으로 막히는지 확인한다.
4. 회원가입 필수값을 입력하고 가입한다.
5. `/login`으로 이동되는지 확인한다.
6. 방금 만든 계정으로 로그인한다.
7. `/dashboard`로 진입하고 실제 계정 정보가 로드되는지 확인한다.
8. 로그아웃 후 보호 route 접근 시 `/login`으로 redirect되는지 확인한다.

자동 검증:

```powershell
cd frontend
node scripts\verify-auth-flow.mjs
```

### 2. 개인정보 / 비밀번호 변경

1. 로그인 후 `/mypage`로 이동한다.
2. 이름, 검증 질문, 검증 답변을 수정한다.
3. 저장 후 새로고침하거나 `/api/account/get/` 재조회 결과가 반영되는지 확인한다.
4. 비밀번호 변경에서 현재 비밀번호를 비우면 client validation이 동작하는지 확인한다.
5. 현재 비밀번호 오답은 backend error가 표시되는지 확인한다.
6. 정상 변경 후 로그인 상태가 유지되고 "비밀번호가 변경되었습니다. 로그인 상태가 유지됩니다." 안내가 표시되는지 확인한다.
7. 새 비밀번호로 페이지를 새로고침해도 세션이 유지되는지 확인한다.

자동 검증:

```powershell
cd frontend
node scripts\verify-live-django-api.mjs
```

### 3. 회사정보 수정

1. `/company`로 이동한다.
2. 회사명, 인원수, 팀 구성, 회사 소개, 채용 성향을 수정한다.
3. 저장 후 다시 조회했을 때 값이 유지되는지 확인한다.
4. 빈 배열/빈 문자열/숫자 0이 화면에서 깨지지 않는지 확인한다.

자동 검증:

```powershell
cd frontend
node scripts\verify-live-django-api.mjs
```

### 4. JD 생성 / 수정 / 삭제

1. `/jd`로 이동한다.
2. `job_name`, `career_level`, `required_skill` 없이 저장 시 client validation이 동작하는지 확인한다.
3. 정상 JD를 생성한다.
4. 생성된 JD가 목록에 표시되는지 확인한다.
5. `status`를 `on_going` 또는 `closed`로 수정한다.
6. 삭제 UI를 사용하는 경우 `{ id, delete: true }` 방식으로 삭제되는지 확인한다.

자동 검증:

```powershell
cd frontend
node scripts\verify-live-django-api.mjs
```

### 5. Resume / 자소서 생성 / 수정 / 분석

1. JD를 하나 생성하거나 선택한다.
2. `/cover-letter`로 이동한다.
3. 지원자 이름, 역량, 자기소개 문항/답변을 입력한다.
4. 저장 후 resume 목록/미리보기에 나타나는지 확인한다.
5. 분석 요청을 누른다.
6. loading 상태가 표시되고, 성공 후 report/questions가 갱신되는지 확인한다.
7. `/chat`에서 분석 결과 기반 질문을 보낸다.

LLM 포함 자동 검증:

```powershell
cd frontend
$env:RUN_LLM_E2E='1'
Get-Content -LiteralPath '..\.env' | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)\s*$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}
node scripts\verify-live-django-api.mjs
```

`OPENAI_API_KEY`가 없거나 네트워크가 막혀 있으면 LLM 단계는 실패하거나 skip된다. 네트워크 sandbox 환경에서는 권한을 열고 다시 실행해야 한다.

### 6. API key 발급 / 권한 설정 / 공유 조회

1. `/admin`으로 이동한다.
2. API key 이름, 설명, credit limit을 입력하고 생성한다.
3. 생성 직후 full key가 표시되는지 확인한다.
4. AuthKey 목록을 다시 조회하면 key가 마스킹되는지 확인한다.
5. 특정 resume id를 `authorized_resume`에 추가하고 저장한다.
6. `/shared?resumeId=<id>`로 이동한다.
7. resume id와 full API key를 입력한다.
8. 연결 JD, resume, report, questions가 조회되는지 확인한다.
9. 공유 화면의 chat에서 API key 기반 질문이 가능한지 확인한다.
10. 권한 없는 resume id로 조회하면 빈 결과 또는 접근 실패 안내가 표시되는지 확인한다.

자동 검증:

```powershell
cd frontend
node scripts\verify-shared-route.mjs
node scripts\verify-live-django-api.mjs
```

## 후순위 MVP 처리 현황

현재 backend route에 없는 기능은 임의 endpoint를 만들지 않았다. 화면은 나중에 backend API가 완성되면 재사용할 수 있도록 보존한다.

### 보존된 후순위 페이지

- `src/pages/RecruitmentPostPage.tsx`
  - 모집 공고 생성
  - 모집 공고 PDF 다운로드
  - 현재 상태: route는 보존, nav/sidebar에서는 숨김, 직접 접근 시 개발 예정 안내 표시
  - 남은 작업: 모집 공고 생성/다운로드 backend API가 생기면 `apiClient.generateRecruitmentPost`, `apiClient.downloadRecruitmentPdf`를 실제 호출로 교체
- `src/pages/CoverLetterTemplatePage.tsx`
  - 자기소개서 템플릿 문서 생성
  - 템플릿 문서 다운로드
  - 현재 상태: route는 보존, nav/sidebar에서는 숨김, 직접 접근 시 개발 예정 안내 표시
  - 남은 작업: 템플릿 생성/다운로드 backend API가 생기면 `apiClient.generateCoverLetterTemplate`, `apiClient.downloadTemplateDocument`를 실제 호출로 교체

### 기타 backend 미지원 기능

- 플랜 목록 조회
- 결제/구독 변경
- 포인트 충전/차감 이력
- 일반고객/기업고객 구분
- 조직/멤버/역할 관리
- 상세 사용 로그/토큰 로그
- 면접방 관리

현재 frontend에서는 실제 backend 필드로 내려오는 값만 표시한다.

- `Account.credit`
- `Account.subscribe`
- `Account.subscribe_expiration`
- `AuthKey.credit_limit`

결제, 플랜 변경, 포인트 이력처럼 backend API가 없는 액션은 동작 가능한 기능처럼 만들지 않는다.

## 검증 명령 모음

정적 backend 계약 검증:

```powershell
node frontend\scripts\verify-backend-contract.mjs
```

라이브 Django API 검증:

```powershell
cd frontend
node scripts\verify-live-django-api.mjs
```

LLM 포함 라이브 Django API 검증:

```powershell
cd frontend
$env:RUN_LLM_E2E='1'
Get-Content -LiteralPath '..\.env' | ForEach-Object {
  if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)\s*$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}
node scripts\verify-live-django-api.mjs
```

lint:

```powershell
cd frontend
npm.cmd run lint
```

build/typecheck:

```powershell
cd frontend
npm.cmd run build
```

브라우저 smoke:

```powershell
cd frontend
node scripts\verify-auth-flow.mjs
node scripts\verify-shared-route.mjs
```

## 개발 시 체크리스트

- 새 API를 붙일 때 backend route가 실제로 있는지 먼저 확인한다.
- session API는 CSRF + credentials 유지.
- 공유 API는 `X-API-Key`를 명시적으로 전달.
- HTTP 200이어도 `payload.error`가 `true`면 실패로 처리.
- `passqestion`, `resume/analize`, `self_intoduction` 철자는 backend 계약이 바뀌기 전까지 유지.
- `account/modify`에는 `id`, `username`, `account_hash`를 보내지 않는다.
- `report/modify`, `question/modify`에는 `delete`를 보내지 않는다.
- backend API가 없는 기능은 `unsupportedBackendFeature(...)` 또는 “개발 예정” UI로 처리한다.
- 후순위 MVP 페이지는 삭제하지 말고 route/file을 보존한다.
