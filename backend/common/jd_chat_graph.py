from typing import Literal

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from . import jd_chat_agent as agents
from . import masking as masking_service
from .utils import mask, unmask


################################################################
#                      state definition
################################################################

JD_FIELDS = (
    "job_name",
    "education_level",
    "major",
    "career_level",
    "required_skill",
    "preferred_skill",
    "main_task",
    "hiring_reason",
    "work_type",
)

COMPANY_INFO_FIELDS = (
    "company_name",
    "employee_count",
    "team_composition",
    "company_description",
    "employ_style",
)

FIELD_LABELS = {
    "job_name": "JD명",
    "education_level": "학력",
    "major": "전공 요건",
    "career_level": "경력",
    "required_skill": "필수 기술",
    "preferred_skill": "우대 기술",
    "main_task": "주요 업무",
    "hiring_reason": "채용 배경",
    "work_type": "고용 형태",
    "company_name": "회사명",
    "employee_count": "직원 수",
    "team_composition": "팀 구성",
    "company_description": "회사 소개",
    "employ_style": "선호 인재상",
}


class GraphState(TypedDict, total=False):
    comp_info: dict
    jd: dict
    chats: list
    missing_field: list
    ignored_field: list
    focus_field: str
    analyzed_field: dict
    extracted_value: object
    is_fall_case: bool
    end_chat: bool
    response: str


def _as_list(value):
    if value is None:
        return []

    if isinstance(value, list):
        return value

    return [value]


def _remaining_fields(state: GraphState):
    ignored_fields = set(_as_list(state.get("ignored_field")))
    analyzed_fields = set((state.get("analyzed_field") or {}).keys())
    return [
        field_name
        for field_name in _as_list(state.get("missing_field"))
        if field_name not in ignored_fields and field_name not in analyzed_fields
    ]


def _field_labels(field_names):
    return [
        FIELD_LABELS.get(field_name, field_name)
        for field_name in field_names
    ]


def _append_response(state: GraphState, content: str):
    current_response = state.get("response", "")
    if current_response:
        return f"{current_response}\n\n{content}"

    return content


def _latest_user_chat(chats: list):
    for chat in reversed(chats):
        if isinstance(chat, dict):
            if chat.get("role") == "user":
                return chat
            continue

        return {"role": "user", "message": str(chat)}

    return None


def _valid_fields():
    return set(JD_FIELDS) | set(COMPANY_INFO_FIELDS)


def _is_empty_value(value):
    if value is None:
        return True

    if isinstance(value, str):
        return not value.strip()

    return value == [] or value == {}


def _display_value(value):
    if isinstance(value, list):
        return ", ".join(str(item) for item in value)

    if isinstance(value, dict):
        return ", ".join(f"{key}: {val}" for key, val in value.items())

    return str(value)


################################################################
#                      node definition
################################################################

def focus_intent_node(state: GraphState) -> GraphState:
    latest_user_chat = _latest_user_chat(_as_list(state.get("chats")))
    ignored_field = _as_list(state.get("ignored_field"))
    focus_field = state.get("focus_field", "")

    if latest_user_chat is None:
        return {
            "ignored_field": ignored_field,
            "focus_field": focus_field,
        }

    intent = agents.invoke_field_intent_node([latest_user_chat])
    valid_fields = _valid_fields()
    is_fall_case = bool(intent.get("is_fall_case"))
    extracted_focus_field = intent.get("focus_field") or ""
    next_ignored_field = [
        field_name
        for field_name in ignored_field
        if field_name in valid_fields
    ]
    added_ignored_field = []

    for field_name in _as_list(intent.get("ignore_field")):
        if field_name in valid_fields and field_name not in next_ignored_field:
            next_ignored_field.append(field_name)
            added_ignored_field.append(field_name)

    next_focus_field = extracted_focus_field or focus_field
    if next_focus_field not in valid_fields or next_focus_field in next_ignored_field:
        next_focus_field = ""

    response = state.get("response", "")
    if is_fall_case:
        response = _append_response(
            state,
            "죄송합니다. 저는 그런 내용에 대해서 답변할 수 없습니다.",
        )
        if focus_field:
            focus_label = FIELD_LABELS.get(focus_field, focus_field)
            response = _append_response(
                {"response": response},
                f"{focus_label} 항목에 기입할 내용에 대해서 말씀해 주세요.",
            )
            next_focus_field = focus_field
        else:
            next_focus_field = ""
    elif not next_focus_field:
        if added_ignored_field:
            response = _append_response(
                state,
                f"{', '.join(_field_labels(added_ignored_field))} 항목은 기입 대상 목록에서 빼겠습니다.",
            )
        else:
            response = _append_response(
                state,
                "기입에서 제거하고 싶은 항목이나 기입하고 싶은 항목을 명시해 주세요.",
            )

    return {
        "ignored_field": next_ignored_field,
        "focus_field": next_focus_field,
        "is_fall_case": is_fall_case,
        "response": response,
    }


def field_intent_node(state: GraphState) -> GraphState:
    focus_field = state.get("focus_field", "")
    latest_user_chat = _latest_user_chat(_as_list(state.get("chats")))

    if not focus_field or latest_user_chat is None:
        return {
            "analyzed_field": {},
            "extracted_value": None,
        }

    field_agent_map = {
        "company_name": agents.invoke_company_name_node,
        "employee_count": agents.invoke_employee_count_node,
        "team_composition": agents.invoke_team_composition_node,
        "company_description": agents.invoke_company_description_node,
        "employ_style": agents.invoke_employ_style_node,
        "job_name": agents.invoke_job_name_node,
        "education_level": agents.invoke_education_level_node,
        "major": agents.invoke_major_node,
        "career_level": agents.invoke_career_level_node,
        "required_skill": agents.invoke_required_skill_node,
        "preferred_skill": agents.invoke_preferred_skill_node,
        "main_task": agents.invoke_main_task_node,
        "hiring_reason": agents.invoke_hiring_reason_node,
        "work_type": agents.invoke_work_type_node,
    }
    invoke_field_agent = field_agent_map.get(focus_field)
    if invoke_field_agent is None:
        return {
            "analyzed_field": {},
            "extracted_value": None,
        }

    extracted_value = invoke_field_agent([latest_user_chat])
    if focus_field == "employee_count" and isinstance(extracted_value, (int, float)) and extracted_value < 0:
        return {
            "analyzed_field": {},
            "extracted_value": extracted_value,
        }

    if _is_empty_value(extracted_value):
        return {
            "analyzed_field": {},
            "extracted_value": extracted_value,
        }

    return {
        "analyzed_field": {
            focus_field: extracted_value,
        },
        "extracted_value": extracted_value,
        "focus_field": "",
        "response": _append_response(
            state,
            f"'{FIELD_LABELS.get(focus_field, focus_field)}' 데이터를 확인하고, 그 내용을 '{_display_value(extracted_value)}' 값으로 채워 넣었습니다.",
        ),
    }


def guide_node(state: GraphState) -> GraphState:
    focus_field = state.get("focus_field", "")
    focus_label = FIELD_LABELS.get(focus_field, focus_field)
    guide_input = {
        "jd": state.get("jd", {}),
        "comp_info": state.get("comp_info", {}),
        "focus_field": focus_field,
        "focus_label": focus_label,
    }

    mask_result = masking_service.invoke({
        "jd": guide_input["jd"],
        "comp_info": guide_input["comp_info"],
    })
    masked_input = mask(guide_input, mask_result)
    masked_response = agents.invoke_guide_response_node(masked_input)
    guide_response = unmask({"response": masked_response}, mask_result)["response"]

    return {
        "response": _append_response(
            state,
            guide_response or f"{focus_label} 항목에 넣을 내용을 찾지 못했습니다. 해당 항목에 들어갈 내용을 다시 말씀해 주세요.",
        ),
        "end_chat": False,
    }


def set_focus_node(state: GraphState) -> GraphState:
    remaining_fields = _remaining_fields(state)

    if not remaining_fields:
        return {
            "chats": list(state.get("chats", [])),
            "missing_field": _as_list(state.get("missing_field")),
            "ignored_field": _as_list(state.get("ignored_field")),
            "focus_field": "",
            "analyzed_field": state.get("analyzed_field", {}),
            "end_chat": True,
            "response": _append_response(
                state,
                "폼 기입이 모두 끝났습니다. 필요한 회사 정보와 JD 정보가 모두 채워졌습니다. 수고하셨습니다.",
            ),
        }

    company_fields = [
        field_name
        for field_name in remaining_fields
        if field_name in COMPANY_INFO_FIELDS
    ]
    jd_fields = [
        field_name
        for field_name in remaining_fields
        if field_name in JD_FIELDS
    ]

    response_parts = []
    if company_fields:
        response_parts.append(f"회사 정보에는 {', '.join(_field_labels(company_fields))} 부분이 비어 있습니다.")

    if jd_fields:
        response_parts.append(f"JD 정보에는 {', '.join(_field_labels(jd_fields))} 부분이 비어 있습니다.")

    response_parts.append("어느 폼을 먼저 채우고 싶은지 말씀해 주세요. 채우고 싶지 않은 부분이 있다면 말씀해 주시면 반영됩니다.")

    return {
        "chats": list(state.get("chats", [])),
        "missing_field": _as_list(state.get("missing_field")),
        "ignored_field": _as_list(state.get("ignored_field")),
        "focus_field": "",
        "analyzed_field": state.get("analyzed_field", {}),
        "end_chat": False,
        "response": _append_response(state, "\n".join(response_parts)),
    }


################################################################
#                      conditional edge
################################################################

RouteFromStart = Literal[
    "set_focus",
    "focus_intent",
]

RouteFromFocusIntent = Literal[
    "set_focus",
    "field_intent",
    "end",
]

RouteFromFieldIntent = Literal[
    "set_focus",
    "guide",
]


def route_from_start(state: GraphState) -> RouteFromStart:
    if not _as_list(state.get("chats")):
        return "set_focus"

    return "focus_intent"


def route_from_focus_intent(state: GraphState) -> RouteFromFocusIntent:
    if state.get("is_fall_case", False) and state.get("focus_field", ""):
        return "end"

    if state.get("is_fall_case", False):
        return "set_focus"

    if state.get("focus_field", ""):
        return "field_intent"

    return "set_focus"


def route_from_field_intent(state: GraphState) -> RouteFromFieldIntent:
    if _is_empty_value(state.get("extracted_value")):
        return "guide"

    return "set_focus"


################################################################
#                      graph builder
################################################################

graph_instance = None


def build_graph():
    builder = StateGraph(GraphState)

    builder.add_node("focus_intent", focus_intent_node)
    builder.add_node("field_intent", field_intent_node)
    builder.add_node("guide", guide_node)
    builder.add_node("set_focus", set_focus_node)

    builder.add_conditional_edges(
        START,
        route_from_start,
        {
            "set_focus": "set_focus",
            "focus_intent": "focus_intent",
        },
    )
    builder.add_conditional_edges(
        "focus_intent",
        route_from_focus_intent,
        {
            "set_focus": "set_focus",
            "field_intent": "field_intent",
            "end": END,
        },
    )
    builder.add_conditional_edges(
        "field_intent",
        route_from_field_intent,
        {
            "set_focus": "set_focus",
            "guide": "guide",
        },
    )
    builder.add_edge("set_focus", END)
    builder.add_edge("guide", END)

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
    chats: list,
    missing_field: list,
    comp_info=None,
    jd=None,
    ignored_field=None,
    focus_field="",
):
    state: GraphState = {
        "comp_info": comp_info or {},
        "jd": jd or {},
        "chats": chats,
        "missing_field": missing_field,
        "ignored_field": _as_list(ignored_field),
        "focus_field": focus_field or "",
    }
    
    result = get_graph().invoke(state)
    
    return {
        "response": result.get("response", ""),
        "state": {
            "comp_info": result.get("comp_info", {}),
            "jd": result.get("jd", {}),
            "ignored_field": result.get("ignored_field", []),
            "focus_field": result.get("focus_field", ""),
            "analyzed_field": result.get("analyzed_field", {}),
            "end_chat": result.get("end_chat", False),
        },
    }
