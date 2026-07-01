import argparse
import asyncio
import json
import operator
import os
import sys
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

# 윈도우 터미널 한글 인코딩 보정
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

try:
    from .utils import load_env
except ImportError:
    from utils import load_env

load_env()

try:
    from . import chat_agent as agents
except ImportError:
    import chat_agent as agents


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


class GraphState(TypedDict, total=False):
    """각 노드가 공유하는 대화 상태와 중간 결과 필드를 정의합니다."""

    chats: Annotated[list[dict], reduce_chats]
    state: str
    is_out_of_bounds: bool
    is_hr_case: bool
    is_app_manual: bool
    rag_search_query: str
    job_descriptions: list[dict]
    memories: Annotated[list[dict], operator.add]
    retrieved_manual_docs: Annotated[list[str], reduce_chats]
    out_of_bounds_response: str
    hr_response: str
    app_manual_response: str
    response: str


async def fall_case_node(state: GraphState) -> GraphState:
    llm_result = await agents.invoke_fall_case_node(state["chats"])
    return {
        "is_out_of_bounds": llm_result.is_out_of_bounds,
        "is_hr_case": llm_result.is_hr_case,
        "is_app_manual": llm_result.is_app_manual,
        "rag_search_query": llm_result.rag_search_query,
        "out_of_bounds_response": llm_result.out_of_bounds_response,
    }


# ==================== 2단계-A: HR 대화 메모리 추출 노드 ====================


async def context_extractor_node(state: GraphState) -> GraphState:
    llm_result = await agents.invoke_context_extractor_node(state["chats"])
    return {
        "memories": [
            {"context": memory.context, "value": memory.value}
            for memory in llm_result.memories
        ]
    }


# ==================== 2단계-B: HR 데이터 분석 노드 ====================


async def hr_analyst_node(state: GraphState) -> GraphState:
    hr_response = await agents.invoke_hr_analyst_agent(
        get_latest_user_message(state.get("chats", [])),
        state.get("job_descriptions", []),
        state.get("memories", []),
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

    merge_input = (
        f"사용자 원본 질문: {user_question}\n\n취합해야 할 개별 답변 목록:\n"
        + "\n\n".join(responses_to_merge)
    )

    response = await agents.invoke_summary_agent(merge_input)
    return {"response": response}


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


graph_instance = build_graph()


async def invoke_graph(state: dict) -> str:
    if "chats" in state:
        state = {**state, "chats": normalize_chats(state["chats"])}
    if "job_descriptions" not in state:
        state = {**state, "job_descriptions": []}
    result = await graph_instance.ainvoke(state)
    return result.get("response", "")


async def invoke_chat_graph_async(chats: list[dict] | list[str] | str) -> GraphState:
    """ainvoke를 사용하여 비동기로 그래프 파이프라인을 실행합니다."""
    chats = normalize_chats(chats)

    initial_state: GraphState = {
        "chats": chats,
        "state": "FALL_CASE",
        "is_out_of_bounds": False,
        "is_hr_case": False,
        "is_app_manual": False,
        "rag_search_query": "",
        "job_descriptions": [],
        "memories": [],
        "out_of_bounds_response": "",
        "hr_response": "",
        "app_manual_response": "",
        "response": "",
    }

    return await graph_instance.ainvoke(initial_state)


def print_graph_result(result: GraphState):
    print("\n====== LangGraph 실행 결과 ======")
    print(f"is_out_of_bounds: {result.get('is_out_of_bounds')}")
    print(f"is_hr_case: {result.get('is_hr_case')}")
    print(f"is_app_manual: {result.get('is_app_manual')}")
    print(f"rag_search_query: {result.get('rag_search_query', '')}")
    print(f"memories: {json.dumps(result.get('memories', []), ensure_ascii=False)}")
    print("\n====== 최종 요약 응답 ======")
    print(result.get("response", ""))
    print()


def print_history(chats: list[dict]):
    if not chats:
        print("\n[history] 아직 대화가 없습니다.\n")
        return
    print("\n====== 현재 대화 히스토리 ======")
    for index, chat in enumerate(chats):
        role = str(chat.get("role", "")).upper()
        message = chat.get("message", "")
        print(f"{index + 1}. {role}> {message}")
    print()


async def run_turns_async(user_turns: list[str]):
    chats: list[dict] = []
    for turn_index, user_message in enumerate(user_turns, start=1):
        print(f"\n===== TURN {turn_index} =====")
        print(f"USER> {user_message}")
        chats.append({"role": "user", "message": user_message})

        result = await invoke_chat_graph_async(chats)
        answer = result.get("response", "")

        print("\nAI>")
        print(answer)
        chats.append({"role": "agent", "message": answer})
    print_history(chats)


async def run_interactive_chat_async():
    chats: list[dict] = []
    print("====== Test LangGraph 멀티턴 대화형 실행 ======")
    print("복합 질문 처리 가능 예시: '오늘 서울 날씨 어때? 그리고 채팅 기록은 어디서 봐?'")
    print("명령어: /history, /reset, exit, quit, q\n")

    while True:
        try:
            user_message = input("USER> ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n종료합니다.")
            break

        lowered_message = user_message.lower()

        if lowered_message in {"exit", "quit", "q"}:
            print("종료합니다.")
            break
        if lowered_message == "/history":
            print_history(chats)
            continue
        if lowered_message == "/reset":
            chats.clear()
            print("\n[history] 대화 히스토리를 초기화했습니다.\n")
            continue
        if not user_message:
            continue

        chats.append({"role": "user", "message": user_message})

        try:
            result = await invoke_chat_graph_async(chats)
        except Exception as exc:
            chats.pop()
            print(f"\nERROR> {exc}\n")
            continue

        answer = result.get("response", "")
        print("\nAI>")
        print(answer)
        print(
            f"\n[debug] out_of_bounds={result.get('is_out_of_bounds')}, "
            f"hr={result.get('is_hr_case')}, app_manual={result.get('is_app_manual')}"
        )
        print()
        chats.append({"role": "agent", "message": answer})


def main():
    parser = argparse.ArgumentParser(description="Run chat_agent.py through LangGraph.")
    parser.add_argument("--message", "-m", help="Single user message to run.")
    parser.add_argument("--chats", help="Full conversation history as JSON list.")
    parser.add_argument("--turns", help="User-only turns as JSON list.")
    args = parser.parse_args()

    if args.turns:
        user_turns = json.loads(args.turns)
        asyncio.run(run_turns_async(user_turns))
    elif args.chats:
        chats = json.loads(args.chats)
        res = asyncio.run(invoke_chat_graph_async(chats))
        print_graph_result(res)
    elif args.message:
        res = asyncio.run(invoke_chat_graph_async([{"role": "user", "message": args.message}]))
        print_graph_result(res)
    else:
        asyncio.run(run_interactive_chat_async())


if __name__ == "__main__":
    main()