import json
import os
from copy import deepcopy
from typing import Any, List

from openai import OpenAI
from pydantic import BaseModel, Field

from .feedback import run_feedback_loop

from .prompt import (
    CHECKLIST_FEEDBACK_CRITERIA,
    CHECK_RESUME_FIT_SYSTEM_PROMPT,
    CHECK_RESUME_FIT_USER_PROMPT,
    INTERVIEW_FEEDBACK_CRITERIA,
    INTERVIEW_QUESTION_SYSTEM_PROMPT,
    INTERVIEW_QUESTION_USER_PROMPT,
    REPORT_FEEDBACK_CRITERIA,
    REPORT_SYSTEM_PROMPT,
    REPORT_USER_PROMPT,
)

from .utils import load_env

load_env()


MODEL_NAME = "gpt-4o-mini"
QUESTION_COUNT = 10
MAX_FIT_VERIFICATION_ATTEMPTS = 3


STAR_ANALYSIS_SYSTEM_PROMPT = (
    "너는 채용 평가를 위한 자기소개서 STAR 분석가야. "
    "각 자기소개서 답변을 Situation, Task, Action, Result로 나누어 한국어로 작성해. "
    "s, t, a, r 각각은 1문장 이내로 간결해야 한다. "
    "purpose에는 해당 자기소개서 문항과 답변으로 평가할 수 있는 역량 또는 평가 의도를 1문장으로 작성해. "
    "입력에 없는 경험, 수치, 성과, 회사명, 인명은 만들지 말고, 마스킹 토큰은 원문 그대로 유지해. "
    "또한 original_quality에는 STAR 분석 전 원문 자기소개서가 전반적으로 얼마나 구조적이고 구체적으로 작성되었는지, "
    "경험 맥락·행동·결과가 얼마나 명확한지 1~2문장으로 평가해. "
    "원문이 부족한데 STAR 분석 결과만 좋아 보일 수 있는 위험도 함께 언급해."
)
STAR_ANALYSIS_USER_PROMPT = (
    "다음 자기소개서 문항과 답변을 각각 STAR 관점으로 분석해줘. "
    "analyses는 입력 항목 수와 같은 개수여야 하고, index는 입력 index와 같아야 해. "
    "마지막에 original_quality도 반드시 작성해.\n\n"
    "{context_json}"
)

class InterviewQuestionAnswer(BaseModel):
    """면접 질문 1개에 필요한 질문, 모범 답안, 평가 의도를 담는 스키마입니다."""

    """면접 질문 한 개에 필요한 질문, 예상 답변, 질문 의도를 담는 구조입니다."""

    question: str = Field(
        description="지원서, 회사 정보, JD, 체크리스트 비교 결과를 종합해서 생성한 면접 질문"
    )
    answer: str = Field(
        description="지원서 내용을 기반으로 지원자가 답변할 수 있는 모범 답안"
    )
    purpose: str = Field(
        description="이 질문으로 확인하려는 평가 의도"
    )


class SelfIntroStarAnalysisItem(BaseModel):
    """자기소개서 답변 1개에 대한 STAR 분석 결과입니다."""

    index: int = Field(description="입력 자기소개서 항목의 index")
    s: str = Field(description="Situation: 답변에 드러난 상황 또는 배경")
    t: str = Field(description="Task: 지원자가 해결해야 했던 과제 또는 목표")
    a: str = Field(description="Action: 지원자가 실제로 취한 행동")
    r: str = Field(description="Result: 행동의 결과 또는 변화")
    purpose: str = Field(description="해당 자기소개서 문항과 답변으로 평가할 수 있는 역량 또는 평가 의도")


class SelfIntroStarAnalysisStructure(BaseModel):
    """자기소개서 답변 목록에 대한 STAR 분석 응답 스키마입니다."""

    analyses: List[SelfIntroStarAnalysisItem] = Field(
        description="입력 자기소개서 항목 수와 같은 STAR 분석 결과 목록"
    )
    original_quality: str = Field(
        description="STAR 분석 전 자기소개서 원문의 전반적인 작성 품질과 과대평가 위험"
    )


class InterviewQuestionsStructure(BaseModel):
    """면접 질문 생성 LLM 응답을 questions 배열로 고정하는 스키마입니다."""

    """LLM이 생성한 여러 면접 질문을 리스트 형태로 받기 위한 응답 스키마입니다."""

    questions: List[InterviewQuestionAnswer] = Field(
        description="면접 질문, 모범 답안, 질문 의도 목록"
    )


class ChecklistCheckItem(BaseModel):
    """체크리스트 1개 항목의 원문과 충족 여부를 담는 스키마입니다."""

    """체크리스트 한 문항과 이력서 요약 기준 충족 여부를 함께 표현합니다."""

    content: str = Field(
        description="체크리스트 원문"
    )
    result: bool = Field(
        description="지원서 요약 기준 체크리스트 충족 여부"
    )


class ChecklistCheckStructure(BaseModel):
    """체크리스트 전체 T/F 판정 결과를 담는 스키마입니다."""

    """체크리스트 전체에 대한 충족/미충족 판단 결과를 묶어 받는 구조입니다."""

    checklist: List[ChecklistCheckItem] = Field(
        description="체크리스트 항목별 충족 여부 목록"
    )


class ReportStructure(BaseModel):
    """최종 채용 평가 리포트의 필드 구조를 고정하는 스키마입니다."""

    """최종 채용 평가 리포트에 들어갈 등급, 요약, 분석 항목을 정의합니다."""

    overall_grade: str = Field(
        description="지원자 전체 적합 등급. 예: A, B, C, D"
    )
    overall_summary: str = Field(
        description="지원자 적합도에 대한 전체 요약"
    )
    candidate_summary: str = Field(
        description="지원서 요약을 바탕으로 정리한 지원자 핵심 요약"
    )
    checklist: List[ChecklistCheckItem] = Field(
        description="체크리스트 항목별 충족 여부 목록"
    )
    competency_analysis: List[str] = Field(
        description="지원자의 역량 분석 목록"
    )
    fit_analysis: str = Field(
        description="체크리스트 충족 여부를 바탕으로 한 지원자의 직무 적합성 분석"
    )
    motive: str = Field(
        description="지원서 내용을 바탕으로 분석한 지원 동기"
    )
    collaboration: str = Field(
        description="지원서의 협업 경험을 바탕으로 분석한 협업 능력"
    )
    strength: List[str] = Field(
        description="지원자의 강점 목록"
    )
    concern: List[str] = Field(
        description="지원자 검증 필요 사항 또는 우려 사항 목록"
    )
    check_point: List[str] = Field(
        description="면접 또는 추가 검증에서 확인해야 할 포인트 목록"
    )
    final_comment: str = Field(
        description="최종 평가 코멘트"
    )


def _get_openai_client():
    """환경 변수에서 API 키를 확인한 뒤 OpenAI 클라이언트를 생성합니다."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되어 있지 않습니다.")

    return OpenAI(api_key=api_key)


def _is_empty_input(value):
    """None, 빈 문자열, 빈 dict/list처럼 프롬프트 입력으로 의미 없는 값을 판별합니다."""

    return value is None or value == "" or value == {} or value == []


def _normalize_bool(value):
    """LLM이나 외부 입력에서 온 bool 유사 값을 실제 bool로 표준화합니다."""

    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n", ""}:
            return False
    return bool(value)


def _normalize_checklist(checklist):
    """Pydantic 객체, dict, list 등으로 들어온 체크리스트를 문자열 리스트로 표준화합니다."""

    if hasattr(checklist, "checklist") and isinstance(checklist.checklist, list):
        return checklist.checklist
    if hasattr(checklist, "model_dump"):
        dumped = checklist.model_dump()
        if isinstance(dumped, dict) and isinstance(dumped.get("checklist"), list):
            return dumped["checklist"]
    if isinstance(checklist, list):
        normalized = []
        for item in checklist:
            if isinstance(item, str):
                normalized.append(item)
            elif isinstance(item, ChecklistCheckItem):
                normalized.append(item.content)
            elif isinstance(item, dict):
                normalized.append(item.get("content") or item.get("checklist") or item.get("question") or str(item))
            else:
                normalized.append(str(item))
        return normalized
    if isinstance(checklist, dict):
        if "checklist" in checklist and isinstance(checklist["checklist"], list):
            return checklist["checklist"]
        return list(checklist.keys())

    raise ValueError("checklist는 FitChecklistStructure, list, dict 중 하나여야 합니다.")


def _normalize_fit_checks(fit_checks):
    """dict, Pydantic 객체, list 형태의 체크 결과를 checklist/result 리스트로 표준화합니다."""

    if isinstance(fit_checks, ChecklistCheckStructure):
        return [item.model_dump() for item in fit_checks.checklist]
    if hasattr(fit_checks, "model_dump"):
        dumped = fit_checks.model_dump()
        if isinstance(dumped, dict):
            fit_checks = dumped.get("checklist", dumped.get("checks", dumped))

    if isinstance(fit_checks, dict):
        if "checklist" in fit_checks and isinstance(fit_checks["checklist"], list):
            fit_checks = fit_checks["checklist"]
        elif "checks" in fit_checks and isinstance(fit_checks["checks"], list):
            fit_checks = fit_checks["checks"]
        else:
            return [
                {"content": str(content), "result": _normalize_bool(result)}
                for content, result in fit_checks.items()
            ]

    if isinstance(fit_checks, list):
        normalized = []
        for item in fit_checks:
            if isinstance(item, ChecklistCheckItem):
                normalized.append(item.model_dump())
            elif isinstance(item, dict):
                content = item.get("content", item.get("checklist", item.get("question", "")))
                result = item.get("result", item.get("is_checked", False))
                normalized.append({"content": content, "result": _normalize_bool(result)})
            else:
                raise ValueError("체크 결과 리스트 항목은 dict 또는 ChecklistCheckItem이어야 합니다.")
        return normalized

    raise ValueError("fit_checks는 ChecklistCheckStructure, list, dict 중 하나여야 합니다.")


def _messages(system_prompt, user_prompt):
    """OpenAI Chat Completion 호출에 맞는 system/user 메시지 배열을 구성합니다."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _create_structured_completion(system_prompt, user_prompt, response_format):
    """Pydantic 스키마에 맞춘 구조화 응답을 생성하고, parse 미지원 시 JSON 검증으로 보완합니다."""

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


def _get_self_intro_key(resume_summary):
    """지원서 dict에서 자기소개서 필드명을 찾습니다."""

    if not isinstance(resume_summary, dict):
        return None
    if isinstance(resume_summary.get("self_intoduction"), list):
        return "self_intoduction"
    if isinstance(resume_summary.get("self_introduction"), list):
        return "self_introduction"
    return None


def _extract_self_intro_items(self_intro):
    """자기소개서 배열에서 문항/답변 쌍을 STAR 분석 입력 형태로 정리합니다."""

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


def analyze_resume_self_intro_with_star(resume_summary: Any):
    """자기소개서 답변란을 {s, t, a, r} 분석 결과로 대체한 지원서 dict를 반환합니다."""

    self_intro_key = _get_self_intro_key(resume_summary)
    if not self_intro_key:
        return resume_summary

    self_intro = resume_summary.get(self_intro_key) or []
    star_inputs = _extract_self_intro_items(self_intro)
    if not star_inputs:
        return resume_summary

    context_json = json.dumps({"self_introduction": star_inputs}, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        STAR_ANALYSIS_SYSTEM_PROMPT,
        STAR_ANALYSIS_USER_PROMPT.format(context_json=context_json),
        SelfIntroStarAnalysisStructure,
    )
    analysis_by_index = {
        item.index: (
            {
                "s": item.s.strip(),
                "t": item.t.strip(),
                "a": item.a.strip(),
                "r": item.r.strip(),
            },
            item.purpose.strip(),
        )
        for item in parsed.analyses
        if (
            isinstance(item.index, int)
            and any((item.s.strip(), item.t.strip(), item.a.strip(), item.r.strip(), item.purpose.strip()))
        )
    }

    updated_resume = deepcopy(resume_summary)
    updated_self_intro = deepcopy(self_intro)
    for index, (star_analysis, purpose) in analysis_by_index.items():
        if index < 0 or index >= len(updated_self_intro):
            continue

        item = updated_self_intro[index]
        if isinstance(item, dict):
            if "answer" in item:
                item["answer"] = star_analysis
            elif "content" in item:
                item["content"] = star_analysis
            elif "description" in item:
                item["description"] = star_analysis
            else:
                item["answer"] = star_analysis
            item["purpose"] = purpose
        else:
            updated_self_intro[index] = {
                "question": "",
                "answer": star_analysis,
                "purpose": purpose,
            }

    updated_resume[self_intro_key] = updated_self_intro
    updated_resume["original_quality"] = parsed.original_quality.strip()
    return updated_resume


def make_interview_questions(
    resume_summary: Any,
    company_summary: Any,
    jd_summary: Any,
    checklist_checks,
    question_count=QUESTION_COUNT,
):
    # 검증된 체크리스트 결과와 회사/JD/이력서 정보를 바탕으로 면접 질문 10개를 생성합니다.
    """이력서, 회사, JD, 적합성 체크 결과를 종합해 면접 질문과 예상 답변을 생성합니다."""

    interview_context = {
        "resume_info": resume_summary,
        "company_info": company_summary,
        "jd_info": jd_summary,
        "checklist_checks": checklist_checks,
        "question_count": question_count,
    }
    context_json = json.dumps(interview_context, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        INTERVIEW_QUESTION_SYSTEM_PROMPT,
        INTERVIEW_QUESTION_USER_PROMPT.format(
            question_count=question_count,
            context_json=context_json,
        ),
        InterviewQuestionsStructure,
    )
    return [item.model_dump() for item in parsed.questions]


def check_resume_fit(resume_summary: Any, checklist):
    # 이력서 요약이 각 체크리스트 항목을 충족하는지 LLM으로 1차 판정합니다.

    """이력서 요약이 각 체크리스트 기준을 충족하는지 LLM으로 판정합니다."""

    checklist_items = _normalize_checklist(checklist)

    if _is_empty_input(resume_summary):
        raise ValueError("지원서 요약이 필요합니다.")
    if not checklist_items:
        raise ValueError("비교할 체크리스트가 필요합니다.")

    check_context = {
        "resume_info": resume_summary,
        "checklist": checklist_items,
    }
    context_json = json.dumps(check_context, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        CHECK_RESUME_FIT_SYSTEM_PROMPT,
        CHECK_RESUME_FIT_USER_PROMPT.format(context_json=context_json),
        ChecklistCheckStructure,
    )
    return [item.model_dump() for item in parsed.checklist]


def evaluate_resume_fit_with_feedback(
    resume_info: Any,
    fit_checks,
    max_attempts=MAX_FIT_VERIFICATION_ATTEMPTS,
):
    # 체크리스트 T/F 판정이 근거와 일치하는지 피드백 루프로 검증합니다.
    """체크리스트 T/F 결과를 공통 피드백 모듈로 점수화하고 안정화합니다."""

    checklist_results = _normalize_fit_checks(fit_checks)
    if _is_empty_input(resume_info):
        raise ValueError("지원자 정보가 필요합니다.")
    if not checklist_results:
        raise ValueError("재검증할 체크리스트 결과가 필요합니다.")

    return run_feedback_loop(
        reference_data={"resume_info": resume_info},
        initial_output={"checklist": checklist_results},
        evaluation_criteria=CHECKLIST_FEEDBACK_CRITERIA,
        min_score=95,
        max_attempts=max_attempts,
    )


def validate_resume_fit_with_feedback(
    resume_info,
    fit_checks,
    max_attempts=MAX_FIT_VERIFICATION_ATTEMPTS,
):
    # 기존 호출부 호환을 위해 보정된 checklist 배열만 반환하는 래퍼입니다.
    """기존 파이프라인을 위해 안정화된 체크리스트 배열만 반환합니다."""

    result = evaluate_resume_fit_with_feedback(
        resume_info=resume_info,
        fit_checks=fit_checks,
        max_attempts=max_attempts,
    )
    return _normalize_fit_checks(result["outputdata"]["checklist"])


def make_report(resume_summary: Any, fit_checks):
    # 검증된 체크리스트 결과를 바탕으로 최종 분석 리포트를 생성합니다.

    """이력서 요약과 체크리스트 판정 결과를 이용해 최종 평가 리포트를 생성합니다."""

    checklist_results = _normalize_fit_checks(fit_checks)

    if _is_empty_input(resume_summary):
        raise ValueError("지원서 요약이 필요합니다.")
    if _is_empty_input(checklist_results):
        raise ValueError("지원자 적합 체크 결과가 필요합니다.")

    report_context = {
        "resume_info": resume_summary,
        "checklist": checklist_results,
    }
    context_json = json.dumps(report_context, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        REPORT_SYSTEM_PROMPT,
        REPORT_USER_PROMPT.format(context_json=context_json),
        ReportStructure,
    )
    report = parsed.model_dump()
    report["checklist"] = checklist_results
    return report


def evaluate_interview_questions_with_feedback(
    resume_info: Any,
    company_info: Any,
    jd_info: Any,
    fit_checks,
    questions,
    max_attempts=3,
):
    # 생성된 질문 10개가 근거형/번외형 구성과 중복 기준을 만족하는지 검증합니다.
    """10개 면접 질문의 근거성, 번외 질문 구성과 중복 여부를 평가·안정화합니다."""

    if not isinstance(questions, list):
        raise ValueError("questions는 list 형태여야 합니다.")

    return run_feedback_loop(
        reference_data={
            "resume_info": resume_info,
            "company_info": company_info,
            "jd_info": jd_info,
            "checklist_checks": _normalize_fit_checks(fit_checks),
        },
        initial_output={"questions": questions},
        evaluation_criteria=INTERVIEW_FEEDBACK_CRITERIA,
        min_score=85,
        max_attempts=max_attempts,
    )


def evaluate_report_with_feedback(
    resume_info: Any,
    company_info: Any,
    jd_info: Any,
    fit_checks,
    report_data,
    max_attempts=3,
):
    # 생성된 리포트가 체크리스트 결과와 지원자 근거를 일관되게 반영했는지 검증합니다.
    """최종 리포트의 체크리스트 반영률과 원본 정보 일치성을 평가·안정화합니다."""

    if not isinstance(report_data, dict):
        raise ValueError("report_data는 dict 형태여야 합니다.")

    return run_feedback_loop(
        reference_data={
            "resume_info": resume_info,
            "company_info": company_info,
            "jd_info": jd_info,
            "checklist_checks": _normalize_fit_checks(fit_checks),
        },
        initial_output=report_data,
        evaluation_criteria=REPORT_FEEDBACK_CRITERIA,
        min_score=95,
        max_attempts=max_attempts,
    )


def invoke(
    company_dict: dict,
    jd_dict: dict,
    checklist: list[str],
    resume_dict: dict,
):
    # Celery/API에서 호출하는 리포트 분석 진입점입니다. 실제 순서는 analysis_graph가 관리합니다.
    """입력 데이터를 그대로 사용해 적합성 판단, 면접 질문, 리포트 생성을 순서대로 실행합니다."""

    from .analysis_graph import invoke_analysis_graph

    return invoke_analysis_graph(
        company_dict=company_dict,
        jd_dict=jd_dict,
        checklist=checklist,
        resume_dict=resume_dict,
    )
