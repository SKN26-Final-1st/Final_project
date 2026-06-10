import argparse
import json
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

DATABASE_HOST = os.environ.get("RDS_HOSTNAME")

if DATABASE_HOST:
    pass

if not DATABASE_HOST:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

try:
    from . import chat_agent as agents
except ImportError:
    import chat_agent as agents


class GraphState(TypedDict, total=False):
    """LangGraph 노드들이 주고받는 대화 상태와 중간 결과 필드를 정의합니다."""

    chats: list[str]
    state: str
    is_fall_case: int
    fall_case_type: int
    rag_search_query: str
    memories: list[dict]
    retrieved_manual_docs: list[str]
    response: str


def route_from_fall_case(
    state: GraphState,
) -> Literal["fall_case_end", "hr_agent", "app_manual_rag"]:
    """질문 분류 결과에 따라 그래프를 종료하거나 HR 분석/RAG 사용법 경로로 분기합니다."""

    fall_case_type = state.get("fall_case_type", state.get("is_fall_case", 0))

    if fall_case_type == 0:
        return "fall_case_end"
    if fall_case_type == 2:
        return "app_manual_rag"
    return "hr_agent"


def build_graph():
    """분류, 메모리 추출, HR 분석, 앱 사용법 RAG 노드를 연결해 실행 가능한 그래프를 만듭니다."""

    builder = StateGraph(GraphState)

    builder.add_node("fall_case", agents.fall_case_node)
    builder.add_node("context_extractor", agents.context_extractor_node)
    builder.add_node("hr_analyst", agents.hr_analyst_node)
    builder.add_node("app_manual_rag", agents.app_manual_rag_node)

    builder.add_edge(START, "fall_case")
    builder.add_conditional_edges(
        "fall_case",
        route_from_fall_case,
        {
            "fall_case_end": END,
            "hr_agent": "context_extractor",
            "app_manual_rag": "app_manual_rag",
        },
    )
    builder.add_edge("context_extractor", "hr_analyst")
    builder.add_edge("hr_analyst", END)
    builder.add_edge("app_manual_rag", END)

    return builder.compile()


graph_instance = build_graph()


def invoke_chat_graph(chats: list[str] | str) -> GraphState:
    """문자열 또는 대화 히스토리를 초기 상태로 감싸 LangGraph 전체 파이프라인을 실행합니다."""

    if isinstance(chats, str):
        chats = [chats]

    initial_state: GraphState = {
        "chats": chats,
        "state": "FALL_CASE",
        "is_fall_case": -1,
        "fall_case_type": -1,
        "rag_search_query": "",
        "memories": [],
        "response": "",
    }

    return graph_instance.invoke(initial_state)


def print_graph_result(result: GraphState):
    """그래프 실행 결과에서 분기 정보, 검색어, 메모리, 최종 응답을 콘솔에 보기 좋게 출력합니다."""

    print("\n====== LangGraph 실행 결과 ======")
    print(f"fall_case_type: {result.get('fall_case_type')}")
    print(f"rag_search_query: {result.get('rag_search_query', '')}")
    print(f"memories: {json.dumps(result.get('memories', []), ensure_ascii=False)}")
    print("\n====== 최종 응답 ======")
    print(result.get("response", ""))
    print()


def print_history(chats: list[str]):
    """멀티턴 테스트 중 누적된 USER/AI 대화 히스토리를 순서대로 출력합니다."""

    if not chats:
        print("\n[history] 아직 대화가 없습니다.\n")
        return

    print("\n====== 현재 대화 히스토리 ======")
    for index, message in enumerate(chats):
        role = "USER" if index % 2 == 0 else "AI"
        print(f"{index + 1}. {role}> {message}")
    print()


def run_turns(user_turns: list[str]):
    """사용자 발화 목록을 차례대로 실행하며 각 턴의 AI 응답을 히스토리에 누적합니다."""

    chats: list[str] = []

    for turn_index, user_message in enumerate(user_turns, start=1):
        print(f"\n===== TURN {turn_index} =====")
        print(f"USER> {user_message}")
        chats.append(user_message)

        result = invoke_chat_graph(chats)
        answer = result.get("response", "")

        print("\nAI>")
        print(answer)
        print(
            f"\n[debug] history_messages={len(chats)}, "
            f"fall_case_type={result.get('fall_case_type')}, "
            f"rag_search_query={result.get('rag_search_query', '')}, "
            f"memories={json.dumps(result.get('memories', []), ensure_ascii=False)}"
        )

        chats.append(answer)

    print_history(chats)


def run_interactive_chat():
    """터미널에서 직접 질문을 입력하며 그래프를 멀티턴으로 테스트하는 대화형 루프입니다."""

    chats: list[str] = []
    print("====== Test LangGraph 멀티턴 대화형 실행 ======")
    print("질문을 입력하면 전체 히스토리를 포함해 답변합니다.")
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
            result = invoke_chat_graph(chats)
        except Exception as exc:
            chats.pop()
            print(f"\nERROR> {exc}\n")
            continue

        answer = result.get("response", "")
        print("\nAI>")
        print(answer)
        print(
            f"\n[debug] history_messages={len(chats)}, "
            f"fall_case_type={result.get('fall_case_type')}, "
            f"rag_search_query={result.get('rag_search_query', '')}, "
            f"memories={json.dumps(result.get('memories', []), ensure_ascii=False)}"
        )
        print()

        chats.append(answer)


def main():
    """CLI 인자를 해석해 단일 메시지, 전체 히스토리, 멀티턴, 대화형 실행 모드 중 하나를 선택합니다."""

    parser = argparse.ArgumentParser(description="Run chat_agent.py through LangGraph.")
    parser.add_argument("--message", "-m", help="Single user message to run.")
    parser.add_argument(
        "--chats",
        help='Full conversation history as JSON list, e.g. ["user", "ai", "user"].',
    )
    parser.add_argument(
        "--turns",
        help='User-only turns as JSON list. The script runs each turn sequentially and keeps AI answers in history.',
    )
    args = parser.parse_args()

    if args.turns:
        user_turns = json.loads(args.turns)
        if not isinstance(user_turns, list) or not all(isinstance(item, str) for item in user_turns):
            raise ValueError("--turns must be a JSON list of strings.")
        run_turns(user_turns)
    elif args.chats:
        chats = json.loads(args.chats)
        if not isinstance(chats, list) or not all(isinstance(item, str) for item in chats):
            raise ValueError("--chats must be a JSON list of strings.")
        print_graph_result(invoke_chat_graph(chats))
    elif args.message:
        print_graph_result(invoke_chat_graph([args.message]))
    else:
        run_interactive_chat()


if __name__ == "__main__":
    main()
