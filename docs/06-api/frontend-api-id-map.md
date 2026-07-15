# 프론트 API ID 매핑

이 문서는 프론트엔드 파트 산출물에서 API를 `도메인명 + 순번` 형식으로 부를 때 사용하는 요약표입니다.

근거:

- 백엔드 라우트: `backend/api/urls.py`
- 백엔드 구현: `backend/api/views/`
- 프론트 호출부: `frontend/src/api/clients/`, `frontend/src/api/httpClient.ts`, 공개 façade `frontend/src/api/backendClient.ts`

메서드는 프론트 호출 기준입니다. `csrf`만 쿠키 발급용 `GET`으로 사용하고, 실제 데이터 요청은 대부분 `POST`입니다.

## 도메인 약어

| Domain | 의미 |
| --- | --- |
| OPS | 상태 확인 |
| AUTH | 인증 |
| ACC | 계정 |
| COMP | 회사 정보 |
| KEY | 인증키 |
| JD | 채용공고 / 직무기술서 |
| CHK | 체크리스트 |
| RES | 지원서 |
| REP | 분석 리포트 |
| CHAT | AI 채팅 |

## API ID 표

| API ID | URL | Method | 설명 |
| --- | --- | --- | --- |
| OPS-001 | `/api/ping/` | GET | 백엔드 헬스 체크 |
| AUTH-001 | `/api/csrf/` | GET | CSRF 쿠키 발급 |
| AUTH-002 | `/api/signin/` | POST | 회원가입 |
| AUTH-003 | `/api/login/` | POST | 로그인 |
| AUTH-004 | `/api/logout/` | POST | 로그아웃 |
| AUTH-005 | `/api/checkuser/` | POST | 아이디 중복 확인 |
| AUTH-006 | `/api/passqestion/` | POST | 비밀번호 확인 질문 조회 |
| AUTH-007 | `/api/passreset/` | POST | 비밀번호 재설정 |
| ACC-001 | `/api/account/get/` | POST | 계정 정보 조회 |
| ACC-002 | `/api/account/modify/` | POST | 계정 정보 수정 / 탈퇴 |
| COMP-001 | `/api/compinfo/get/` | POST | 회사 정보 조회 |
| COMP-002 | `/api/compinfo/modify/` | POST | 회사 정보 수정 |
| KEY-001 | `/api/authkey/add/` | POST | 인증키 생성 |
| KEY-002 | `/api/authkey/get/` | POST | 인증키 목록 조회 |
| KEY-003 | `/api/authkey/modify/` | POST | 인증키 수정 / 삭제 |
| KEY-004 | `/api/authkey/credit/` | POST | API 키 잔여 크레딧 조회 |
| JD-001 | `/api/jd/add/` | POST | JD 등록 |
| JD-002 | `/api/jd/get/` | POST | JD 목록 조회 |
| JD-003 | `/api/jd/modify/` | POST | JD 수정 / 삭제 |
| JD-004 | `/api/jd/analyze/` | POST | JD 기반 체크리스트 AI 생성 |
| CHK-001 | `/api/checklist/add/` | POST | 체크리스트 항목 추가 |
| CHK-002 | `/api/checklist/get/` | POST | 체크리스트 조회 |
| CHK-003 | `/api/checklist/modify/` | POST | 체크리스트 수정 / 삭제 |
| RES-001 | `/api/resume/add/` | POST | 지원서 등록 |
| RES-002 | `/api/resume/get/` | POST | 지원서 조회 |
| RES-003 | `/api/resume/analyze/` | POST | 지원서 분석 요청 |
| RES-004 | `/api/resume/modify/` | POST | 지원서 수정 / 삭제 |
| REP-001 | `/api/report/get/` | POST | 분석 리포트 조회 |
| REP-002 | `/api/report/modify/` | POST | 분석 리포트 수정 / 삭제 |
| CHAT-001 | `/api/chat/` | POST | AI 채팅 질의 |
| CHAT-002 | `/api/jd_chat/` | POST | JD 작성 보조 채팅 및 필드 반영 |

## 주의할 계약

- `AUTH-006`의 경로는 실제 코드 기준 `passqestion`입니다.
- `JD-001`은 프론트 계약상 `job_name`, `career_level`, `required_skill`이 필수입니다. 백엔드는 현재 `job_name`만 선검사한 뒤 나머지 두 필드를 직접 참조합니다.
- `JD-004`는 JD id와 선택적 `query`, `cnt`를 받아 체크리스트 생성을 시작하고 `checklist_status`가 포함된 JD를 반환합니다. 세션 또는 접근 가능한 API 키로 호출할 수 있습니다.
- `RES-003`은 resume id를 받아 분석을 실행하고 `AnalysisReport`를 반환합니다. 면접 질문은 리포트의 `interview_question` 필드에 포함됩니다.
- `REP-002`는 수정 필드 또는 `delete:true`를 받습니다. `processing` 상태의 리포트는 수정·삭제할 수 없습니다.
- 공유 리포트 화면은 일부 조회/분석/채팅 요청에 `X-API-Key`를 명시적으로 전달합니다.

## 관련 문서

- [API 레퍼런스](api-reference.md)
- [상태와 API 어댑터](../03-frontend/state-and-api-adapters.md)
- [인증과 권한](../04-backend/auth-and-permissions.md)
