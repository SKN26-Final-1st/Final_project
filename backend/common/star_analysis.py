import json
import os
from typing import Any, List

import requests
from openai import OpenAI
from pydantic import BaseModel, Field

from .utils import load_env

load_env()


MODEL_NAME = "gpt-4o-mini"

FORMAT_INSTRUCTIONS = """
{
  "analyses": [
    {
      "index": 0,
      "s": "Situation",
      "t": "Task",
      "a": "Action",
      "r": "Result"
    }
  ],
  "original_quality": "원문 자기소개서 품질 평가"
}
""".strip()

star_analysis_prompt = """너는 채용 평가를 위한 자기소개서 STAR 분석가야. 각 자기소개서 답변을 Situation, Task, Action, Result로 나누어 한국어로 작성해. s, t, a, r 각각은 1문장 이내로 간결해야 한다. 입력에 없는 경험, 수치, 성과, 회사명, 인명은 만들지 말고, 마스킹 토큰은 원문 그대로 유지해. 원문에 근거가 부족하면 부족하다고 써야 하며, 부족한 근거를 채워 넣거나 만들어야 한다고 표현하지 마. 또한 original_quality에는 STAR 분석 전 원문 자기소개서가 전반적으로 얼마나 구조적이고 구체적으로 작성되었는지, 경험 맥락·행동·결과가 얼마나 명확한지 1~2문장으로 평가해. 원문이 부족한데 STAR 분석 결과만 좋아 보일 수 있는 위험도 함께 언급해."""

star_analysis_user_prompt = """다음 자기소개서 문항과 답변을 각각 STAR 관점으로 분석해줘. analyses는 입력 항목 수와 같은 개수여야 하고, index는 입력 index와 같아야 해. 마지막에 original_quality도 반드시 작성해.

[출력 형식]
{format_instructions}

[주의]
- 반드시 JSON object 하나만 반환해.
- analyses 내부 항목은 index, s, t, a, r만 포함해.
- original_quality에는 원문 품질과 STAR 변환으로 과대평가될 위험을 평가해.
- "원문에 없는 근거를 채워 넣어야 한다", "경험의 근거를 만들어야 한다"처럼 없는 근거를 생성하라는 표현은 쓰지 마.

{context_json}"""


class SelfIntroStarAnalysisItem(BaseModel):
    """자기소개서 답변 1개에 대한 STAR 분석 결과입니다."""

    index: int = Field(description="입력 자기소개서 항목의 index")
    s: str = Field(description="Situation: 답변에 드러난 상황 또는 배경")
    t: str = Field(description="Task: 지원자가 해결해야 했던 과제 또는 목표")
    a: str = Field(description="Action: 지원자가 실제로 취한 행동")
    r: str = Field(description="Result: 행동의 결과 또는 변화")


class SelfIntroStarAnalysisStructure(BaseModel):
    """자기소개서 답변 목록에 대한 STAR 분석 응답 스키마입니다."""

    analyses: List[SelfIntroStarAnalysisItem] = Field(
        description="입력 자기소개서 항목 수와 같은 STAR 분석 결과 목록"
    )
    original_quality: str = Field(
        description="STAR 분석 전 원문의 작성 품질과 STAR 변환으로 원문보다 좋아 보일 수 있는 과대평가 위험. 없는 근거를 만들라는 표현은 금지"
    )


client = None


def get_client():
    """STAR 분석에 사용할 OpenAI 클라이언트를 지연 생성해 재사용합니다."""

    global client

    if client is not None:
        return client

    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return client


def normalize_self_intro_items(self_intro):
    items = []
    for index, item in enumerate(self_intro):
        if isinstance(item, dict):
            answer = item.get("answer") or item.get("content") or item.get("description") or ""
            question = item.get("question") or item.get("title") or ""
        else:
            answer = str(item)
            question = ""

        if str(answer).strip():
            items.append(
                {
                    "index": index,
                    "question": question,
                    "answer": answer,
                }
            )
    return items


def _normalize_result(result: Any) -> dict[str, Any] | None:
    if hasattr(result, "model_dump"):
        result = result.model_dump()

    if not isinstance(result, dict):
        return None

    analyses = result.get("analyses")
    if not isinstance(analyses, list):
        return None

    normalized = []
    for item in analyses:
        if hasattr(item, "model_dump"):
            item = item.model_dump()
        if not isinstance(item, dict):
            continue

        try:
            index = int(item.get("index"))
        except (TypeError, ValueError):
            continue

        normalized.append(
            {
                "index": index,
                "s": item.get("s", "") if isinstance(item.get("s", ""), str) else "",
                "t": item.get("t", "") if isinstance(item.get("t", ""), str) else "",
                "a": item.get("a", "") if isinstance(item.get("a", ""), str) else "",
                "r": item.get("r", "") if isinstance(item.get("r", ""), str) else "",
            }
        )

    original_quality = result.get("original_quality", "")
    if not isinstance(original_quality, str):
        original_quality = ""

    return {
        "analyses": normalized,
        "original_quality": original_quality,
    }


def invoke_openai(star_inputs):
    """자기소개서 문항/답변 목록을 받아 STAR 분석 결과를 생성합니다."""

    ai_client = get_client()
    context_json = json.dumps({"self_introduction": star_inputs}, ensure_ascii=False, indent=2)
    messages = [
        {"role": "system", "content": star_analysis_prompt},
        {
            "role": "user",
            "content": star_analysis_user_prompt.format(
                format_instructions=FORMAT_INSTRUCTIONS,
                context_json=context_json,
            ),
        },
    ]

    parse_method = getattr(ai_client.beta.chat.completions, "parse", None)
    if parse_method:
        response = parse_method(
            model=MODEL_NAME,
            messages=messages,
            response_format=SelfIntroStarAnalysisStructure,
        )
        return response.choices[0].message.parsed.model_dump()

    response = ai_client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        response_format={"type": "json_object"},
    )

    return SelfIntroStarAnalysisStructure.model_validate_json(
        response.choices[0].message.content
    ).model_dump()


RUNPOD_ENDPOINT_ID = os.environ.get("RUNPOD_STAR_ENDPOINT_ID")
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY")


def invoke_runpod(star_inputs):
    if not RUNPOD_ENDPOINT_ID or not RUNPOD_API_KEY:
        return 0, None

    indata = json.dumps({"self_introduction": star_inputs}, ensure_ascii=False, indent=2)

    url = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/runsync"

    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "input": {
            "instr": indata
        }
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=600,
        )
    except requests.RequestException:
        return 0, None

    if response.status_code != 200:
        return response.status_code, None

    try:
        response_data = response.json()
    except ValueError:
        return response.status_code, None

    output = response_data.get("output")
    if not isinstance(output, dict):
        return response.status_code, None

    result = _normalize_result(output.get("result"))
    if result is None:
        return response.status_code, None

    return response.status_code, result


def invoke(self_intro: Any):
    """자기소개서 문항/답변 목록을 STAR 분석 결과 dict로 변환합니다."""

    if not isinstance(self_intro, list):
        return {
            "analyses": [],
            "original_quality": "",
        }

    star_inputs = normalize_self_intro_items(self_intro)
    if not star_inputs:
        return {
            "analyses": [],
            "original_quality": "",
        }

    status_code, result = invoke_runpod(star_inputs)
    if status_code == 200 and result is not None:
        return result

    result = _normalize_result(invoke_openai(star_inputs))
    if result is None:
        return {
            "analyses": [],
            "original_quality": "",
        }

    return result
