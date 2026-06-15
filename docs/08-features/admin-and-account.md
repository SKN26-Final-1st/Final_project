# 관리자와 계정

## 관리자 화면

화면: `/admin`

파일:

- `frontend/src/pages/AdminPage.tsx`

역할:

- 남은 포인트, 월 예산, 토큰 사용량, 활성 면접방, 가드레일 알림 표시
- LLM 질문 생성 가드레일 표시
- 면접방/비밀번호 관리 UI
- 스타트업 프로필 표시
- 비밀번호 정책 표시
- LLM 사용 로그 UI 표시
- **AuthKey 생성·수정·삭제·authorized_resume 설정** (실제 API 연동)

AuthKey API 연동:

- `apiClient.addAuthKey()` → `POST /api/authkey/add/`
- `apiClient.saveAuthKey()` → `POST /api/authkey/modify/`
- `apiClient.deleteAuthKey()` → `POST /api/authkey/modify/` with `delete: true`

운영 지표(포인트, 면접방 등)는 `AdminData`와 화면 내부 계산을 사용합니다. 근거: `frontend/src/api/adapters.ts`, `frontend/src/pages/AdminPage.tsx`

## 계정 메뉴

파일:

- `frontend/src/components/layout/AccountMenu.tsx`
- `frontend/src/components/layout/SidebarNav.tsx` (데스크톱 popover)
- `frontend/src/components/layout/MobileShellHeader.tsx` (모바일 popover)

역할:

- 사용자 프로필 요약
- light/dark 모드 전환
- 분석 크레딧 표시
- 마이페이지 이동
- 로그아웃 동작

## 마이페이지

화면: `/mypage`

파일:

- `frontend/src/pages/MyPage.tsx`
- `frontend/src/components/mypage/ProfileSummaryCard.tsx`
- `frontend/src/components/mypage/AccountSettingsForm.tsx`
- `frontend/src/components/mypage/SecuritySettingsForm.tsx`
- `frontend/src/components/mypage/CompanySummaryPanel.tsx`

역할:

- 프로필 요약
- 계정 ID, 담당자명, 크레딧, 구독 여부, 본인 확인 질문 표시
- 현재/새 비밀번호 입력 UI
- 회사 정보 요약과 회사 정보 화면 이동

저장 버튼은 `apiClient.saveUserProfile()`을 호출합니다. `/api/account/modify/`로 전달됩니다.

## 인증 화면

화면:

- `/login`
- `/signup`
- `/password-reset`

파일:

- `frontend/src/pages/AuthPages.tsx`
- `frontend/src/components/layout/AuthScreen.tsx`

백엔드 API:

- `/api/login/`
- `/api/signin/`
- `/api/checkuser/`
- `/api/passqestion/`
- `/api/passreset/`

회원가입 완료 후 backend가 자동 로그인하지 않으므로 로그인 화면으로 이동합니다. 로그인 성공 후 `/api/account/get/`으로 계정을 다시 조회합니다.

공유 리포트(`/shared`)는 [공유 리포트](shared-report.md) 문서를 참고하세요.

## 관련 문서

- [인증과 권한](../04-backend/auth-and-permissions.md)
- [API 레퍼런스](../06-api/api-reference.md)
- [페이지와 라우트](../03-frontend/pages-and-routes.md)
