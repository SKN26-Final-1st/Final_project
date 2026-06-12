# 현재 구현 범위

이 페이지는 실제 코드 기준으로 구현 완료, mock 중심, 검증 필요 영역을 분리합니다.

## 구현되어 있는 영역

- Django 모델과 CRUD성 API: `backend/api/models.py`, `backend/api/views.py`, `backend/api/urls.py`
- 세션 기반 인증과 일부 API 키 기반 접근: `backend/api/views.py`
- 지원서 분석 저장 흐름: `_get_analysis_inputs`, `_save_analysis_result`, `resume_analize` in `backend/api/views.py`
- OpenAI 리포트/면접질문 생성 파이프라인: `backend/common/report.py`
- LangGraph 기반 채팅 의도 분류와 응답 병합: `backend/common/chat_graph.py`, `backend/common/chat_agent.py`
- React 화면, 라우팅, 전역 알림/로딩/채팅 상태: `frontend/src/App.tsx`
- 프론트 API 클라이언트와 mock/real 전환: `frontend/src/api/backendClient.ts`
- 데이터 표시 모델 어댑터: `frontend/src/api/adapters.ts`
- Elastic Beanstalk 배포 워크플로: `.github/workflows/deploy-eb.yml`

## Mock 또는 프론트 표시 중심 영역

- 프론트 기본값은 `VITE_USE_MOCK_API !== 'false'`라서 `.env`를 바꾸지 않으면 mock 데이터를 사용합니다. 근거: `frontend/src/api/backendClient.ts`, `frontend/.env.example`
- 관리자 화면의 면접방, 비밀번호 정책, LLM 사용 로그는 현재 프론트 계산/표시 중심입니다. 근거: `frontend/src/pages/AdminPage.tsx`
- 모집 공고 PDF 다운로드, 자기소개서 문서 다운로드, 문항 생성 버튼은 현재 `apiClient`의 응답 래퍼로 UI 흐름을 보여줍니다. 근거: `frontend/src/api/backendClient.ts`
- 회사/JD/지원서 폼의 일부 추가/수정 동작은 알림만 표시하거나 읽기 전용입니다. 근거: `frontend/src/components/company/CompanyProfileForm.tsx`, `frontend/src/components/jd/JdEditorPanel.tsx`

## 주의할 실제 이름

- 비밀번호 질문 라우트는 코드상 `passqestion/`입니다. 근거: `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- 지원서 분석 라우트는 코드상 `resume/analize/`입니다. 근거: `backend/api/urls.py`, `frontend/src/api/backendClient.ts`
- Resume 모델 필드는 코드상 `self_intoduction`입니다. 근거: `backend/api/models.py`, `frontend/src/data/apiMockData.ts`
- 크롤러 출력 파일명은 코드상 `qualification_requiremnets.csv`입니다. 근거: `database/crawling/*_scraper.py`

## 검증 필요

- 실제 OpenAI/Pinecone 환경 변수와 인덱스 스키마는 로컬 `.env` 또는 운영 환경에 의존합니다.
- `report_get` 백엔드 응답은 리스트를 반환하지만 프론트 `getReportForResume`는 단일 객체도 기대합니다. 이 부분은 실제 API 연동 시 확인이 필요합니다. 근거: `backend/api/views.py`, `frontend/src/api/backendClient.ts`
- Django 테스트 파일은 현재 별도 테스트 모듈로 보이지 않습니다. CI는 `python manage.py test`를 실행합니다. 근거: `.github/workflows/deploy-eb.yml`
