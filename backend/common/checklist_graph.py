"""LangGraph orchestration for JD checklist generation."""

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict


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


def mask_inputs_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """회사/JD/사용자 추가 요청을 먼저 마스킹해 LLM 생성 입력으로 넘깁니다."""

    from . import masking as masking_service
    from .utils import mask

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

    from . import checklist as checklist_service

    query = checklist_service.extract_query(
        compinfo=state["compinfo"],
        jdinfo=state["jdinfo"],
    )
    return {"query": query}


def search_embedding_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """생성된 쿼리로 Pinecone에서 참고 체크리스트 데이터를 검색합니다."""

    from . import checklist as checklist_service

    db_data = checklist_service.search_embedding(
        query=state["query"],
        cnt=state["cnt"],
    )
    return {"db_data": db_data}


def mask_db_data_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """검색 결과에 입력 마스킹 맵을 다시 적용해 프롬프트 누출을 줄입니다."""

    from .utils import mask

    masked = mask(
        {"db_data": state.get("db_data", [])},
        state.get("mask_result", {}),
    )
    return {"db_data": masked["db_data"]}


def generate_checklist_node(state: ChecklistGraphState) -> ChecklistGraphState:
    """마스킹된 입력과 검색 데이터를 종합해 최종 체크리스트를 생성합니다."""

    from . import checklist as checklist_service

    generated = checklist_service.make_fit_checklist(
        company_info=state["compinfo"],
        jd_info=state["jdinfo"],
        db_data=state["db_data"],
        checklist_count=state["cnt"],
        user_query=state.get("user_query", ""),
    )
    return {"checklist": generated}


def build_checklist_graph():
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


checklist_graph = build_checklist_graph()


def invoke_checklist_graph(
    compinfo: dict,
    jdinfo: dict,
    cnt: int,
    user_query: str = "",
) -> list[str]:
    """외부에서 체크리스트 그래프를 호출할 때 사용하는 진입점입니다."""

    state: ChecklistGraphState = {
        "compinfo": compinfo,
        "jdinfo": jdinfo,
        "cnt": cnt,
        "user_query": user_query,
    }
    result = checklist_graph.invoke(state)
    return result["checklist"]
