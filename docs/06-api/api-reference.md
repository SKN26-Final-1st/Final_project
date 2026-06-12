# API 레퍼런스

기본 prefix는 `/api/`입니다. 대부분의 엔드포인트는 POST만 허용합니다. 응답은 대체로 `{ "error": boolean, "data": ..., "message": ... }` 형태입니다.

근거: `backend/api/urls.py`, `backend/api/views.py`

## 공통 인증

- 세션 인증: Django login session
- CSRF: POST 요청은 CSRF 쿠키와 `X-CSRFToken`이 필요합니다.
- API 키: 일부 엔드포인트는 비로그인 상태에서 `X-API-Key` 헤더를 허용합니다.

프론트 구현 근거: `frontend/src/api/backendClient.ts`

## 인증/계정

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/csrf/` | GET/POST | 없음 | 없음 | `{error:false,message}` |
| `/api/signin/` | POST | 없음 | `username`, `password`, `name`, `verification_question`, `verification_answer` | `{error:false,signin:true}` |
| `/api/login/` | POST | 없음 | `username`, `password` | `{error:false,login:true}` |
| `/api/logout/` | POST | 세션 | 없음 | `{error:false,logout:true}` |
| `/api/checkuser/` | POST | 없음 | `username` | `{error:false,valid:boolean}` |
| `/api/passqestion/` | POST | 없음 | `username` | `{error:false,verification_question}` |
| `/api/passreset/` | POST | 없음 | `username`, `verification_answer` 또는 `answer` | `{error:false,password}` |
| `/api/account/get/` | POST | 세션 | 없음 | `{error:false,data:Account}` |
| `/api/account/modify/` | POST | 세션 | 수정 필드 또는 `delete:true` | `{error:false}` |

주의: 비밀번호 질문 경로는 실제 코드상 `passqestion/`입니다.

## 회사 정보

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/compinfo/get/` | POST | 세션 | 없음 | `{error:false,data:CompanyInfo}` |
| `/api/compinfo/modify/` | POST | 세션 | 수정할 회사 필드 | `{error:false}` |

`compinfo/get`은 회사 정보가 없으면 생성합니다.

## API 키

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/authkey/add/` | POST | 세션 | `name`, 선택 `description`, `credit_limit` | `{error:false,data:AuthKey}` |
| `/api/authkey/get/` | POST | 세션 | 없음 | `{error:false,data:AuthKey[]}` |
| `/api/authkey/modify/` | POST | 세션 | `id`, 수정 필드 또는 `delete:true` | `{error:false}` |

`authkey/get`은 `value`를 마스킹합니다. `authorized_resume` 수정 시 중복 id와 권한 없는 resume id를 검증합니다.

## JD

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/jd/add/` | POST | 세션 | `job_name`, `career_level`, `required_skill` 등 | `{error:false,data:JobDescription}` |
| `/api/jd/get/` | POST | 세션 또는 API 키 | 없음 | `{error:false,data:JobDescription[]}` |
| `/api/jd/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 또는 `delete:true` | `{error:false,data:JobDescription}` |

상태값은 `prepare`, `on_going`, `closed`만 허용합니다.

## 지원서

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/resume/add/` | POST | 세션 | `job_description_id`, 지원서 필드 | `{error:false,data:Resume}` |
| `/api/resume/get/` | POST | 세션 또는 API 키 | 선택 `job_description_id`, `id` | `{error:false,data:Resume[]}` |
| `/api/resume/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 또는 `delete:true` | `{error:false,data:Resume}` |
| `/api/resume/analize/` | POST | 세션 또는 API 키 | `id` | `{error:false,data:{report,questions}}` |

주의:

- 분석 경로는 실제 코드상 `analize/`입니다.
- `resume/add`는 `status`, `reviewed`, `reviewed_at`, 생성/수정일을 직접 설정할 수 없습니다.

## 분석 리포트

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/report/get/` | POST | 세션 또는 API 키 | `resume_id` | `{error:false,data:AnalysisReport[]}` |
| `/api/report/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 | `{error:false,data:AnalysisReport}` |

`report_modify`는 삭제를 허용하지 않습니다.

## 면접 질문

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/question/get/` | POST | 세션 또는 API 키 | `resume_id` | `{error:false,data:InterviewQuestion[]}` |
| `/api/question/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 | `{error:false,data:InterviewQuestion}` |

`question_modify`는 삭제를 허용하지 않습니다.

## 채팅

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/chat/` | POST | 세션 또는 API 키 | `chat: [{role,message}]` | `{error:false,response:{role:"agent",message}}` |

요청 규칙:

- `chat`은 list여야 합니다.
- 각 item은 object여야 합니다.
- `role`은 `user` 또는 `agent`만 허용합니다.
- `message`는 string이어야 합니다.

백엔드는 사용자 또는 API 키가 접근 가능한 JD 목록을 함께 LangGraph에 전달합니다.

## 에러 메시지

`backend/api/error_code.py`가 숫자 코드별 표준 메시지를 제공합니다.

- 400: No matching data found
- 401: Required field is missing
- 402: Invalid input value
- 403: Authentication is required
- 405: Request method is not allowed
- 406: Duplicate data exists
- 407: Operation is not allowed
- 500: Internal server error

로컬 환경에서는 상세 메시지가 붙을 수 있습니다.

## 관련 문서

- [인증과 권한](../04-backend/auth-and-permissions.md)
- [스키마와 ERD](../05-database/schema-and-erd.md)
