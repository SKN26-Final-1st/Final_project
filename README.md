# HumouR - AI 기반 HR 채용 보조 시스템

> SKN26 Final Project · React + Django + LangGraph 기반 채용 분석, 면접 질문 생성, 문서 검색 채팅 서비스

## 1. Overview

**HumouR**는 `Human + Our`, `Human + More`의 의미를 담은 AI 기반 HR 채용 보조 시스템입니다. HR 전담 인력이 부족한 소규모 스타트업이 회사 정보, JD, 지원서, AI 분석 리포트, 면접 질문, 문서 검색 채팅을 한 흐름에서 관리할 수 있도록 돕습니다.

사용자는 회사 프로필과 채용 공고를 등록하고, 지원서와 자기소개서 정보를 입력하거나 업로드한 뒤 AI 분석을 요청할 수 있습니다. 백엔드는 JD 체크리스트와 지원서 내용을 비교해 직무 적합도, 강점, 우려점, 확인 포인트, 맞춤형 면접 질문과 예상 답변을 생성하고, 프론트엔드는 이를 대시보드와 리포트 화면에서 확인하기 쉽게 제공합니다.

HumouR의 AI는 합격/불합격을 자동 결정하는 도구가 아니라, 채용 담당자의 최종 판단을 돕기 위한 근거 자료와 면접 준비 정보를 제공하는 보조 도구입니다.

## 2. Features

| 구분 | 기능 | 설명 |
| --- | --- | --- |
| 계정 | 회원가입, 로그인, 마이페이지 | 세션 기반 인증, 프로필/보안 정보, 크레딧 정보를 관리합니다. |
| 회사 정보 | 회사 프로필 관리 | 회사명, 인원수, 팀 구성, 회사 소개, 채용 성향을 분석 기준으로 저장합니다. |
| JD | 직무기술서 관리 | JD 등록/수정/삭제, 상태 관리, AI 기반 체크리스트 생성을 지원합니다. |
| 지원서 | 지원서/자기소개서 관리 | JD별 지원서 입력, 수정, 삭제, 분석 요청 흐름을 제공합니다. |
| AI 분석 | 리포트와 면접 질문 생성 | 체크리스트 충족 여부, 적합도 분석, 강점/우려점, 면접 질문과 예상 답변을 생성합니다. |
| 채팅 | 문서 검색 및 HR 데이터 질의응답 | LangGraph 기반 챗봇이 앱 사용법 RAG와 채용 데이터 질문을 함께 처리합니다. |
| 공유 | API Key 기반 리포트 조회 | 허용된 지원서에 한해 비로그인 공유 리포트 조회와 채팅을 지원합니다. |
| 운영 | 관리자 AuthKey 관리 | API 키 생성, 마스킹 조회, 접근 가능한 지원서 권한을 관리합니다. |

## 3. Tech Stack

| 레이어 | 기술 |
| --- | --- |
| Frontend | React 19, TypeScript 5, Vite 7, Ant Design 6, Ant Design X, TanStack Query, Axios, Zod, ECharts |
| Backend | Python, Django 6, Django ORM, Gunicorn, Celery |
| AI/LLM | OpenAI `gpt-4o-mini`, `text-embedding-3-small`, LangGraph, LangChain, Pydantic structured output |
| Vector/RAG | Pinecone `user_manual` namespace |
| Database | SQLite 개발 DB, MySQL/RDS 환경 변수 대응 |
| Data | 채용공고 조건 크롤러, CSV 전처리, Jupyter Notebook 기반 임베딩 업로드 |
| Test/QA | Vitest, Testing Library, MSW, Playwright, axe-core, frontend 검증 스크립트 |
| Deployment | GitHub Actions, AWS S3, SSM, EC2, Nginx, systemd, Gunicorn, Celery, Redis/Valkey |

## 4. Project Structure

```text
Final_project/
├── backend/                  # Django API, DB 모델, Celery 태스크, LLM 분석/채팅 모듈
│   ├── api/                  # Account, CompanyInfo, JD, Resume, AnalysisReport API
│   ├── common/               # report.py, checklist.py, chat_graph.py, masking/feedback 로직
│   └── config/               # Django settings, urls, wsgi/asgi, Celery 설정
├── frontend/                 # React/Vite 운영 화면
│   ├── src/api/              # Django API client, Zod schema, 화면 어댑터
│   ├── src/components/       # layout, dashboard, jd, cover-letter, chat, admin 등 UI
│   ├── src/hooks/            # TanStack Query 기반 페이지 데이터와 mutation 훅
│   ├── src/pages/            # dashboard, company, jd, report, chat, auth, shared route
│   ├── scripts/              # API 계약, 레이아웃, 플로우 검증 스크립트
│   └── tests/                # Playwright E2E
├── database/                 # 채용 조건 데이터 수집과 Pinecone 업로드 보조 작업
│   ├── crawling/             # Wanted, JobKorea, Jumpit 등 채용 사이트 크롤러
│   └── embedding/            # 문서 청킹, 임베딩 생성, Pinecone 업로드 노트북
├── docs/                     # 현재 코드 기준 위키형 프로젝트 문서
├── outputs/                  # 인터페이스 정의서와 미리보기 산출물
├── .deploy/                  # Nginx, Gunicorn, Celery 배포 설정
├── .github/workflows/        # AWS S3/SSM 기반 배포 워크플로
└── README.md
```

## 5. AI Pipeline

지원서 분석은 `backend/common/report.py`와 `backend/api/tasks.py`를 중심으로 동작합니다. 분석 요청이 들어오면 `AnalysisReport`를 생성하고, Celery worker가 있으면 큐에 넣고 없으면 동기로 실행합니다. 이후 지원서, 회사 정보, JD, 체크리스트를 마스킹한 뒤 OpenAI 모델로 체크리스트 충족 여부, 면접 질문, 최종 리포트를 생성하고 DB에 저장합니다.

문서 검색 채팅은 `backend/common/chat_graph.py`가 LangGraph 흐름을 구성합니다. 사용자 질문을 HR 데이터 질문, 앱 사용법 질문, 범위 밖 질문으로 분류하고, HR 질문은 접근 가능한 JD 데이터를 기반으로 답변하며, 앱 사용법 질문은 Pinecone에 저장된 `user_manual` 문서를 검색해 응답합니다.

## 6. Documentation

상세 문서는 [docs/README.md](docs/README.md)에서 시작합니다.

- 프로젝트 개요: [docs/00-overview/project-overview.md](docs/00-overview/project-overview.md)
- 시스템 아키텍처: [docs/02-architecture/system-architecture.md](docs/02-architecture/system-architecture.md)
- API 레퍼런스: [docs/06-api/api-reference.md](docs/06-api/api-reference.md)
- AI 모델링: [docs/07-ai-modeling/model-pipeline.md](docs/07-ai-modeling/model-pipeline.md)
- 프론트엔드 API 연동 상세: [frontend/README.md](frontend/README.md)
