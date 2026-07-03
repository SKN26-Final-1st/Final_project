from typing import Any

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from . import analysis_agent as agents
from . import feedback_graph
from .analysis_prompt import (
    VERSION,
    CHECKLIST_FEEDBACK_CRITERIA,
    INTERVIEW_FEEDBACK_CRITERIA,
    REPORT_FEEDBACK_CRITERIA,
)


################################################################
#                      state definition
################################################################

MAX_FIT_VERIFICATION_ATTEMPTS = 3


class AnalysisGraphState(TypedDict, total=False):
    """리포트/질문 생성 그래프의 입력, 중간 산출물, 최종 결과를 담는 상태입니다."""

    company_dict: dict
    jd_dict: dict
    checklist: list[str]
    resume_dict: dict
    star_resume_dict: dict
    fit_checks: list[dict[str, Any]]
    questions: list[dict[str, Any]]
    report: dict[str, Any]
    fit_feedback: dict[str, Any]
    question_feedback: dict[str, Any]
    report_feedback: dict[str, Any]
    result: dict[str, Any]


################################################################
#                      node definition
################################################################


def _normalize_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n", ""}:
            return False
    return bool(value)


def normalize_fit_checks(fit_checks):
    """dict, Pydantic 객체, list 형태의 체크 결과를 checklist/result 리스트로 표준화합니다."""

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
            if hasattr(item, "model_dump"):
                item = item.model_dump()
            if not isinstance(item, dict):
                raise ValueError("체크 결과 리스트 항목은 dict 형태여야 합니다.")

            content = item.get("content", item.get("checklist", item.get("question", "")))
            result = item.get("result", item.get("is_checked", False))
            normalized.append({"content": content, "result": _normalize_bool(result)})
        return normalized

    raise ValueError("fit_checks는 list 또는 dict 형태여야 합니다.")


def star_analysis_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """자기소개서 답변란을 {s, t, a, r} 분석 결과로 대체하고 원문 품질을 추가합니다."""

    star_resume_dict = agents.invoke_star_analysis_node(
        state["resume_dict"]
    )
    return {
        "resume_dict": star_resume_dict,
        "star_resume_dict": star_resume_dict,
    }


def check_resume_fit_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """이력서가 각 체크리스트 항목을 충족하는지 T/F로 1차 판정합니다."""

    fit_checks = agents.invoke_check_resume_fit_node(
        resume_summary=state["resume_dict"],
        checklist=state["checklist"],
    )
    return {"fit_checks": fit_checks}


def fit_feedback_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """체크리스트 T/F 판정 결과를 피드백 루프로 검증하고 보정합니다."""

    fit_checks = normalize_fit_checks(state["fit_checks"])
    fit_feedback = feedback_graph.invoke(
        reference_data={"resume_info": state["resume_dict"]},
        initial_output={"checklist": fit_checks},
        evaluation_criteria=CHECKLIST_FEEDBACK_CRITERIA,
        min_score=95,
        max_attempts=MAX_FIT_VERIFICATION_ATTEMPTS,
    )
    return {
        "fit_checks": normalize_fit_checks(fit_feedback["outputdata"]["checklist"]),
        "fit_feedback": fit_feedback,
    }


def interview_questions_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """검증된 체크리스트 결과를 바탕으로 면접 질문/답변/의도를 생성합니다."""

    questions = agents.invoke_interview_questions_node(
        resume_summary=state["resume_dict"],
        company_summary=state["company_dict"],
        jd_summary=state["jd_dict"],
        checklist_checks=state["fit_checks"],
    )
    return {"questions": questions}


def question_feedback_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """생성된 면접 질문 10개를 피드백 루프로 검증하고 보정합니다."""

    if not isinstance(state["questions"], list):
        raise ValueError("questions는 list 형태여야 합니다.")

    question_feedback = feedback_graph.invoke(
        reference_data={
            "resume_info": state["resume_dict"],
            "company_info": state["company_dict"],
            "jd_info": state["jd_dict"],
            "checklist_checks": normalize_fit_checks(state["fit_checks"]),
        },
        initial_output={"questions": state["questions"]},
        evaluation_criteria=INTERVIEW_FEEDBACK_CRITERIA,
        min_score=85,
        max_attempts=3,
    )
    return {
        "questions": question_feedback["outputdata"]["questions"],
        "question_feedback": question_feedback,
    }


def report_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """검증된 체크리스트 결과를 바탕으로 최종 분석 리포트를 생성합니다."""

    report = agents.invoke_report_node(
        resume_summary=state["resume_dict"],
        fit_checks=normalize_fit_checks(state["fit_checks"]),
    )
    return {"report": report}


def report_feedback_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """생성된 리포트를 피드백 루프로 검증하고 보정합니다."""

    if not isinstance(state["report"], dict):
        raise ValueError("report_data는 dict 형태여야 합니다.")

    report_feedback = feedback_graph.invoke(
        reference_data={
            "resume_info": state["resume_dict"],
            "company_info": state["company_dict"],
            "jd_info": state["jd_dict"],
            "checklist_checks": normalize_fit_checks(state["fit_checks"]),
        },
        initial_output=state["report"],
        evaluation_criteria=REPORT_FEEDBACK_CRITERIA,
        min_score=95,
        max_attempts=3,
    )
    return {
        "report": report_feedback["outputdata"],
        "report_feedback": report_feedback,
    }


def finalize_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """리포트 결과에 면접 질문 목록을 합쳐 기존 API 반환 형식을 맞춥니다."""

    result = dict(state["report"])
    result["question"] = state["questions"]
    return {"result": result}


################################################################
#                      conditional edge
################################################################


################################################################
#                      graph builder
################################################################

graph_instance = None


def build_graph():
    """체크리스트 판정부터 질문/리포트 생성까지의 전체 분석 그래프를 구성합니다."""

    builder = StateGraph(AnalysisGraphState)

    builder.add_node("star_analysis", star_analysis_node)
    builder.add_node("check_resume_fit", check_resume_fit_node)
    builder.add_node("fit_feedback", fit_feedback_node)
    builder.add_node("interview_questions", interview_questions_node)
    builder.add_node("question_feedback", question_feedback_node)
    builder.add_node("report", report_node)
    builder.add_node("report_feedback", report_feedback_node)
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "star_analysis")
    builder.add_edge("star_analysis", "check_resume_fit")
    builder.add_edge("check_resume_fit", "fit_feedback")
    builder.add_edge("fit_feedback", "interview_questions")
    builder.add_edge("interview_questions", "question_feedback")
    builder.add_edge("question_feedback", "report")
    builder.add_edge("report", "report_feedback")
    builder.add_edge("report_feedback", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


def get_graph():
    global graph_instance

    if graph_instance is None:
        graph_instance = build_graph()

    return graph_instance


################################################################
#                      invoke
################################################################


def invoke(
    company_dict: dict,
    jd_dict: dict,
    checklist: list[str],
    resume_dict: dict,
) -> dict[str, Any]:
    """외부에서 분석 그래프를 호출할 때 사용하는 진입점입니다."""

    state: AnalysisGraphState = {
        "company_dict": company_dict,
        "jd_dict": jd_dict,
        "checklist": checklist,
        "resume_dict": resume_dict,
    }
    result = get_graph().invoke(state)
    return result["result"]

def get_version():
    return VERSION
