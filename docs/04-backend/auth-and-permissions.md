# 인증과 권한

## 세션 인증

세션 기반 인증은 Django 기본 인증을 사용합니다.

- 회원가입: `account_signin`
- 로그인: `account_login`
- 로그아웃: `account_logout`
- 현재 계정 조회: `account_get`
- 계정 수정/삭제: `account_modify`

근거: `backend/api/views/account_endpoints.py`

## CSRF

`csrf_token` view는 `@ensure_csrf_cookie`를 사용해 CSRF 쿠키를 설정합니다. 프론트는 POST 전에 쿠키가 없으면 `/api/csrf/`를 호출합니다.

근거:

- `backend/api/views/account_endpoints.py`
- `frontend/src/api/backendClient.ts`

## API 키 인증

비로그인 요청 일부는 `X-API-Key` 헤더로 인증할 수 있습니다.

`AuthKey` 모델:

- `account`: 키 소유 계정
- `name`
- `description`
- `credit_limit`
- `value`: `sk_live_{account_hash}` prefix를 포함하는 고유 값
- `authorized_resume`: 접근 가능한 resume id 목록

근거: `backend/api/models.py`

## API 키가 적용되는 주요 흐름

다음 조회/수정/분석 흐름은 세션 사용자가 아니면 `X-API-Key`를 확인합니다.

- JD 목록 조회: `get_job_description_dicts`, `jd_get`
- JD 수정/삭제: `jd_modify`
- 체크리스트 조회/수정: `checklist_get`, `checklist_modify`
- 지원서 조회/수정/삭제: `resume_get`, `resume_modify`
- 지원서 분석: `_get_analysis_inputs`, `resume_analyze`
- 분석 리포트 조회/수정: `report_get`, `report_modify`
- 채팅: `chat`에서 `get_job_description_dicts`를 통해 인증

API 키 경로는 `authorized_resume`에 포함된 이력서와 해당 이력서가 연결된 JD만 접근할 수 있도록 필터링합니다. 근거: `backend/api/views/utils.py`, `backend/api/views/resume_endpoints.py`

## 필드 보호

`backend/api/views/columns.py`가 모델별 차단 필드를 정의합니다.

예:

- `ACCOUNT_BLOCKED_FIELDS`: `id`, `username`, `account_hash`
- `AUTH_KEY_BLOCKED_FIELDS`: `id`, `account`, `account_id`, `value`
- `JOB_DESCRIPTION_BLOCKED_FIELDS`: `id`, `account`, `account_id`, `created_at`, `updated_at`
- `CHECKLIST_BLOCKED_FIELDS`: `id`, `job_description`, `job_description_id`
- `RESUME_BLOCKED_FIELDS`: `id`, `created_at`, `updated_at`, `status`, `reviewed`, `reviewed_at`
- `REPORT_BLOCKED_FIELDS`: `id`, `resume`, `resume_id`

## 보안상 주의점

- 비밀번호 재설정은 임시 비밀번호를 소문자 8자리로 생성해 응답에 직접 반환합니다. 운영 보안 요구사항에 맞는지는 별도 검토가 필요합니다. 근거: `backend/api/views/account_endpoints.py`
- 로컬 환경에서는 상세 에러 메시지가 응답에 포함됩니다. 운영에서는 `RDS_HOSTNAME` 존재 여부로 상세 메시지를 숨깁니다. 근거: `backend/api/views/error_code.py`
- `AuthKey.value`는 조회 API에서 마스킹되어 반환됩니다. 근거: `authkey_get` in `backend/api/views/auth_key_endpoints.py`

## 관련 문서

- [API 레퍼런스](../06-api/api-reference.md)
- [스키마와 ERD](../05-database/schema-and-erd.md)
