# 공유 리포트

## 화면

- 라우트: `/shared`
- 쿼리: `?resumeId=` 또는 `?resume_id=`
- 파일: `frontend/src/pages/SharedReportPage.tsx`

인증 없이 접근합니다. `AppShell`과 문서 검색 FAB 없이 독립 레이아웃을 사용합니다.

## 사용 흐름

1. URL 쿼리에서 resume id를 읽거나 폼에 직접 입력합니다.
2. 발급받은 API 키를 입력합니다.
3. `apiClient.getSharedResumeBundle(resumeId, apiKey)`로 데이터를 조회합니다.
4. 리포트 탭, 면접 질문, JD 요약을 확인합니다.
5. 채팅 입력 시 report/JD/question 요약을 대화 문맥에 포함해 `sendChatMessage()`를 호출합니다.

## 백엔드 API

모든 요청에 `X-API-Key` 헤더가 필요합니다.

| 용도 | 경로 |
| --- | --- |
| 지원서 조회 | `POST /api/resume/get/` `{ id }` |
| JD 목록 | `POST /api/jd/get/` |
| 분석 리포트 | `POST /api/report/get/` `{ resume_id }` |
| 채팅 | `POST /api/chat/` `{ chat }` |

면접 질문은 `report/get` 응답의 `interview_question` 필드에 포함됩니다. 프론트 `getSharedResumeBundle()`는 리포트 목록에서 질문 배열을 추출합니다.

AuthKey의 `authorized_resume`에 해당 resume id가 포함되어 있어야 접근 가능합니다. 근거: `backend/api/views/resume_endpoints.py`, `backend/api/views/analysis_report_endpoints.py`, `frontend/src/api/backendClient.ts`

## 검증

`frontend/scripts/verify-shared-route.mjs`가 `/shared` 라우트 UI와 API 키 폼을 검증합니다.

## 관련 문서

- [관리자와 계정](admin-and-account.md) — AuthKey 발급
- [API 레퍼런스](../06-api/api-reference.md)
- [데이터 흐름](../02-architecture/data-flow.md)
