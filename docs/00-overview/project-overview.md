# 프로젝트 개요

HumouR는 채용 담당자가 회사 정보, JD, 지원서, AI 분석 리포트, 면접 질문, 문서 검색 채팅을 한 흐름에서 다루도록 만든 채용 보조 시스템입니다.

## 핵심 구성

- 프론트엔드: React, Vite, TypeScript, Ant Design 기반의 운영 화면입니다. 주요 진입점은 `frontend/src/main.tsx`, 라우팅·인증 가드·전역 UI는 `frontend/src/App.tsx`, 페이지별 상태는 `frontend/src/hooks/`에 있습니다.
- 백엔드: Django 앱 `api`가 계정, 회사 정보, JD, 체크리스트, 이력서, 분석 리포트(`interview_question` JSON 포함), API 키를 관리합니다. 설정은 `backend/config/settings.py`, URL 연결은 `backend/config/urls.py`와 `backend/api/urls.py`에 있습니다.
- AI 분석: 지원서 분석은 `backend/common/analysis_graph.py`와 `backend/api/tasks.py`, 문서/HR 채팅은 `backend/common/chat_graph.py`, JD 작성 보조는 `backend/common/jd_chat_graph.py`가 담당합니다. 마스킹과 자기소개서 STAR 구조화는 OpenAI 또는 RunPod 경로를 선택합니다.
- 데이터 작업: 채용공고 조건 크롤러는 `database/crawling/`, 문서 임베딩과 Pinecone 업로드 노트북은 `database/embedding/`에 있습니다.
- 배포: GitHub Actions가 S3와 SSM으로 프론트/백엔드를 각각 EC2에 배포합니다. 배포 설정은 `.github/workflows/deploy.yml`과 `.deploy/`에 있습니다.

## 주요 사용자 흐름

1. 사용자는 로그인/회원가입 화면에서 세션을 시작합니다.
2. 회사 정보를 입력하고 JD를 관리합니다.
3. JD에 연결된 지원서를 등록하거나 API로 조회합니다.
4. 지원서 분석 요청이 백엔드의 `resume/analyze/` 엔드포인트로 전달됩니다.
5. 백엔드는 OpenAI 기반 리포트/면접 질문 생성 결과를 DB에 저장합니다.
6. 프론트엔드는 대시보드, 분석 리포트, 채팅, 모집 공고, 문항 템플릿 화면으로 결과를 보여줍니다.

## 관련 문서

- [시스템 아키텍처](../02-architecture/system-architecture.md)
- [API 레퍼런스](../06-api/api-reference.md)
- [프론트 API ID 매핑](../06-api/frontend-api-id-map.md)
- [모델 파이프라인](../07-ai-modeling/model-pipeline.md)
