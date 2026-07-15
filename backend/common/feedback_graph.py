"""LangGraph orchestration for the common feedback loop."""

from typing import Any, Callable, Literal

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from . import feedback_agent as agents

DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_MIN_SCORE = 90


################################################################
#                      state definition
################################################################


FeedbackRoute = Literal["evaluate", "finalize"]


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


################################################################
#                      node definition
################################################################


def evaluate_node(state: FeedbackGraphState) -> FeedbackGraphState:
    """현재 출력물을 평가하고 corrected_output으로 다음 반복 상태를 만듭니다."""

    evaluator = state.get("evaluator") or agents.invoke_feedback_evaluation_node
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


def finalize_node(state: FeedbackGraphState) -> FeedbackGraphState:
    """피드백 루프의 최종 출력 형식을 graph invoke 반환값으로 맞춥니다."""

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


################################################################
#                      conditional edge
################################################################


def route_after_evaluate(state: FeedbackGraphState) -> FeedbackRoute:
    """통과 조건 또는 최대 반복 횟수에 따라 재평가/종료 경로를 결정합니다."""

    if state.get("passed"):
        return "finalize"
    if state.get("attempt", 0) >= state["max_attempts"]:
        return "finalize"
    return "evaluate"


################################################################
#                      graph builder
################################################################


graph_instance = None


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


def get_graph():
    """컴파일된 피드백 그래프 singleton을 반환합니다."""

    global graph_instance

    if graph_instance is None:
        graph_instance = build_feedback_graph()

    return graph_instance


def _validate_invoke_input(initial_output, min_score, max_attempts):
    if (
        isinstance(min_score, bool)
        or not isinstance(min_score, int)
        or not 0 <= min_score <= 100
    ):
        raise ValueError("min_score는 0~100 사이의 정수여야 합니다.")
    if (
        isinstance(max_attempts, bool)
        or not isinstance(max_attempts, int)
        or max_attempts <= 0
    ):
        raise ValueError("max_attempts는 1 이상의 정수여야 합니다.")
    if not isinstance(initial_output, dict):
        raise ValueError("initial_output은 dict 형태여야 합니다.")


################################################################
#                      invoke
################################################################


def invoke(
    reference_data,
    initial_output,
    evaluation_criteria,
    min_score=DEFAULT_MIN_SCORE,
    max_attempts=DEFAULT_MAX_ATTEMPTS,
    evaluator=None,
) -> dict[str, Any]:
    """외부에서 공통 피드백 그래프를 호출할 때 사용하는 진입점입니다."""

    _validate_invoke_input(initial_output, min_score, max_attempts)

    state: FeedbackGraphState = {
        "reference_data": reference_data,
        "current_output": initial_output,
        "evaluation_criteria": evaluation_criteria,
        "min_score": min_score,
        "max_attempts": max_attempts,
        "feedback_history": [],
        "attempt": 0,
        "passed": False,
    }
    if evaluator is not None:
        state["evaluator"] = evaluator

    result = get_graph().invoke(
        state,
        config={"recursion_limit": max_attempts + 5},
    )
    return result["final_result"]
