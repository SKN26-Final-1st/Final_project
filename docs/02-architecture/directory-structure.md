# 디렉터리 구조

## 루트

```text
.
├── backend/
├── database/
├── docs/
├── frontend/
├── .github/workflows/
├── .platform/
├── .elasticbeanstalk/
├── Procfile
├── requirements.txt
└── README.md
```

## 백엔드

```text
backend/
├── api/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── columns.py
│   ├── error_code.py
│   └── migrations/
├── common/
│   ├── chat_agent.py
│   ├── chat_graph.py
│   ├── report.py
│   ├── utils.py
│   └── eval/
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── manage.py
└── requirements.txt
```

`api`는 Django 도메인 앱이고, `common`은 LLM/그래프/리포트 같은 백엔드 공통 기능을 담습니다.

## 프론트엔드

```text
frontend/
├── public/assets/
├── scripts/
├── src/
│   ├── api/
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── providers/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── package.json
├── package-lock.json
├── tsconfig.json
├── eslint.config.js
└── vite.config.ts
```

`src/api`는 호출/어댑터 계층, `src/pages`는 화면 조립, `src/components`는 재사용 UI와 도메인 패널입니다.

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

## 관련 문서

- [백엔드 모듈](../04-backend/modules.md)
- [프론트엔드 개요](../03-frontend/overview.md)
- [데이터 수집과 임베딩](../05-database/data-collection-and-embedding.md)
