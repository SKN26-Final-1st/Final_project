# HumouR 프로젝트 문서

이 문서는 현재 코드 기준으로 작성한 위키형 초안입니다. 루트 `README.md`가 제목 수준의 스텁이어서, 기존 내용을 보존하면서 `docs/` 아래에 새 문서 체계를 만들었습니다.

## 00. 개요

- [프로젝트 개요](00-overview/project-overview.md)
- [현재 구현 범위](00-overview/current-implementation-status.md)

## 01. 시작하기

- [개발 환경](01-getting-started/development-environment.md)
- [실행과 운영](01-getting-started/run-and-operations.md)

## 02. 아키텍처

- [시스템 아키텍처](02-architecture/system-architecture.md)
- [디렉터리 구조](02-architecture/directory-structure.md)
- [데이터 흐름](02-architecture/data-flow.md)

## 03. 프론트엔드

- [프론트엔드 문서 인덱스](03-frontend/README.md)
- [프론트엔드 개요](03-frontend/overview.md)
- [페이지와 라우트](03-frontend/pages-and-routes.md)
- [상태와 API 어댑터](03-frontend/state-and-api-adapters.md)
- [컴포넌트 구조](03-frontend/components.md)
- [디자인 시스템](03-frontend/design-system.md)
- [스타일과 QA](03-frontend/styling-and-qa.md)

## 04. 백엔드

- [백엔드 문서 인덱스](04-backend/README.md)
- [백엔드 모듈](04-backend/modules.md)
- [인증과 권한](04-backend/auth-and-permissions.md)
- [분석 파이프라인](04-backend/analysis-pipeline.md)

## 05. 데이터베이스와 데이터 작업

- [스키마와 ERD](05-database/schema-and-erd.md)
- [데이터 수집과 임베딩](05-database/data-collection-and-embedding.md)

## 06. API

- [API 레퍼런스](06-api/api-reference.md)

## 07. AI 모델링

- [AI 문서 인덱스](07-ai-modeling/README.md)
- [모델 파이프라인](07-ai-modeling/model-pipeline.md)
- [검색과 저장소](07-ai-modeling/retrieval-and-storage.md)

## 08. 기능

- [기능 문서 인덱스](08-features/README.md)
- [채용 운영 워크스페이스](08-features/recruiting-workspace.md)
- [지원서 분석](08-features/resume-analysis.md)
- [문서 검색 채팅](08-features/document-chat.md)
- [관리자와 계정](08-features/admin-and-account.md)

## 09. 배포

- [배포와 인프라](09-deployment/deployment.md)

## 문서 유지보수 규칙

- 실제 코드 경로를 근거로 업데이트합니다.
- 라우트, 엔드포인트, 파일명 오타처럼 코드에 이미 반영된 이름은 문서에서도 실제 이름을 우선합니다.
- mock 동작과 실제 API 연동 동작을 섞어 쓰지 말고 분리해 기록합니다.
- 새 기능이 추가되면 이 허브와 관련 파트 인덱스를 함께 수정합니다.
