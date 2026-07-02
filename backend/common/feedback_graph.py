"""LangGraph implementation of the common feedback loop."""

from typing import Any, Callable

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict


class FeedbackGraphState(TypedDict, total=False):
    """피드백 루프의 평가 입력, 반복 상태, 최종 결과를 담는 상태입니다."""

    reference_data: dict[str, Any]
    current_output: dict[str, Any]
    evaluation_criteria: list[str]
    min_score: int
    max_attempts: int
    evaluator: Callable[..., Any]
    feedback_history: list[dict[str, Any]]
    attempt: int
    last_evaluation_data: dict[str, Any]
    final_result: dict[str, Any]
    passed: bool


def evaluate_node(state: FeedbackGraphState) -> FeedbackGraphState:
    """현재 출력물을 평가하고, 필요하면 corrected_output으로 다음 반복 상태를 만듭니다."""

    evaluator = state["evaluator"]
    feedback_history = list(state.get("feedback_history", []))
    attempt = state.get("attempt", 0) + 1
    current_output = state["current_output"]

    evaluation = evaluator(
        reference_data=state["reference_data"],
        output_data=current_output,
        evaluation_criteria=state["evaluation_criteria"],
        previous_feedback=feedback_history,
    )
    evaluation_data = evaluation.model_dump()
    corrected_output = evaluation_data["corrected_output"]
    output_unchanged = corrected_output == current_output

    feedback_history.append(
        {
            "attempt": attempt,
            "overall_score": evaluation_data["overall_score"],
            "stability_score": evaluation_data["stability_score"],
            "is_stable": evaluation_data["is_stable"],
            "metrics": evaluation_data["metrics"],
            "evidence_feedback": evaluation_data["evidence_feedback"],
            "feedback_query": evaluation_data["feedback_query"],
        }
    )
    passed = (
        output_unchanged
        and evaluation_data["is_stable"]
        and evaluation_data["overall_score"] >= state["min_score"]
    )

    return {
        "attempt": attempt,
        "current_output": corrected_output,
        "feedback_history": feedback_history,
        "last_evaluation_data": evaluation_data,
        "passed": passed,
    }


def route_after_evaluate(state: FeedbackGraphState) -> str:
    """통과 조건 또는 최대 반복 횟수에 따라 재평가/종료 경로를 결정합니다."""

    if state.get("passed"):
        return "finalize"
    if state.get("attempt", 0) >= state["max_attempts"]:
        return "finalize"
    return "evaluate"


def finalize_node(state: FeedbackGraphState) -> FeedbackGraphState:
    """피드백 루프의 최종 출력 형식을 기존 run_feedback_loop 반환값과 맞춥니다."""

    last_evaluation_data = state["last_evaluation_data"]
    final_result = {
        "outputdata": state["current_output"],
        "evidence_feedback": state.get("feedback_history", []),
        "overall_score": last_evaluation_data["overall_score"],
        "stability_score": last_evaluation_data["stability_score"],
        "is_stable": bool(state.get("passed")),
        "attempts": state.get("attempt", 0),
    }
    return {"final_result": final_result}


def build_feedback_graph():
    """평가 노드와 조건부 반복 엣지로 공통 피드백 루프 그래프를 구성합니다."""

    builder = StateGraph(FeedbackGraphState)

    builder.add_node("evaluate", evaluate_node)
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "evaluate")
    builder.add_conditional_edges(
        "evaluate",
        route_after_evaluate,
        {
            "evaluate": "evaluate",
            "finalize": "finalize",
        },
    )
    builder.add_edge("finalize", END)

    return builder.compile()


feedback_graph = build_feedback_graph()


def invoke_feedback_graph(
    reference_data,
    initial_output,
    evaluation_criteria,
    min_score,
    max_attempts,
    evaluator,
) -> dict[str, Any]:
    """외부에서 공통 피드백 그래프를 호출할 때 사용하는 진입점입니다."""

    state: FeedbackGraphState = {
        "reference_data": reference_data,
        "current_output": initial_output,
        "evaluation_criteria": evaluation_criteria,
        "min_score": min_score,
        "max_attempts": max_attempts,
        "evaluator": evaluator,
        "feedback_history": [],
        "attempt": 0,
        "passed": False,
    }
    result = feedback_graph.invoke(
        state,
        config={"recursion_limit": max_attempts + 5},
    )
    return result["final_result"]
