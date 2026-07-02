"""생성 결과를 근거 데이터와 비교해 점수화하는 피드백 평가 agent입니다."""

import json
import os
from typing import Any

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

from .prompt import (
    FEEDBACK_EVALUATION_SYSTEM_PROMPT,
    FEEDBACK_EVALUATION_USER_PROMPT,
)
from .utils import load_env

load_env()

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0
MAX_RESPONSE_ATTEMPTS = 3


################################################################
#                      helper
################################################################


def _get_openai_client():
    """피드백 평가에 사용할 OpenAI 클라이언트를 생성합니다."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되어 있지 않습니다.")
    return OpenAI(api_key=api_key)


def _messages(system_prompt: str, user_prompt: str) -> list[dict[str, str]]:
    """OpenAI 호출용 메시지 배열을 구성합니다."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _first_value(item: dict[str, Any], keys, default=""):
    """여러 후보 키 중 처음 발견한 값을 반환합니다."""

    for key in keys:
        if key in item:
            return item[key]
    return default


def _normalize_metrics(metrics):
    """모델이 객체 또는 다양한 키로 반환한 metrics를 표준 배열로 변환합니다."""

    if isinstance(metrics, dict):
        normalized = []
        for name, value in metrics.items():
            if isinstance(value, dict):
                score = _first_value(value, ("score", "점수"), 0)
                reason = _first_value(value, ("reason", "사유", "이유"), "")
            else:
                score = value
                reason = ""
            normalized.append(
                {"name": str(name), "score": int(score), "reason": str(reason)}
            )
        return normalized

    if not isinstance(metrics, list):
        return []

    normalized = []
    for item in metrics:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "name": str(_first_value(item, ("name", "이름", "기준", "항목"), "")),
                "score": int(_first_value(item, ("score", "점수"), 0)),
                "reason": str(_first_value(item, ("reason", "사유", "이유"), "")),
            }
        )
    return normalized


def _normalize_evidence_feedback(items):
    """한국어 또는 변형 키의 근거 피드백을 표준 영문 키 배열로 변환합니다."""

    if isinstance(items, dict):
        items = [items]
    if not isinstance(items, list):
        return []

    normalized = []
    for item in items:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "target": str(
                    _first_value(item, ("target", "위치", "대상", "항목"), "")
                ),
                "evidence": str(
                    _first_value(item, ("evidence", "근거", "증거"), "명시적 근거 없음")
                ),
                "feedback": str(
                    _first_value(item, ("feedback", "피드백", "문제", "설명"), "")
                ),
                "suggested_correction": str(
                    _first_value(
                        item,
                        (
                            "suggested_correction",
                            "권장 수정",
                            "권장수정",
                            "수정안",
                            "수정",
                        ),
                        "",
                    )
                ),
            }
        )
    return normalized


def _normalize_feedback_payload(payload):
    """JSON mode 응답의 흔한 형식 변형을 FeedbackEvaluation 구조로 정규화합니다."""

    if not isinstance(payload, dict):
        raise ValueError("피드백 응답은 JSON 객체여야 합니다.")

    normalized = dict(payload)
    normalized["metrics"] = _normalize_metrics(payload.get("metrics", []))
    normalized["evidence_feedback"] = _normalize_evidence_feedback(
        payload.get("evidence_feedback", [])
    )
    return normalized


def _create_json_completion(system_prompt: str, user_prompt: str, response_format):
    """자유형 corrected_output을 허용하는 JSON 응답을 생성한 뒤 Pydantic으로 검증합니다."""

    client = _get_openai_client()
    messages = _messages(system_prompt, user_prompt)

    # corrected_output은 체크리스트, 질문, 리포트마다 구조가 달라진다.
    # strict structured output 대신 JSON mode 후 Pydantic으로 공통 필드만 검증한다.
    last_error = None
    for _ in range(MAX_RESPONSE_ATTEMPTS):
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        try:
            payload = json.loads(content)
            normalized = _normalize_feedback_payload(payload)
            return response_format.model_validate(normalized)
        except (json.JSONDecodeError, TypeError, ValueError, ValidationError) as error:
            last_error = error
            messages.extend(
                [
                    {"role": "assistant", "content": content or ""},
                    {
                        "role": "user",
                        "content": (
                            f"이전 JSON이 스키마 검증에 실패했습니다: {error}. "
                            "모든 키를 지정된 영문 이름으로 사용하고 metrics와 "
                            "evidence_feedback을 객체가 아닌 배열로 고쳐 다시 반환해."
                        ),
                    },
                ]
            )

    raise ValueError(
        f"피드백 응답이 {MAX_RESPONSE_ATTEMPTS}회 후에도 스키마를 충족하지 못했습니다: "
        f"{last_error}"
    )


def _validate_evaluation_input(
    reference_data,
    output_data,
    evaluation_criteria,
):
    if not isinstance(reference_data, dict):
        raise ValueError("reference_data는 dict 형태여야 합니다.")
    if not isinstance(output_data, dict):
        raise ValueError("output_data는 dict 형태여야 합니다.")
    if not isinstance(evaluation_criteria, list) or not evaluation_criteria:
        raise ValueError("evaluation_criteria는 하나 이상의 문자열 리스트여야 합니다.")
    if not all(isinstance(item, str) and item.strip() for item in evaluation_criteria):
        raise ValueError("evaluation_criteria의 각 항목은 빈 값이 아닌 문자열이어야 합니다.")


################################################################
#                      feedback_evaluation_node
################################################################


class FeedbackMetric(BaseModel):
    """평가 기준 한 항목의 점수와 판단 사유입니다."""

    name: str = Field(description="평가 기준 이름")
    score: int = Field(ge=0, le=100, description="평가 기준 충족 점수")
    reason: str = Field(description="점수 판단 사유")


class EvidenceFeedback(BaseModel):
    """근거 데이터와 생성 결과 사이에서 발견한 문제와 수정 제안입니다."""

    target: str = Field(description="문제가 발견된 출력 위치 또는 항목")
    evidence: str = Field(description="검증 기준 데이터에서 확인한 근거")
    feedback: str = Field(description="문제 또는 판정에 대한 설명")
    suggested_correction: str = Field(description="권장 수정 내용")


class FeedbackEvaluation(BaseModel):
    """한 회차의 품질 점수, 안정 지표, 피드백과 수정 결과입니다."""

    corrected_output: dict[str, Any] = Field(
        description="입력 출력 형식을 유지하면서 피드백을 반영한 결과"
    )
    overall_score: int = Field(ge=0, le=100, description="전체 품질 점수")
    stability_score: int = Field(ge=0, le=100, description="결과의 안정성 점수")
    is_stable: bool = Field(description="추가 수정이 필요 없는 안정 상태 여부")
    metrics: list[FeedbackMetric] = Field(description="평가 기준별 점수 목록")
    evidence_feedback: list[EvidenceFeedback] = Field(
        description="근거 기반 문제와 수정 제안 목록"
    )
    feedback_query: str = Field(
        description="다음 생성 또는 재검증 호출에 전달할 수정 지시"
    )


feedback_evaluation_node = None

feedback_evaluation_prompt = FEEDBACK_EVALUATION_SYSTEM_PROMPT


def invoke_feedback_evaluation_node(
    reference_data,
    output_data,
    evaluation_criteria,
    previous_feedback=None,
) -> FeedbackEvaluation:
    """검증 기준과 생성 결과를 비교해 점수, 근거 피드백, 수정 결과를 생성합니다."""

    _validate_evaluation_input(reference_data, output_data, evaluation_criteria)
    context = {
        "reference_data": reference_data,
        "output_data": output_data,
        "evaluation_criteria": evaluation_criteria,
        "previous_feedback": previous_feedback or [],
    }
    context_json = json.dumps(context, ensure_ascii=False, indent=2)
    user_prompt = FEEDBACK_EVALUATION_USER_PROMPT.format(context_json=context_json)
    return _create_json_completion(
        feedback_evaluation_prompt,
        user_prompt,
        FeedbackEvaluation,
    )
