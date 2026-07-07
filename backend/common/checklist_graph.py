from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from . import checklist_agent as agents
from . import masking as masking_service
from .utils import mask, unmask


################################################################
#                      state definition
################################################################

CHECKLIST_COUNT = 10


class ChecklistGraphState(TypedDict, total=False):
    """체크리스트 생성 그래프의 입력, 중간 산출물, 최종 결과를 담는 상태입니다."""

    compinfo: dict
    jdinfo: dict
    cnt: int
    user_query: str
    mask_result: dict
    query: str
    db_data: list[str]
    checklist: list[str]


################################################################
#                      node definition
################################################################


def mask_inputs_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """회사/JD/사용자 추가 요청을 먼저 마스킹해 LLM 생성 입력으로 넘깁니다."""

    input_data = {
        "compinfo": state["compinfo"],
        "jdinfo": state["jdinfo"],
        "user_query": state.get("user_query", ""),
    }
    mask_result = masking_service.invoke(input_data)
    masked_input_data = mask(input_data, mask_result)

    return {
        "compinfo": masked_input_data["compinfo"],
        "jdinfo": masked_input_data["jdinfo"],
        "user_query": masked_input_data.get("user_query", ""),
        "mask_result": mask_result,
    }


def extract_query_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """마스킹된 회사/JD 정보를 바탕으로 RAG 검색용 쿼리를 생성합니다."""

    query = agents.invoke_extract_query_node(
        compinfo=state["compinfo"],
        jdinfo=state["jdinfo"],
    )
    return {"query": query}


def validate_checklist_count(cnt: int):
    if isinstance(cnt, bool) or not isinstance(cnt, int) or cnt <= 0:
        raise ValueError("cnt는 1 이상의 정수여야 합니다.")


def search_embedding_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """생성된 쿼리로 Pinecone에서 참고 체크리스트 데이터를 검색합니다."""

    db_data = agents.invoke_search_embedding_node(
        query=state["query"],
        cnt=state["cnt"],
    )
    return {"db_data": db_data}


def mask_db_data_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """검색 결과에 입력 마스킹 맵을 다시 적용해 프롬프트 누출을 줄입니다."""

    masked = mask(
        {"db_data": state.get("db_data", [])},
        state.get("mask_result", {}),
    )
    return {"db_data": masked["db_data"]}


def generate_checklist_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """마스킹된 입력과 검색 데이터를 종합해 최종 체크리스트를 생성합니다."""

    generated = agents.invoke_fit_checklist_node(
        company_info=state["compinfo"],
        jd_info=state["jdinfo"],
        db_data=state["db_data"],
        checklist_count=state["cnt"],
        user_query=state.get("user_query", ""),
    )
    unmasked = unmask(
        {"checklist": generated},
        state.get("mask_result", {}),
    )
    return {"checklist": unmasked["checklist"]}


################################################################
#                      conditional edge
################################################################


################################################################
#                      graph builder
################################################################

graph_instance = None


def build_graph():
    """체크리스트 생성 전처리, 검색, 생성 단계를 LangGraph로 연결합니다."""

    builder = StateGraph(ChecklistGraphState)

    builder.add_node("mask_inputs", mask_inputs_node)
    builder.add_node("extract_query", extract_query_node)
    builder.add_node("search_embedding", search_embedding_node)
    builder.add_node("mask_db_data", mask_db_data_node)
    builder.add_node("generate_checklist", generate_checklist_node)

    builder.add_edge(START, "mask_inputs")
    builder.add_edge("mask_inputs", "extract_query")
    builder.add_edge("extract_query", "search_embedding")
    builder.add_edge("search_embedding", "mask_db_data")
    builder.add_edge("mask_db_data", "generate_checklist")
    builder.add_edge("generate_checklist", END)

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
    compinfo: dict,
    jdinfo: dict,
    cnt: int = CHECKLIST_COUNT,
    user_query: str = "",
) -> list[str]:
    """외부에서 체크리스트 그래프를 호출할 때 사용하는 진입점입니다."""

    validate_checklist_count(cnt)

    state: ChecklistGraphState = {
        "compinfo": compinfo,
        "jdinfo": jdinfo,
        "cnt": cnt,
        "user_query": user_query,
    }
    result = get_graph().invoke(state)
    return result["checklist"]
