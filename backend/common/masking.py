"""LLM으로 민감 구간을 추출하고 Python 정규식으로 문자열을 마스킹·복원합니다."""

from copy import deepcopy
import json
import os
from pathlib import Path
import re

from openai import OpenAI
from pydantic import BaseModel, Field

from .prompt import (
    COMPANY_SUMMARY_SYSTEM_PROMPT,
    COMPANY_SUMMARY_USER_PROMPT,
    JD_SUMMARY_SYSTEM_PROMPT,
    JD_SUMMARY_USER_PROMPT,
    RESUME_MASKING_SYSTEM_PROMPT,
    RESUME_MASKING_USER_PROMPT,
    RESUME_SUMMARY_SYSTEM_PROMPT,
    RESUME_SUMMARY_USER_PROMPT,
)


MODEL_NAME = "gpt-4o-mini"


class MaskingResultItem(BaseModel):
    """민감 원문 한 개와 대응하는 고유 마스킹 토큰입니다."""

    original: str = Field(description="실제 입력에 존재하는 최소 민감 원문")
    token: str = Field(description="민감 원문을 치환할 고유 마스킹 토큰")


class MaskingResultStructure(BaseModel):
    """LLM이 찾은 최소 민감 원문과 치환 토큰 목록입니다."""

    masking_result: list[MaskingResultItem] = Field(
        description="최소 민감 원문과 고유 토큰의 목록"
    )


class ResumeStarAnalysisStructure(BaseModel):
    """자기소개서 질문과 답변 한 건의 STAR 분석 결과입니다."""

    answer: str = Field(description="자기소개서 답변의 간결한 STAR 분석문")


def _load_backend_env():
    """backend/.env의 환경 변수를 UTF-8로 읽어 런타임 환경에 보강합니다."""

    if os.environ.get("OPENAI_API_KEY"):
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


def serialize_input(data):
    """입력 dict를 후속 LLM에 전달할 UTF-8 JSON 문자열로 직렬화합니다."""

    if not isinstance(data, dict):
        raise ValueError("마스킹 입력은 dict 형태여야 합니다.")
    return json.dumps(data, ensure_ascii=False, indent=2)


def _validate_masking_result(source_text, masking_result):
    """매핑의 원문·토큰 타입, 입력 포함 여부와 토큰 고유성을 검증합니다."""

    if not isinstance(masking_result, dict):
        raise ValueError("masking_result는 dict 형태여야 합니다.")
    if not all(
        isinstance(original, str)
        and original
        and isinstance(token, str)
        and token
        for original, token in masking_result.items()
    ):
        raise ValueError("masking_result의 원문과 토큰은 빈 값이 아닌 문자열이어야 합니다.")
    if len(set(masking_result.values())) != len(masking_result):
        raise ValueError("서로 다른 민감 원문에는 고유한 토큰이 필요합니다.")

    missing = [original for original in masking_result if original not in source_text]
    if missing:
        raise ValueError(f"masking_result 원문이 입력에 없습니다: {missing}")


def apply_masking(source_text, masking_result):
    """민감 원문을 re.escape 정규식으로 만들어 JSON 문자열 전체에서 치환합니다."""

    if not isinstance(source_text, str):
        raise ValueError("source_text는 문자열이어야 합니다.")
    _validate_masking_result(source_text, masking_result)
    if not masking_result:
        return source_text

    masked_text = mask_data(source_text, masking_result)

    for original, token in masking_result.items():
        if original in masked_text:
            raise ValueError(f"민감 원문이 마스킹 결과에 남아 있습니다: {original}")
        if token not in masked_text:
            raise ValueError(f"마스킹 토큰이 결과에 반영되지 않았습니다: {token}")
    return masked_text


def mask_data(value, masking_result):
    """이미 추출된 매핑을 문자열 또는 중첩 dict/list에 적용합니다."""

    if isinstance(value, str):
        if not masking_result:
            return value
        originals = sorted(masking_result, key=len, reverse=True)
        pattern = re.compile("|".join(re.escape(original) for original in originals))
        return pattern.sub(lambda match: masking_result[match.group(0)], value)
    if isinstance(value, dict):
        return {
            key: mask_data(item, masking_result)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [mask_data(item, masking_result) for item in value]
    return value


def restore_masked_data(value, masking_result):
    """문자열 또는 중첩 dict/list 안의 토큰을 민감 원문으로 역치환합니다."""

    reverse_mapping = {token: original for original, token in masking_result.items()}
    if len(reverse_mapping) != len(masking_result):
        raise ValueError("복호화할 마스킹 토큰은 모두 고유해야 합니다.")

    if isinstance(value, str):
        restored = value
        for token in sorted(reverse_mapping, key=len, reverse=True):
            restored = restored.replace(token, reverse_mapping[token])
        return restored
    if isinstance(value, dict):
        return {
            key: restore_masked_data(item, masking_result)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [restore_masked_data(item, masking_result) for item in value]
    return value


def merge_masking_results(*results):
    """여러 체인의 원문-토큰 매핑을 충돌 없이 하나로 합칩니다."""

    merged = {}
    used_tokens = set()
    for result in results:
        for original, token in result.items():
            if original in merged and merged[original] != token:
                raise ValueError(f"같은 원문에 서로 다른 토큰이 지정되었습니다: {original}")
            if token in used_tokens and merged.get(original) != token:
                raise ValueError(f"서로 다른 원문에 같은 토큰이 지정되었습니다: {token}")
            merged[original] = token
            used_tokens.add(token)
    return merged


def _extract_masking_result(source_dict, system_prompt, user_prompt):
    """LLM에는 최소 민감 구간과 토큰 매핑만 요청합니다."""

    source_text = serialize_input(source_dict)
    parsed = _create_structured_completion(
        system_prompt,
        user_prompt.format(
            company_json=source_text,
            jd_json=source_text,
            resume_json=source_text,
        ),
        MaskingResultStructure,
    )
    masking_items = parsed.model_dump()["masking_result"]
    masking_result = {}
    for item in masking_items:
        original = item["original"]
        token = item["token"]
        if original in masking_result and masking_result[original] != token:
            raise ValueError(f"같은 민감 원문에 서로 다른 토큰이 지정되었습니다: {original}")
        masking_result[original] = token

    _validate_masking_result(source_text, masking_result)
    return source_text, masking_result


def _apply_resume_star_analysis(resume_dict):
    """지원서 복사본의 자기소개서 answer를 질문별 STAR 분석문으로 교체합니다."""

    result = deepcopy(resume_dict)
    introduction_key = next(
        (
            key
            for key in ("self_intoduction", "self_introduction")
            if key in result
        ),
        None,
    )
    if introduction_key is None or not result[introduction_key]:
        return result

    introductions = result[introduction_key]
    if not isinstance(introductions, list):
        raise ValueError(f"{introduction_key}은 list 형태여야 합니다.")

    for index, item in enumerate(introductions):
        if not isinstance(item, dict):
            raise ValueError(f"{introduction_key}[{index}]는 dict 형태여야 합니다.")
        analysis_input = {
            "question": item.get("question", ""),
            "answer": item.get("answer", ""),
        }
        parsed = _create_structured_completion(
            RESUME_SUMMARY_SYSTEM_PROMPT,
            RESUME_SUMMARY_USER_PROMPT.format(
                resume_json=json.dumps(analysis_input, ensure_ascii=False, indent=2)
            ),
            ResumeStarAnalysisStructure,
        )
        item["answer"] = parsed.answer.strip()
    return result


def mask_company(company_dict):
    """회사 민감 구간을 추출하고 Python 코드로 마스킹한 JSON 문자열을 반환합니다."""

    source_text, masking_result = _extract_masking_result(
        company_dict,
        COMPANY_SUMMARY_SYSTEM_PROMPT,
        COMPANY_SUMMARY_USER_PROMPT,
    )
    return {
        "outputdata": apply_masking(source_text, masking_result),
        "masking_result": masking_result,
    }


def mask_jd(jd_dict):
    """JD 민감 구간을 추출하고 Python 코드로 마스킹한 JSON 문자열을 반환합니다."""

    source_text, masking_result = _extract_masking_result(
        jd_dict,
        JD_SUMMARY_SYSTEM_PROMPT,
        JD_SUMMARY_USER_PROMPT,
    )
    return {
        "outputdata": apply_masking(source_text, masking_result),
        "masking_result": masking_result,
    }


def mask_resume(resume_dict):
    """자소서 STAR 분석 후 민감 구간을 추출해 마스킹한 JSON 문자열을 반환합니다."""

    star_resume = _apply_resume_star_analysis(resume_dict)
    source_text, masking_result = _extract_masking_result(
        star_resume,
        RESUME_MASKING_SYSTEM_PROMPT,
        RESUME_MASKING_USER_PROMPT,
    )
    return {
        "outputdata": apply_masking(source_text, masking_result),
        "masking_result": masking_result,
    }
