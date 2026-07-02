"""LangGraph orchestration for resume analysis report generation."""

from typing import Any

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict


class AnalysisGraphState(TypedDict, total=False):
    """리포트/질문 생성 그래프의 입력, 중간 산출물, 최종 결과를 담는 상태입니다."""

    company_dict: dict
    jd_dict: dict
    checklist: list[str]
    resume_dict: dict
    fit_checks: list[dict[str, Any]]
    questions: list[dict[str, Any]]
    report: dict[str, Any]
    fit_feedback: dict[str, Any]
    question_feedback: dict[str, Any]
    report_feedback: dict[str, Any]
    result: dict[str, Any]


def check_resume_fit_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """이력서가 각 체크리스트 항목을 충족하는지 T/F로 1차 판정합니다."""

    from . import report as report_service

    fit_checks = report_service.check_resume_fit(
        resume_summary=state["resume_dict"],
        checklist=state["checklist"],
    )
    return {"fit_checks": fit_checks}


def fit_feedback_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """체크리스트 T/F 판정 결과를 피드백 루프로 검증하고 보정합니다."""

    from . import report as report_service

    fit_feedback = report_service.evaluate_resume_fit_with_feedback(
        resume_info=state["resume_dict"],
        fit_checks=state["fit_checks"],
    )
    return {
        "fit_checks": report_service._normalize_fit_checks(
            fit_feedback["outputdata"]["checklist"]
        ),
        "fit_feedback": fit_feedback,
    }


def interview_questions_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """검증된 체크리스트 결과를 바탕으로 면접 질문/답변/의도를 생성합니다."""

    from . import report as report_service

    questions = report_service.make_interview_questions(
        resume_summary=state["resume_dict"],
        company_summary=state["company_dict"],
        jd_summary=state["jd_dict"],
        checklist_checks=state["fit_checks"],
    )
    return {"questions": questions}


def question_feedback_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """생성된 면접 질문 10개를 피드백 루프로 검증하고 보정합니다."""

    from . import report as report_service

    question_feedback = report_service.evaluate_interview_questions_with_feedback(
        resume_info=state["resume_dict"],
        company_info=state["company_dict"],
        jd_info=state["jd_dict"],
        fit_checks=state["fit_checks"],
        questions=state["questions"],
    )
    return {
        "questions": question_feedback["outputdata"]["questions"],
        "question_feedback": question_feedback,
    }


def report_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """검증된 체크리스트 결과를 바탕으로 최종 분석 리포트를 생성합니다."""

    from . import report as report_service

    report = report_service.make_report(
        resume_summary=state["resume_dict"],
        fit_checks=state["fit_checks"],
    )
    return {"report": report}


def report_feedback_node(state: AnalysisGraphState) -> AnalysisGraphState:
    """생성된 리포트를 피드백 루프로 검증하고 보정합니다."""

    from . import report as report_service

    report_feedback = report_service.evaluate_report_with_feedback(
        resume_info=state["resume_dict"],
        company_info=state["company_dict"],
        jd_info=state["jd_dict"],
        fit_checks=state["fit_checks"],
        report_data=state["report"],
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


def build_analysis_graph():
    """체크리스트 판정부터 질문/리포트 생성까지의 전체 분석 그래프를 구성합니다."""

    builder = StateGraph(AnalysisGraphState)

    builder.add_node("check_resume_fit", check_resume_fit_node)
    builder.add_node("fit_feedback", fit_feedback_node)
    builder.add_node("interview_questions", interview_questions_node)
    builder.add_node("question_feedback", question_feedback_node)
    builder.add_node("report", report_node)
    builder.add_node("report_feedback", report_feedback_node)
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "check_resume_fit")
    builder.add_edge("check_resume_fit", "fit_feedback")
    builder.add_edge("fit_feedback", "interview_questions")
    builder.add_edge("interview_questions", "question_feedback")
    builder.add_edge("question_feedback", "report")
    builder.add_edge("report", "report_feedback")
    builder.add_edge("report_feedback", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()


analysis_graph = build_analysis_graph()


def invoke_analysis_graph(
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
    result = analysis_graph.invoke(state)
    return result["result"]
