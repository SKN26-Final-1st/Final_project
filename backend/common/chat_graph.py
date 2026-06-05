from copy import deepcopy

def hr_intent_node(state: GraphState):
    # state["chats"]에 여태까지의 대화 기록이나 유저의 입력 텍스트가 들어있다고 가정합니다.
    result = agents.invoke_hr_intent_node(
        state["chats"]
    )

    rstate = deepcopy(state)
    
    # Pydantic 객체에서 category 값을 안전하게 꺼내어 저장
    rstate["intent"] = result.category

    return rstate