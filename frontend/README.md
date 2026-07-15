# 프론트엔드 운영·검증 가이드

이 문서는 프론트엔드에서 반복 수행하는 수동 인수 테스트, 시나리오별 자동 검증, 후순위 기능 처리 원칙을 정리합니다. 프로젝트 구조와 API 계약처럼 공통 위키에 이미 있는 내용은 중복해서 관리하지 않습니다.

## 먼저 읽을 문서

- [프론트엔드 개요](../docs/03-frontend/overview.md)
- [페이지와 라우트](../docs/03-frontend/pages-and-routes.md)
- [상태와 API 어댑터](../docs/03-frontend/state-and-api-adapters.md)
- [디자인 시스템](../docs/03-frontend/design-system.md)
- [API 레퍼런스](../docs/06-api/api-reference.md)
- [프론트 API ID 매핑](../docs/06-api/frontend-api-id-map.md)
- [개발 환경](../docs/01-getting-started/development-environment.md)
- [실행과 운영](../docs/01-getting-started/run-and-operations.md)

## 수동 테스트 전제

- Django 백엔드와 Vite 프론트엔드를 먼저 실행합니다. 실행 방법은 [실행과 운영](../docs/01-getting-started/run-and-operations.md)을 따릅니다.
- 기본 주소는 백엔드 `http://127.0.0.1:8000`, 프론트엔드 `http://127.0.0.1:5173`입니다.
- 다른 백엔드를 사용할 때는 `VITE_API_PROXY_TARGET`을 설정합니다. 근거: `vite.config.ts`, `.env.example`
- 세션 시나리오와 API Key 시나리오는 인증 상태가 다르므로 별도로 검증합니다.
- LLM, Pinecone, RunPod이 필요한 시나리오는 로컬 또는 운영 환경 변수와 네트워크 연결 상태에 따라 결과가 달라질 수 있습니다.

## 사용자 플로우별 수동 테스트

### 회원가입, 로그인, 로그아웃

1. `/signup`에서 빈 값과 공백 아이디가 API 호출 전에 차단되는지 확인합니다.
2. 아이디 중복 확인 후 필수값을 입력해 가입합니다.
3. 가입 후 `/login`으로 이동하는지 확인합니다.
4. 새 계정으로 로그인하고 `/dashboard`에서 실제 계정 정보가 표시되는지 확인합니다.
5. 로그아웃 후 보호 라우트에 접근하면 `/login`으로 이동하는지 확인합니다.
6. 잘못된 세션 또는 만료된 세션에서 진행 중 요청이 정리되고 로그인 화면으로 복구되는지 확인합니다.

관련 자동 검증: `scripts/verify-auth-flow.mjs`, `scripts/verify-auth-text-links.mjs`, `tests/e2e/auth-accessibility.spec.ts`, `tests/e2e/auth-security.spec.ts`

### 개인정보와 비밀번호

1. `/mypage`에서 이름, 검증 질문, 검증 답변을 수정합니다.
2. 저장 후 새로고침해 변경값이 유지되는지 확인합니다.
3. 현재 비밀번호가 비어 있으면 클라이언트 검증이 동작하는지 확인합니다.
4. 현재 비밀번호가 틀리면 백엔드 오류가 표시되는지 확인합니다.
5. 정상 변경 후 로그인 세션이 유지되고 성공 안내가 표시되는지 확인합니다.
6. 계정 삭제처럼 복구하기 어려운 동작은 확인 모달과 취소 경로를 먼저 검증합니다.

관련 자동 검증: `scripts/verify-live-django-api.mjs`, `src/pages/MyPage.test.tsx`

### 회사 정보

1. `/company`에서 회사명, 인원수, 팀 구성, 회사 소개, 채용 성향을 수정합니다.
2. 저장 후 재조회했을 때 값이 유지되는지 확인합니다.
3. 빈 배열, 빈 문자열, 숫자 `0`이 누락되거나 깨지지 않는지 확인합니다.
4. 저장 중 중복 제출이 차단되고 실패 시 입력 내용이 보존되는지 확인합니다.

관련 자동 검증: `scripts/verify-live-django-api.mjs`, `src/pages/CompanyPage.test.tsx`

### JD와 대화형 작성

1. `/jd`에서 필수 입력 없이 저장할 때 클라이언트 검증이 동작하는지 확인합니다.
2. JD를 생성하고 목록에서 선택한 뒤 수정·삭제가 가능한지 확인합니다.
3. 상태를 `prepare`, `on_going`, `closed` 사이에서 변경하고 재조회 결과를 확인합니다.
4. 대화형 작성 패널에서 메시지를 보내 누락 필드가 갱신되는지 확인합니다.
5. 체크리스트 생성을 요청하고 `onqueue`/`processing` 상태에서 중복 요청이 차단되는지 확인합니다.
6. 완료 또는 실패 후 재시도 UI와 체크리스트 목록이 올바르게 갱신되는지 확인합니다.

관련 자동 검증: `scripts/verify-jd-create-flow.mjs`, `src/pages/JdPage.test.tsx`, `src/components/jd/JdChatDrawer.test.tsx`

### 지원서와 분석

1. JD를 선택하고 `/cover-letter`에서 지원자 정보, 역량, 자기소개 항목을 입력합니다.
2. 저장 후 지원서 목록과 구조화된 미리보기에 값이 표시되는지 확인합니다.
3. 여러 지원서 사이에서 선택 상태가 유지되고 삭제 후 다음 항목이 정상 선택되는지 확인합니다.
4. 체크리스트가 준비되지 않은 상태에서는 분석 요청이 차단되는지 확인합니다.
5. 분석 요청 후 로딩 상태와 credit 변화를 확인합니다.
6. 성공하면 `/analysis-report?reportId=...`로 이동하거나 리포트 데이터가 갱신되는지 확인합니다.
7. 실패하면 재시도 가능한 오류 상태가 표시되고 차감 credit이 복구되는지 확인합니다.

관련 자동 검증: `scripts/verify-cover-letter-save-flow.mjs`, `scripts/verify-cover-letter-selection-flow.mjs`, `scripts/verify-analysis-report-page.mjs`

### 분석 리포트와 문서 검색 채팅

1. `/analysis-report`에서 선택한 리포트의 점수, 근거, 면접 질문, 검토 상태를 확인합니다.
2. 리포트를 검토 완료 또는 보류 상태로 변경하고 재조회 결과를 확인합니다.
3. 문서 검색 FAB을 열어 현재 화면의 JD·지원서·리포트 문맥이 표시되는지 확인합니다.
4. 추천 질문과 직접 입력 질문을 각각 전송합니다.
5. 이전 요청보다 늦게 도착한 응답이 최신 대화를 덮어쓰지 않는지 확인합니다.
6. 데스크톱과 모바일에서 FAB, 패널, 스크롤 영역이 화면 밖으로 넘치지 않는지 확인합니다.

관련 자동 검증: `scripts/verify-chat-context-real-data.mjs`, `scripts/verify-document-chat-widget.mjs`, `src/hooks/useDocumentChatState.test.tsx`

### API Key 발급과 제한 모드

1. `/admin`에서 이름, 설명, credit limit을 입력해 API Key를 생성합니다.
2. 생성 직후에만 전체 키가 표시되고 재조회 시 마스킹되는지 확인합니다.
3. 특정 지원서를 `authorized_resume`에 추가하고 저장합니다.
4. 로그인 화면에서 API Key로 진입한 뒤 `/jd`, `/cover-letter`, `/analysis-report`만 접근 가능한지 확인합니다.
5. 제한 모드에서 사이드바와 직접 URL 접근이 동일한 권한 규칙을 적용하는지 확인합니다.
6. `/shared?resumeId=<id>`에서 전체 키와 지원서 ID를 입력해 공유 리포트를 조회합니다.
7. 권한이 없는 지원서와 credit이 부족한 키에서 명확한 오류 안내가 표시되는지 확인합니다.

관련 자동 검증: `scripts/verify-admin-authkey-panel.mjs`, `scripts/verify-shared-route.mjs`, `src/pages/SharedReportPage.test.tsx`

## 자동 검증 선택표

모든 명령은 `frontend/`에서 실행합니다. 전체 lint, build, Vitest, Playwright 명령은 [실행과 운영](../docs/01-getting-started/run-and-operations.md)의 검사 명령 절을 참고합니다.

| 변경 범위 | 우선 실행할 검증 |
| --- | --- |
| API 경로·요청·응답 필드 | `node scripts/verify-backend-contract.mjs` |
| 실제 Django CRUD·인증 계약 | `node scripts/verify-live-django-api.mjs` |
| 인증 화면 | `node scripts/verify-auth-flow.mjs`, `node scripts/verify-auth-text-links.mjs` |
| 관리자와 API Key | `node scripts/verify-admin-layout.mjs`, `node scripts/verify-admin-authkey-panel.mjs` |
| JD 생성·삭제 | `node scripts/verify-jd-create-flow.mjs` |
| 지원서 저장·선택·삭제 | `node scripts/verify-cover-letter-save-flow.mjs`, `node scripts/verify-cover-letter-selection-flow.mjs` |
| 분석 리포트 | `node scripts/verify-analysis-report-page.mjs` |
| 공유 리포트 | `node scripts/verify-shared-route.mjs` |
| 문서 검색 채팅 | `node scripts/verify-chat-context-real-data.mjs`, `node scripts/verify-document-chat-widget.mjs` |
| 상태 관리 구조 | `node scripts/verify-state-management-refactor.mjs` |
| 반응형·고정 레이아웃 | `node scripts/verify-viewport-layout.mjs` |
| 종합 UI 회귀 | `node scripts/verify-qa-stability-fixes.mjs` |

LLM을 포함한 라이브 검증은 필요한 키를 프로세스 환경에 설정한 뒤 다음처럼 실행합니다.

```powershell
$env:RUN_LLM_E2E='1'
node scripts\verify-live-django-api.mjs
```

키가 없거나 외부 네트워크를 사용할 수 없으면 LLM 단계는 실패하거나 건너뛸 수 있습니다. 비밀값은 저장소에 기록하지 않습니다.

## 후순위 MVP 처리 원칙

백엔드 라우트가 없는 기능을 임의의 API에 연결하지 않습니다. 화면과 라우트는 향후 구현을 위해 보존하고, 사용자에게 개발 예정 상태를 명확히 표시합니다.

### 보존된 페이지

- `src/pages/RecruitmentPostPage.tsx`: 실데이터 기반 모집 공고 미리보기를 제공하고, 생성·PDF 버튼은 준비 중 tooltip과 함께 비활성화합니다.
- `src/pages/CoverLetterTemplatePage.tsx`: 분석 질문 기반 문항 가이드를 표시하고, 생성·문서 버튼은 준비 중 tooltip과 함께 비활성화합니다.

두 페이지는 `src/data/appConfig.tsx`에서 `mvpStatus: 'planned'`, `visibleInNav: false`로 관리해 내비게이션에서 숨깁니다. 계정 세션으로 직접 접근하면 읽기 전용 미리보기가 열립니다. 현재 생성·다운로드 버튼은 disabled 상태이며 대응 `apiClient` 메서드가 없습니다. 백엔드 API가 추가되면 `src/api/clients/`에 도메인 호출을 추가하고 공개 façade, API 문서, 테스트를 함께 갱신합니다.

### 백엔드 미지원 영역

- 플랜 목록과 결제·구독 변경
- 포인트 충전·차감 이력
- 일반고객·기업고객 구분
- 조직·멤버·역할 관리
- 상세 사용량·토큰 로그
- 면접방 관리
- 면접 질문 개별 수정·삭제

현재 화면에서는 실제 응답에 존재하는 `Account.credit`, `Account.subscribe`, `Account.subscribe_expiration`, `AuthKey.credit_limit`만 사용합니다. 미지원 액션을 동작 가능한 기능처럼 노출하지 않습니다.

## API 연동 체크리스트

- 백엔드 라우트와 요청·응답 필드를 실제 코드에서 먼저 확인합니다.
- 세션 API는 credentials와 CSRF 처리를 유지합니다.
- API Key는 필요한 요청에만 명시적으로 전달하고 URL이나 로그에 노출하지 않습니다.
- HTTP 200이어도 응답의 `error`가 `true`면 실패로 처리합니다.
- 응답은 `src/api/backendSchemas.ts`에서 런타임 검증하고 화면 모델 변환은 adapter에 둡니다.
- query key에는 세션/API Key 모드를 구분할 수 있는 값을 포함하고 mutation 후 관련 query를 무효화합니다.
- 이전 요청 취소와 stale response 차단이 필요한 검색·채팅 흐름을 확인합니다.
- 오류가 발생해도 사용자가 입력한 폼과 선택 상태를 가능한 한 보존합니다.
- `passqestion`, `resume/analyze`, `self_intoduction`은 백엔드 계약이 바뀌기 전까지 실제 철자를 유지합니다.
- `account/modify`에 `id`, `username`, `account_hash`를 보내지 않습니다.
- 리포트 삭제는 `report/modify`에 `{ id, delete: true }`를 전달합니다.
- 존재하지 않는 `question/*` 엔드포인트를 호출하지 않습니다.
- 새 기능에는 관련 Vitest 또는 검증 스크립트를 추가하고 이 선택표를 갱신합니다.

## 문서 유지 원칙

- 공통 구조, API 계약, 실행 방법은 `docs/`에서만 관리합니다.
- 이 파일은 수동 테스트와 프론트엔드 작업 규칙만 관리합니다.
- 라우트나 기능 상태가 바뀌면 관련 위키 페이지와 이 파일의 테스트 절차를 함께 확인합니다.
