import json
from typing_extensions import TypedDict
from typing import Literal
from copy import deepcopy
from langgraph.graph import StateGraph, START, END

# 앞서 작성해둔 인보크 함수 모듈을 통째로 불러옵니다.
import chat_agent as agents

############################################################
# 1. State Definition (상태 정의)
############################################################

class GraphState(TypedDict, total=False):
    # 채팅 기록 MessageList
    chats: list[str]

    # Fall Case 판단 여부
    is_fall_case: bool

    # Context Extractor 결과 (메모리)
    memories: list[dict]

    # 최종 답변
    response: str


############################################################
# 2. Node Definition (노드 정의)
############################################################

def fall_case_node(state: GraphState) -> GraphState:
    """
    챗봇의 역량 밖의 질문(Fall Case)인지 판단하는 노드
    """
    llm_result = agents.invoke_fall_case_agent(state["chats"])

    rstate = deepcopy(state)
    rstate["is_fall_case"] = llm_result.is_fall_case

    if llm_result.is_fall_case:
        rstate["response"] = llm_result.response
    else:
        rstate["response"] = ""

    return rstate


def context_extractor_node(state: GraphState) -> GraphState:
    """
    이전 대화에서 필요한 수치/맥락 데이터를 추출하는 노드
    """
    llm_result = agents.invoke_context_extractor_agent(state["chats"])

    rstate = deepcopy(state)
    
    rstate["memories"] = [
        {"context": memory.context, "value": memory.value}
        for memory in llm_result.memories
    ]

    return rstate


def hr_analyst_node(state: GraphState) -> GraphState:
    """
    가상 DB와 추출된 메모리를 함께 분석하여 최종 답변을 생성하는 노드
    """
    search_query = state["chats"][-1]
    

    extracted_memories = state.get("memories", [])
    
    if extracted_memories:
        memory_str = json.dumps(extracted_memories, ensure_ascii=False)
        # LLM이 메모리 수치와 기존 '이모지 금지 규칙'을 확실히 인지하도록 쿼리를 보강합니다.
        search_query = f"""[참고할 대화 메모리 데이터]: {memory_str}
[사용자 질문]: {search_query}

※ 주의: 답변 작성 시 'chat_agent.py'의 시스템 프롬프트에 명시된 '이모티콘/이모지 절대 사용 금지' 규칙을 반드시 엄격하게 준수하세요."""

    # 보강된 쿼리로 HR 분석 에이전트 호출
    final_answer = agents.invoke_hr_analyst_agent(search_query)

    rstate = deepcopy(state)
    rstate["response"] = final_answer

    return rstate


############################################################
# 3. Edge Function (라우팅 함수)
############################################################

def route_from_fall_case(state: GraphState) -> Literal["end", "context_extractor_node"]:
    """
    Fall Case 여부에 따라 다음 엣지(경로)를 결정합니다.
    - True -> END (바로 종료)
    - False -> context_extractor_node (다음 분석 진행)
    """
    if state.get("is_fall_case", False):
        return "end"
    
    return "context_extractor_node"


############################################################
# 4. Graph Builder (그래프 조립 및 컴파일)
############################################################

builder = StateGraph(GraphState)

# Node 등록
builder.add_node("fall_case_node", fall_case_node)
builder.add_node("context_extractor_node", context_extractor_node)
builder.add_node("hr_analyst_node", hr_analyst_node)

# START ➡️ fall_case_node
builder.add_edge(START, "fall_case_node")

# fall_case_node ➡️ 조건부 분기 (Conditional Edge)
builder.add_conditional_edges(
    "fall_case_node",
    route_from_fall_case,
    {
        "end": END,
        "context_extractor_node": "context_extractor_node"
    }
)

# context_extractor_node ➡️ hr_analyst_node
builder.add_edge("context_extractor_node", "hr_analyst_node")

# hr_analyst_node ➡️ END
builder.add_edge("hr_analyst_node", END)

# 최종 그래프 컴파일
graph_instance = builder.compile()


############################################################
# 두 파일 연동 및 전체 파이프라인 엔드투엔드(E2E) 통합 테스트
############################################################

if __name__ == "__main__":
    print("====== HR 에이전트 시스템 전체 파이프라인 연동 검증 ======\n")

    # --------------------------------------------------------
    # [시나리오 1] 업무 범위를 완전히 벗어난 질문 테스트 (Fall Case 검증)
    # --------------------------------------------------------
    print("--- [시나리오 1] 상담 범위 초과 질문 ---")
    mock_state_weather = {
        "chats": ["청소기 어떤게 좋은지 추천해줘"],
        "is_fall_case": None,
        "memories": [],
        "response": ""
    }
    
    result_weather = graph_instance.invoke(mock_state_weather)
    print(f"1단계 Fall Case 판단 결과 : {result_weather['is_fall_case']}")
    print(f"HR 비서 최종 거절 답변     : {result_weather['response']}\n")
    

    # --------------------------------------------------------
    # [시나리오 2] '진짜 데이터 분석 및 통계' 질문 테스트
    # --------------------------------------------------------
    print("--- [시나리오 2] 정상적인 HR 데이터 분석 및 통계 질문 ---")
    mock_state_analysis = {
        "chats": [
            "백엔드 개발자 채용 공고 혹시 올라온 거 있어?", 
            "네, 현재 2건 등록되어 있습니다", 
            "우리 회사 공고 중에 채용중인 jd는 총 몇개야?" 
        ],
        "is_fall_case": None,
        "memories": [],
        "response": ""
    }
    
    result_analysis = graph_instance.invoke(mock_state_analysis)
    print(f"1단계 Fall Case 판단 결과 : {result_analysis['is_fall_case']}")
    print(f"2단계 추출된 대화 메모리  : {result_analysis.get('memories', [])}")
    print(f"\n====== AI HR 비서의 최종 분석 답변 ======")
    print(result_analysis["response"])
    print("============================================")