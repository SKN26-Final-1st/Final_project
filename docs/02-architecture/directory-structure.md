# 디렉터리 구조

## 루트

```text
.
├── backend/
├── database/
├── docs/
├── frontend/
├── llm/
├── outputs/
├── runpod/
├── .deploy/
├── .github/workflows/
├── requirements.txt
└── README.md
```

## 백엔드

```text
backend/
├── api/
│   ├── models.py
│   ├── tasks.py
│   ├── urls.py
│   ├── views/
│   │   ├── __init__.py
│   │   ├── account_endpoints.py
│   │   ├── analysis_report_endpoints.py
│   │   ├── auth_key_endpoints.py
│   │   ├── chat_endpoints.py
│   │   ├── checklist_endpoints.py
│   │   ├── company_info_endpoints.py
│   │   ├── job_description_endpoints.py
│   │   ├── resume_endpoints.py
│   │   ├── columns.py
│   │   ├── error_code.py
│   │   └── utils.py
│   └── migrations/
├── common/
│   ├── analysis_agent.py
│   ├── analysis_graph.py
│   ├── analysis_prompt.py
│   ├── chat_agent.py
│   ├── chat_graph.py
│   ├── chat_prompt.py
│   ├── checklist_agent.py
│   ├── checklist_graph.py
│   ├── checklist_prompt.py
│   ├── feedback_agent.py
│   ├── feedback_graph.py
│   ├── feedback_prompt.py
│   ├── jd_chat_agent.py
│   ├── jd_chat_graph.py
│   ├── jd_chat_prompt.py
│   ├── masking.py
│   ├── star_analysis.py
│   └── utils.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── manage.py
└── requirements.txt
```

`api`는 Django 도메인 앱이고, `common`은 LLM/그래프/리포트 같은 백엔드 공통 기능을 담습니다. `*_graph.py` 파일은 LangGraph 기반 분석·체크리스트·채팅·피드백 흐름을 구성합니다.

## 프론트엔드

```text
frontend/
├── public/assets/
├── scripts/
├── src/
│   ├── api/
│   │   ├── adapters/
│   │   │   ├── admin.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── jd.ts
│   │   │   ├── recruitment.ts
│   │   │   ├── report.ts
│   │   │   ├── resume.ts
│   │   │   └── user.ts
│   │   ├── clients/
│   │   │   ├── authAccountClient.ts
│   │   │   ├── companyAuthKeyClient.ts
│   │   │   ├── jdChecklistClient.ts
│   │   │   ├── resumeReportClient.ts
│   │   │   └── chatClient.ts
│   │   ├── services/
│   │   │   └── dashboardSource.ts
│   │   ├── adapters.ts
│   │   ├── appDataService.ts
│   │   ├── backendClient.ts
│   │   ├── backendSchemas.ts
│   │   ├── backendSchemas.test.ts
│   │   ├── httpClient.ts
│   │   ├── queryClient.ts
│   │   ├── queryKeys.ts
│   │   └── queryOptions.ts
│   ├── components/
│   │   ├── admin/
│   │   ├── analysis-report/
│   │   ├── charts/
│   │   ├── chat/
│   │   ├── common/
│   │   ├── company/
│   │   ├── cover-letter/
│   │   ├── dashboard/
│   │   ├── jd/
│   │   ├── layout/
│   │   ├── mypage/
│   │   ├── recruitment/
│   │   ├── routing/
│   │   └── shared-report/
│   ├── data/
│   ├── hooks/
│   │   ├── mutations/
│   │   │   ├── useAdminMutations.ts
│   │   │   ├── useJdMutations.ts
│   │   │   ├── useResumeMutations.ts
│   │   │   └── useMutationHelpers.ts
│   │   ├── useAppData.ts
│   │   ├── useAppDataQuery.ts
│   │   ├── useJdPageData.ts
│   │   ├── useCoverLetterPageData.ts
│   │   ├── useAnalysisReportPageData.ts
│   │   ├── useChatPageData.ts
│   │   ├── useAdminPageData.ts
│   │   ├── useDocumentChatState.ts
│   │   ├── useCoverLetterFilters.ts
│   │   ├── useJdFilters.ts
│   │   ├── useReportFilters.ts
│   │   ├── useSharedReportSession.ts
│   │   ├── useApiAction.ts
│   │   ├── useAuthSession.ts
│   │   └── useLogoutAction.ts
│   ├── pages/
│   │   ├── AdminPage.tsx
│   │   ├── AnalysisReportPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── CompanyPage.tsx
│   │   ├── CoverLetterPage.tsx
│   │   ├── CoverLetterTemplatePage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── JdPage.tsx
│   │   ├── MyPage.tsx
│   │   ├── RecruitmentPostPage.tsx
│   │   ├── SharedReportPage.tsx
│   │   └── auth/
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       ├── PasswordResetPage.tsx
│   │       └── types.ts
│   ├── models/
│   ├── providers/
│   ├── test/
│   │   ├── setup.ts
│   │   └── server.ts
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── tests/
│   └── e2e/
│       ├── auth-accessibility.spec.ts
│       └── auth-security.spec.ts
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
├── eslint.config.js
└── vite.config.ts
```

`src/api`는 호출/어댑터 계층, `src/hooks`는 Query 캐시·페이지 상태·mutation, `src/pages`는 화면 조립, `src/components`는 재사용 UI와 도메인 패널입니다.

## 데이터

```text
database/
├── crawling/
│   ├── catch_scraper.py
│   ├── jobkorea_scraper.py
│   ├── jobplanet_scraper.py
│   ├── jumpit_scraper.py
│   ├── linkareer_scraper.py
│   ├── okky_scraper.py
│   ├── rallit_scraper.py
│   ├── wanted_scraper.py
│   └── pinecone/
│       ├── create_hire_query_csv.ipynb
│       └── upload_query_to_pinecone_colab.ipynb
└── embedding/
    ├── chunk_embedding.ipynb
    └── pinecone_uploader.ipynb
```

## RunPod

```text
runpod/
├── masking_handler.py
├── star_handler.py
├── masking_docker
├── star_docker
└── requirements.txt
```

RunPod 구성은 EXAONE 기반 LoRA 마스킹 및 STAR 구조화 모델을 serverless handler로 실행하기 위한 배포 자산입니다. `masking_handler.py`는 마스킹 후보를, `star_handler.py`는 자기소개서 항목별 STAR 구조와 원문 품질을 JSON으로 반환합니다.

## 모델 실험

`llm/eval/`에는 채팅·RAG·리포트·마스킹·STAR 평가 코드와 노트북이, `llm/train_star_masking/`에는 마스킹 및 STAR 모델 학습 노트북이 있습니다. 운영 Django 코드는 이 노트북을 직접 import하지 않습니다.

## 관련 문서

- [백엔드 모듈](../04-backend/modules.md)
- [프론트엔드 개요](../03-frontend/overview.md)
- [데이터 수집과 임베딩](../05-database/data-collection-and-embedding.md)
