import operator
from collections.abc import Callable
from typing import Annotated, Any

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

try:
    from .utils import load_env
except ImportError:
    from utils import load_env

load_env()

try:
    from . import chat_agent as agents
except ImportError:
    import chat_agent as agents


################################################################
#                      helper
################################################################


def reduce_chats(left: list, right: list) -> list:
    """두 리스트를 하나로 합치고 중복된 메시지는 순서를 유지하며 제거합니다."""
    result = left.copy()
    for item in right:
        if item not in result:
            result.append(item)
    return result


def normalize_chats(chats: list[dict] | list[str] | str) -> list[dict]:
    if isinstance(chats, str):
        return [{"role": "user", "message": chats}]

    normalized = []
    for index, chat in enumerate(chats):
        if isinstance(chat, dict):
            normalized.append(
                {
                    "role": chat.get("role", "user"),
                    "message": chat.get("message", ""),
                }
            )
        else:
            normalized.append(
                {
                    "role": "user" if index % 2 == 0 else "agent",
                    "message": str(chat),
                }
            )
    return normalized


def get_latest_user_message(chats: list[dict]) -> str:
    for chat in reversed(chats):
        if str(chat.get("role", "")).lower() == "user":
            return str(chat.get("message", ""))
    return ""


################################################################
#                      state definition
################################################################


class GraphState(TypedDict, total=False):
    """각 노드가 공유하는 대화 상태와 중간 결과 필드를 정의합니다."""

    chats: Annotated[list[dict], reduce_chats]
    state: str
    is_out_of_bounds: bool
    is_hr_case: bool
    is_app_manual: bool
    rag_search_query: str
    hr_search_query: str
    recruiting_data_searcher: Callable[..., Any]
    memories: Annotated[list[dict], operator.add]
    retrieved_manual_docs: Annotated[list[str], reduce_chats]
    out_of_bounds_response: str
    hr_response: str
    app_manual_response: str
    response: str


################################################################
#                      node definition
################################################################


async def fall_case_node(state: GraphState) -> GraphState:
    llm_result = await agents.invoke_fall_case_node(state["chats"])
    return {
        "is_out_of_bounds": llm_result.is_out_of_bounds,
        "is_hr_case": llm_result.is_hr_case,
        "is_app_manual": llm_result.is_app_manual,
        "rag_search_query": llm_result.rag_search_query,
        "hr_search_query": llm_result.hr_search_query,
        "out_of_bounds_response": llm_result.out_of_bounds_response,
    }


async def context_extractor_node(state: GraphState) -> GraphState:
    llm_result = await agents.invoke_context_extractor_node(state["chats"])
    return {
        "memories": [
            {"context": memory.context, "value": memory.value}
            for memory in llm_result.memories
        ]
    }


async def hr_analyst_node(state: GraphState) -> GraphState:
    user_question = get_latest_user_message(state.get("chats", []))
    hr_response = await agents.invoke_hr_analyst_agent(
        state.get("hr_search_query") or user_question,
        state.get("memories", []),
        state.get("recruiting_data_searcher"),
    )
    return {"hr_response": hr_response}


async def app_manual_rag_node(state: GraphState) -> GraphState:
    query = state.get("rag_search_query", "")
    user_question = get_latest_user_message(state.get("chats", [])) or query
    app_manual_response, retrieved_docs = await agents.invoke_app_manual_rag_agent(
        query,
        user_question,
    )
    return {
        "retrieved_manual_docs": retrieved_docs,
        "app_manual_response": app_manual_response,
    }


async def summary_node(state: GraphState) -> GraphState:
    user_question = get_latest_user_message(state.get("chats", []))
    responses_to_merge = []

    if state.get("is_out_of_bounds") and state.get("out_of_bounds_response"):
        responses_to_merge.append(
            f"[시스템 1 (범위 밖 질문 안내)]:\n{state['out_of_bounds_response']}"
        )
    if state.get("is_hr_case") and state.get("hr_response"):
        responses_to_merge.append(
            f"[시스템 2 (HR 채용 통계 분석)]:\n{state['hr_response']}"
        )
    if state.get("is_app_manual") and state.get("app_manual_response"):
        responses_to_merge.append(
            f"[시스템 3 (앱 사용법 안내)]:\n{state['app_manual_response']}"
        )

    if not responses_to_merge:
        return {
            "response": "질문하신 내용에 대해 안내해 드릴 수 있는 내용을 찾지 못했습니다."
        }

    if len(responses_to_merge) == 1:
        return {"response": responses_to_merge[0].split("]:\n", 1)[-1]}

    merge_input = (
        f"사용자 원본 질문: {user_question}\n\n취합해야 할 개별 답변 목록:\n"
        + "\n\n".join(responses_to_merge)
    )

    response = await agents.invoke_summary_agent(merge_input)
    return {"response": response}


################################################################
#                      conditional edge
################################################################


def route_from_fall_case(state: GraphState) -> list[str]:
    """활성화된 모든 분류 조건에 맞춰 병렬로 이동할 노드 리스트를 반환합니다. (Fan-out)"""
    destinations = []

    if state.get("is_hr_case", False):
        destinations.append("context_extractor")

    if state.get("is_app_manual", False):
        destinations.append("app_manual_rag")

    # HR 질문도 아니고 앱 사용법도 아닌데, 범위 밖 질문만 켜져 있다면 다른 노드를 탈 필요 없이 바로 요약으로 갑니다.
    # 혹은 세 속성 다 False인 예외적 경우에도 안전하게 summary로 보냅니다.
    if not destinations:
        destinations.append("summary")

    return destinations


################################################################
#                      graph builder
################################################################


def build_graph():
    """다중 의도를 병렬 처리하고 최종 요약하는 비동기 그래프를 빌드합니다."""
    builder = StateGraph(GraphState)

    # 노드 등록
    builder.add_node("fall_case", fall_case_node)
    builder.add_node("context_extractor", context_extractor_node)
    builder.add_node("hr_analyst", hr_analyst_node)
    builder.add_node("app_manual_rag", app_manual_rag_node)
    builder.add_node("summary", summary_node)  # 최종 요약 노드

    # 그래프 흐름 연결
    builder.add_edge(START, "fall_case")

    # fall_case의 결과에 따라 노드들이 '병렬 리스트'로 분기함
    builder.add_conditional_edges(
        "fall_case",
        route_from_fall_case,
        {
            "context_extractor": "context_extractor",
            "app_manual_rag": "app_manual_rag",
            "summary": "summary",
        },
    )

    # HR 분석 흐름
    builder.add_edge("context_extractor", "hr_analyst")
    builder.add_edge("hr_analyst", "summary")  # 작업이 끝나면 summary로 수렴 (Fan-in)

    # RAG 안내 흐름
    builder.add_edge("app_manual_rag", "summary")  # 작업이 끝나면 summary로 수렴 (Fan-in)

    # 최종 요약 완료 후 종료
    builder.add_edge("summary", END)

    return builder.compile()


graph_instance = None


def get_graph():
    global graph_instance

    if graph_instance is None:
        graph_instance = build_graph()

    return graph_instance


################################################################
#                      invoke
################################################################


async def invoke(state: dict) -> str:
    if "chats" in state:
        state = {**state, "chats": normalize_chats(state["chats"])}
    result = await get_graph().ainvoke(state)
    return result.get("response", "")
