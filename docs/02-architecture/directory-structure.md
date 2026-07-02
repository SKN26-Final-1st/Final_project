# 디렉터리 구조

## 루트

```text
.
├── backend/
├── database/
├── docs/
├── frontend/
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
│   ├── chat_agent.py
│   ├── chat_graph.py
│   ├── checklist.py
│   ├── checklist_graph.py
│   ├── analysis_graph.py
│   ├── feedback.py
│   ├── feedback_graph.py
│   ├── jd_form_agent.py
│   ├── comp_form_agent.py
│   ├── masking.py
│   ├── report.py
│   ├── prompt.py
│   ├── utils.py
│   └── eval/
│       ├── chat_eval.ipynb
│       ├── RAG_eval.py
│       ├── e2e_eval.py
│       ├── goldset_mock_data_fixed.csv
│       ├── middle_report_eval.ipynb
│       ├── middle_report2_eval.ipynb
│       └── middle_report3_eval.ipynb
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
│   │   │   ├── jd.ts
│   │   │   └── user.ts
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
│   │   ├── charts/
│   │   ├── chat/
│   │   ├── common/
│   │   ├── company/
│   │   ├── cover-letter/
│   │   ├── dashboard/
│   │   ├── jd/
│   │   ├── layout/
│   │   ├── mypage/
│   │   └── recruitment/
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
│       └── auth-accessibility.spec.ts
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
│   └── wanted_scraper.py
└── embedding/
    ├── chunk_embedding.ipynb
    └── pinecone_uploader.ipynb
```

## RunPod

```text
runpod/
├── Dockerfile
├── masking_handler.py
└── requirements.txt
```

RunPod 구성은 EXAONE 기반 LoRA 마스킹 모델을 serverless handler로 실행하기 위한 보조 배포 자산입니다. `masking_handler.py`는 입력 텍스트를 받아 개인정보·회사명·학교·프로젝트명 등 라벨별 마스킹 후보를 JSON으로 반환합니다.

## 관련 문서

- [백엔드 모듈](../04-backend/modules.md)
- [프론트엔드 개요](../03-frontend/overview.md)
- [데이터 수집과 임베딩](../05-database/data-collection-and-embedding.md)
