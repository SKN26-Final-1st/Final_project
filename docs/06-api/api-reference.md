# API 레퍼런스

기본 prefix는 `/api/`입니다. 대부분의 엔드포인트는 POST만 허용합니다. 응답은 대체로 `{ "error": boolean, "data": ..., "message": ... }` 형태입니다.

근거: `backend/api/urls.py`, `backend/api/views/`

## 공통 인증

- 세션 인증: Django login session
- CSRF: POST 요청은 CSRF 쿠키와 `X-CSRFToken`이 필요합니다.
- API 키: 일부 엔드포인트는 비로그인 상태에서 `X-API-Key` 헤더를 허용합니다.

프론트 구현 근거: `frontend/src/api/backendClient.ts`

프론트 산출물용 API ID 표는 [프론트 API ID 매핑](frontend-api-id-map.md)을 참고하세요.

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
| `/api/authkey/credit/` | POST | API 키 | 없음 | `{error:false,data:{credit:number}}` |

`authkey/get`은 `value`를 마스킹합니다. `authorized_resume` 수정 시 중복 id와 권한 없는 resume id를 검증합니다.

## JD

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/jd/add/` | POST | 세션 | `job_name`, 선택 `career_level`, `required_skill` 등 | `{error:false,data:JobDescription}` |
| `/api/jd/get/` | POST | 세션 또는 API 키 | 없음 | `{error:false,data:JobDescription[]}` |
| `/api/jd/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 또는 `delete:true` | `{error:false,data:JobDescription}` |
| `/api/jd/analyze/` | POST | 세션 또는 API 키 | `id`, 선택 `query`, `cnt` | `{error:false,data:JobDescription}` |

상태값은 `prepare`, `on_going`, `closed`만 허용합니다.

`jd/analyze`는 체크리스트 생성을 시작하고 JD의 `checklist_status`(`onqueue`, `processing`, `done`, `fail`)를 반환합니다. `query`는 생성 지시, `cnt`는 생성 개수 제한입니다. API 키 요청은 `authorized_resume`으로 접근 가능한 JD에 한해 허용됩니다.

## 체크리스트

JD별 수동 체크리스트 항목입니다. 모델: `Checklist` in `backend/api/models.py`

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/checklist/add/` | POST | 세션 | `job_description_id`, `content` | `{error:false,data:Checklist}` |
| `/api/checklist/get/` | POST | 세션 또는 API 키 | `job_description_id` | `{error:false,data:Checklist[]}` |
| `/api/checklist/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 또는 `delete:true` | `{error:false,data:Checklist}` |

JD가 없거나 접근 권한이 없으면 `checklist/get`은 빈 배열을 반환합니다.

## 지원서

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/resume/add/` | POST | 세션 | `job_description_id`, 지원서 필드 | `{error:false,data:Resume}` |
| `/api/resume/get/` | POST | 세션 또는 API 키 | 선택 `job_description_id`, `id` | `{error:false,data:Resume[]}` |
| `/api/resume/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 또는 `delete:true` | `{error:false,data:Resume}` |
| `/api/resume/analyze/` | POST | 세션 또는 API 키 | `id` | `{error:false,data:AnalysisReport}` |

주의:

- 분석 경로는 `analyze/`입니다. 프론트 `backendClient.ts`도 `resume/analyze`를 호출합니다.
- `resume/add`는 `status`, `reviewed`, `reviewed_at`, 생성/수정일을 직접 설정할 수 없습니다.
- 분석 응답은 `AnalysisReport.to_dict()`이며, 면접 질문은 `interview_question` 필드에 포함됩니다.

## 분석 리포트

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/report/get/` | POST | 세션 또는 API 키 | `resume_id` 또는 `id` | `{error:false,data:AnalysisReport[]}` |
| `/api/report/modify/` | POST | 세션 또는 API 키 | `id`, 수정 필드 또는 `delete:true` | `{error:false,data:AnalysisReport}` |

`report_get`은 `id`가 있으면 단건, `resume_id`가 있으면 해당 지원서의 리포트 목록을 반환합니다. `report_modify`는 리포트 수정과 삭제를 모두 처리하며, 삭제는 `{id, delete:true}`를 보냅니다. `status=processing`인 리포트는 수정·삭제가 거부됩니다.

`AnalysisReport` 응답 필드에는 `interview_question` (`question`, `answer`, `purpose` 객체 배열), `motive`, `collaboration` 등이 포함됩니다.

## 제거된 엔드포인트

이전 버전의 `/api/question/get/`, `/api/question/modify/`는 제거되었습니다. 면접 질문은 `AnalysisReport.interview_question`으로 조회합니다.
프론트 `backendClient.ts`는 `report/get` 응답의 `interview_question`을 `getReportQuestions()`로 변환해 사용합니다.

## 채팅

| 경로 | 메서드 | 인증 | 요청 | 응답 |
| --- | --- | --- | --- | --- |
| `/api/chat/` | POST | 세션 또는 API 키 | `chat: [{role,message}]` | `{error:false,response:{role:"agent",message}}` |
| `/api/jd_chat/` | POST | 세션 또는 API 키 | `job_description_id`, `chat`, 선택 `state` | `{error:false,response,state}` |

`jd_chat`은 회사/JD의 누락 필드를 대화로 수집합니다. 응답 `state`는 `ignored_field`, `focus_field`, `end_chat`을 포함하고, 분석된 허용 필드는 해당 `JobDescription` 또는 `CompanyInfo`에 즉시 저장됩니다.

요청 규칙:

- `chat`은 list여야 합니다.
- 각 item은 object여야 합니다.
- `role`은 `user` 또는 `agent`만 허용합니다.
- `message`는 string이어야 합니다.

백엔드는 사용자 또는 API 키가 접근 가능한 JD 목록을 함께 LangGraph에 전달합니다.

## 에러 메시지

`backend/api/views/error_code.py`가 숫자 코드별 표준 메시지를 제공합니다.

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

- [프론트 API ID 매핑](frontend-api-id-map.md)
- [인증과 권한](../04-backend/auth-and-permissions.md)
- [스키마와 ERD](../05-database/schema-and-erd.md)
