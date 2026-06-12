# 스키마와 ERD

DB 모델의 기준은 `backend/api/models.py`입니다. 마이그레이션 파일은 `backend/api/migrations/`에 있습니다.

## ERD

```mermaid
erDiagram
  Account ||--|| CompanyInfo : owns
  Account ||--o{ AuthKey : owns
  Account ||--o{ JobDescription : owns
  JobDescription ||--o{ Resume : has
  Resume ||--|| AnalysisReport : has
  Resume ||--o{ InterviewQuestion : has

  Account {
    int id
    string username
    string name
    string verification_question
    string verification_answer
    int credit
    bool subscribe
    datetime subscribe_expiration
    string account_hash
  }

  CompanyInfo {
    bigint id
    int account_id
    string company_name
    int employee_count
    json team_composition
    text company_description
    json employ_style
  }

  AuthKey {
    bigint id
    int account_id
    string name
    string description
    int credit_limit
    string value
    json authorized_resume
  }

  JobDescription {
    bigint id
    int account_id
    string job_name
    string education_level
    string major
    string career_level
    json required_skill
    json preferred_skill
    text main_task
    text hiring_reason
    string work_type
    string status
    datetime created_at
    datetime updated_at
  }

  Resume {
    bigint id
    bigint job_description_id
    string name
    json skill
    json education_level
    json experience
    json self_intoduction
    json certification
    json language
    json award
    json training
    json other_activity
    string status
    bool reviewed
    datetime reviewed_at
    datetime created_at
    datetime updated_at
  }

  AnalysisReport {
    bigint id
    bigint resume_id
    string overall_grade
    text overall_summary
    text candidate_summary
    json checklist
    json competency_analysis
    json fit_analysis
    json strength
    json concern
    json check_point
    text final_comment
  }

  InterviewQuestion {
    bigint id
    bigint resume_id
    text question
    text answer
    text purpose
  }
```

## 테이블 이름

| 모델 | 테이블 |
| --- | --- |
| `Account` | `users` |
| `CompanyInfo` | `company_info` |
| `AuthKey` | `auth_keys` |
| `JobDescription` | `job_descriptions` |
| `Resume` | `resumes` |
| `AnalysisReport` | `analysis_reports` |
| `InterviewQuestion` | `interview_questions` |

## 상태값

`JobDescription.status`:

- `prepare`
- `on_going`
- `closed`

`Resume.status`:

- `onqueue`
- `processing`
- `done`

프론트 표시 라벨은 `frontend/src/api/adapters.ts`에서 매핑합니다.

## 직렬화 규칙

각 모델은 `to_dict()`를 제공합니다.

- `None` 문자열 필드는 빈 문자열로 변환합니다.
- `None` list 필드는 빈 배열로 변환합니다.
- `None` dict 필드는 빈 객체로 변환합니다.
- `DateTime`은 ISO 문자열로 변환합니다.

근거: `_value_or_empty_string`, `_value_or_empty_list`, `_datetime_to_iso` in `backend/api/models.py`

## 관련 문서

- [백엔드 모듈](../04-backend/modules.md)
- [API 레퍼런스](../06-api/api-reference.md)
