import json
import os
from pathlib import Path
from typing import Any

from openai import OpenAI
from pydantic import BaseModel, Field

from .prompt import (
    FIT_CHECKLIST_SYSTEM_PROMPT,
    FIT_CHECKLIST_USER_PROMPT,
    USER_QUERY_PROMPT,
)


MODEL_NAME = "gpt-4o-mini"
CHECKLIST_COUNT = 10

class FitChecklistStructure(BaseModel):
    """회사와 JD에 대한 지원자 적합성 체크리스트 응답 구조입니다."""

    checklist: list[str] = Field(
        description="지원자가 회사와 JD에 적합한지 판단하기 위한 체크리스트 목록"
    )


def _load_backend_env():
    """backend/.env의 환경 변수를 런타임 환경에 보강합니다."""

    if os.environ.get("RDS_HOSTNAME"):
        return

    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _get_openai_client():
    """환경 변수의 API 키로 OpenAI 클라이언트를 생성합니다."""

    _load_backend_env()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되어 있지 않습니다.")

    return OpenAI(api_key=api_key)


def _is_empty_input(value):
    """프롬프트 입력으로 사용할 수 없는 빈 값을 판별합니다."""

    return value is None or value == "" or value == {} or value == []


def _to_prompt_value(value):
    """dict와 list는 JSON 문자열로 변환합니다."""

    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value)


def _messages(system_prompt, user_prompt):
    """OpenAI 호출용 system/user 메시지를 구성합니다."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _create_structured_completion(system_prompt, user_prompt, response_format):
    """Pydantic 스키마에 맞는 구조화 응답을 생성합니다."""

    client = _get_openai_client()
    messages = _messages(system_prompt, user_prompt)
    parse_method = getattr(client.beta.chat.completions, "parse", None)

    if parse_method:
        response = parse_method(
            model=MODEL_NAME,
            messages=messages,
            response_format=response_format,
        )
        return response.choices[0].message.parsed

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        response_format={"type": "json_object"},
    )
    return response_format.model_validate_json(response.choices[0].message.content)


def make_fit_checklist(
    company_info: Any,
    jd_info: Any,
    db_data=None,
    checklist_count=CHECKLIST_COUNT,
    user_query: str = "",
) -> list[str]:
    """회사/JD 정보를 바탕으로 적합성 체크리스트를 생성합니다."""

    checklist_context = {
        "company_info": None if _is_empty_input(company_info) else company_info,
        "jd_info": None if _is_empty_input(jd_info) else jd_info,
        "db_data": None if _is_empty_input(db_data) else _to_prompt_value(db_data),
        "checklist_count": checklist_count,
    }

    if not any(checklist_context[key] for key in ("company_info", "jd_info", "db_data")):
        raise ValueError("체크리스트 생성을 위한 회사 정보, JD 정보, DB 데이터 중 최소 하나가 필요합니다.")

    context_json = json.dumps(checklist_context, ensure_ascii=False, indent=2)
    user_prompt = FIT_CHECKLIST_USER_PROMPT.format(
        checklist_count=checklist_count,
        context_json=context_json,
    )
    if user_query.strip():
        user_prompt += "\n\n" + USER_QUERY_PROMPT.format(user_query=user_query.strip())

    parsed = _create_structured_completion(
        FIT_CHECKLIST_SYSTEM_PROMPT,
        user_prompt,
        FitChecklistStructure,
    )
    return parsed.checklist


def invoke(
    compinfo: dict,
    jdinfo: dict,
    cnt: int = CHECKLIST_COUNT,
    user_query: str = "",
    db_data=None,
) -> list[str]:
    """회사 정보와 JD 정보를 받아 적합성 체크리스트 문자열 목록을 반환합니다."""

    if isinstance(cnt, bool) or not isinstance(cnt, int) or cnt <= 0:
        raise ValueError("cnt는 1 이상의 정수여야 합니다.")

    return make_fit_checklist(
        company_info=compinfo,
        jd_info=jdinfo,
        db_data=db_data,
        checklist_count=cnt,
        user_query=user_query,
    )
