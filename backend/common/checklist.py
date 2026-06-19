import json
import os
from pathlib import Path

from openai import OpenAI
from pydantic import BaseModel, Field


MODEL_NAME = "gpt-4o-mini"
CHECKLIST_COUNT = 10
DEFAULT_DB_DATA = "Python/Java/Node, REST API, DB 설계, 인증/권한, 서버 배포 경험"

COMPANY_SUMMARY_SYSTEM_PROMPT = (
    "너는 지원자가 지원 기업을 빠르게 이해하도록 돕는 회사 정보 요약 전문가야. "
    "입력받은 dictionary를 바탕으로 회사의 규모, 조직/팀 구성, 사업 또는 서비스 설명, "
    "employ_style에 담긴 선호 인재상과 지원자가 알아두면 좋은 특징을 간결한 한국어 문단으로 요약해. "
    "id, user_id, created_at, updated_at 같은 관리용 필드는 요약에 직접 언급하지 마."
)
COMPANY_SUMMARY_USER_PROMPT = "다음 회사 정보를 요약해줘.\n\n{company_json}"

JD_SUMMARY_SYSTEM_PROMPT = (
    "너는 지원자가 채용 공고를 빠르게 이해하도록 돕는 JD 요약 전문가야. "
    "입력받은 dictionary의 job_name, education_level, major, career_level, "
    "required_skill, preferred_skill, main_task, hiring_reason, work_type을 바탕으로 "
    "포지션명, 학력/전공/경력 조건, 필수 및 우대 기술, 주요 업무, 채용 배경, 근무 형태를 "
    "간결한 한국어 문단으로 요약해. "
    "id, user_id, company_info_id, status, created_at, updated_at 같은 관리용 필드는 "
    "요약에 직접 언급하지 마."
)
JD_SUMMARY_USER_PROMPT = "다음 채용 공고 정보를 요약해줘.\n\n{jd_json}"

FIT_CHECKLIST_SYSTEM_PROMPT = (
    "너는 채용 적합도 평가 기준을 만드는 전문가야. "
    "회사 요약, JD 요약, DB 데이터를 종합해서 지원자가 해당 회사와 포지션에 적합한지 "
    "판단하기 위한 체크리스트를 만들어. "
    "회사 요약 또는 JD 요약이 비어 있으면 제공된 나머지 정보와 DB 데이터만 근거로 사용해. "
    "각 체크리스트는 나중에 지원서 요약과 비교할 수 있도록 관찰 가능하고 판단 가능한 기준이어야 해. "
    "기술 스택, 직무 경험, 업무 이해도, 협업 방식, 서비스/도메인 적합성, 성장 가능성을 "
    "균형 있게 포함해. "
    "반드시 한국어로 작성하고, 지정된 Pydantic schema에 맞는 JSON 객체로 반환해."
)
FIT_CHECKLIST_USER_PROMPT = (
    "다음 정보를 바탕으로 적합도 판단 체크리스트를 정확히 {checklist_count}개 생성해줘. "
    "각 항목은 하나의 구체적인 평가 기준 문장이어야 해.\n\n{context_json}"
)
USER_QUERY_PROMPT = (
    "다음 사용자 요청을 반영해서 체크리스트를 작성해.\n"
    "<사용자 요청>\n{user_query}"
)


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


def _create_text_completion(system_prompt, user_prompt):
    """일반 텍스트 응답을 생성합니다."""

    client = _get_openai_client()
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=_messages(system_prompt, user_prompt),
    )
    return response.choices[0].message.content


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


def sum_company(compinfo: dict) -> str:
    """회사 정보 딕셔너리를 체크리스트 생성용 문장으로 요약합니다."""

    if _is_empty_input(compinfo):
        return ""

    company_json = json.dumps(compinfo, ensure_ascii=False, indent=2)
    return _create_text_completion(
        COMPANY_SUMMARY_SYSTEM_PROMPT,
        COMPANY_SUMMARY_USER_PROMPT.format(company_json=company_json),
    )


def sum_jd(jdinfo: dict) -> str:
    """JD 정보 딕셔너리를 체크리스트 생성용 문장으로 요약합니다."""

    if _is_empty_input(jdinfo):
        return ""

    jd_json = json.dumps(jdinfo, ensure_ascii=False, indent=2)
    return _create_text_completion(
        JD_SUMMARY_SYSTEM_PROMPT,
        JD_SUMMARY_USER_PROMPT.format(jd_json=jd_json),
    )


def make_fit_checklist(
    company_summary: str,
    jd_summary: str,
    db_data=DEFAULT_DB_DATA,
    checklist_count=CHECKLIST_COUNT,
    user_query: str = "",
) -> list[str]:
    """회사/JD 요약을 바탕으로 적합성 체크리스트를 생성합니다."""

    checklist_context = {
        "company_summary": None if _is_empty_input(company_summary) else _to_prompt_value(company_summary),
        "jd_summary": None if _is_empty_input(jd_summary) else _to_prompt_value(jd_summary),
        "db_data": None if _is_empty_input(db_data) else _to_prompt_value(db_data),
        "checklist_count": checklist_count,
    }

    if not any(checklist_context[key] for key in ("company_summary", "jd_summary", "db_data")):
        raise ValueError("체크리스트 생성을 위한 회사 요약, JD 요약, DB 데이터 중 최소 하나가 필요합니다.")

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
) -> list[str]:
    """회사 정보와 JD 정보를 받아 적합성 체크리스트 문자열 목록을 반환합니다."""

    if isinstance(cnt, bool) or not isinstance(cnt, int) or cnt <= 0:
        raise ValueError("cnt는 1 이상의 정수여야 합니다.")

    company_summary = sum_company(compinfo)
    jd_summary = sum_jd(jdinfo)
    return make_fit_checklist(
        company_summary=company_summary,
        jd_summary=jd_summary,
        checklist_count=cnt,
        user_query=user_query,
    )
