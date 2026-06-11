import argparse
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph

DATABASE_HOST = os.environ.get("RDS_HOSTNAME")

if DATABASE_HOST:
    pass

if not DATABASE_HOST:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

try:
    from . import chat_agent as agents
    from .chat_agent import GraphState
except ImportError:
    import chat_agent as agents
    from chat_agent import GraphState

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
    builder.add_node("fall_case", agents.fall_case_node)
    builder.add_node("context_extractor", agents.context_extractor_node)
    builder.add_node("hr_analyst", agents.hr_analyst_node)
    builder.add_node("app_manual_rag", agents.app_manual_rag_node)
    builder.add_node("summary", agents.summary_node)  # 최종 요약 노드

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


async def invoke_chat_graph_async(chats: list[str] | str) -> GraphState:
    """ainvoke를 사용하여 비동기로 그래프 파이프라인을 실행합니다."""
    if isinstance(chats, str):
        chats = [chats]

    initial_state: GraphState = {
        "chats": chats,
        "state": "FALL_CASE",
        "is_out_of_bounds": False,
        "is_hr_case": False,
        "is_app_manual": False,
        "rag_search_query": "",
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


def print_history(chats: list[str]):
    if not chats:
        print("\n[history] 아직 대화가 없습니다.\n")
        return
    print("\n====== 현재 대화 히스토리 ======")
    for index, message in enumerate(chats):
        role = "USER" if index % 2 == 0 else "AI"
        print(f"{index + 1}. {role}> {message}")
    print()


async def run_turns_async(user_turns: list[str]):
    chats: list[str] = []
    for turn_index, user_message in enumerate(user_turns, start=1):
        print(f"\n===== TURN {turn_index} =====")
        print(f"USER> {user_message}")
        chats.append(user_message)

        result = await invoke_chat_graph_async(chats)
        answer = result.get("response", "")

        print("\nAI>")
        print(answer)
        chats.append(answer)
    print_history(chats)


async def run_interactive_chat_async():
    chats: list[str] = []
    print("====== Test LangGraph 멀티턴 대화형 실행 ======")
    print("복합 질문 처리 가능 예시: '오늘 서울 날씨 어때? 그리고 채팅 기록은 어디서 봐?'")
    print("명령어: /history, /reset, exit, quit, q\n")

    while True:
        user_message = input("USER> ").strip()
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

        chats.append(user_message)

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
        chats.append(answer)


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
        res = asyncio.run(invoke_chat_graph_async([args.message]))
        print_graph_result(res)
    else:
        asyncio.run(run_interactive_chat_async())


if __name__ == "__main__":
    main()