import json
import os
import inspect
from collections.abc import Callable
from typing import Any, Union

from pinecone import Pinecone
from openai import OpenAI


from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

try:
    from .chat_prompt import (
        app_manual_rag_prompt,
        context_extractor_prompt,
        fall_case_prompt,
        hr_analyst_prompt,
        summary_prompt,
    )
except ImportError:
    from chat_prompt import (
        app_manual_rag_prompt,
        context_extractor_prompt,
        fall_case_prompt,
        hr_analyst_prompt,
        summary_prompt,
    )

try:
    from .utils import load_env
except ImportError:
    from utils import load_env

load_env()

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0


################################################################
#                      helper
################################################################


def _get_chat_role(chat: dict) -> str:
    return str(chat.get("role", "")).lower()


def _get_chat_message(chat: dict) -> str:
    return str(chat.get("message", ""))


def _make_chat_llm():
    return ChatOpenAI(model=LLM_MODEL, temperature=TEMPERATURE)


def _make_structured_llm(structure_model):
    return _make_chat_llm().with_structured_output(structure_model)


async def invoke_llm_async(llm, prompt: str, chats: list[dict]):
    messages = [SystemMessage(content=prompt)]
    for chat in chats:
        role = _get_chat_role(chat)
        message = _get_chat_message(chat)

        if role == "user":
            messages.append(HumanMessage(content=message))
        elif role in {"agent", "assistant", "ai"}:
            messages.append(AIMessage(content=message))
    return await llm.ainvoke(messages)


################################################################
#                      fall_case_node
################################################################

class FallCaseStructure(BaseModel):
    is_out_of_bounds: bool = Field(description="HR/채용 데이터/앱 사용법과 무관한 의도가 포함되면 True")
    is_hr_case: bool = Field(description="회사 정보, JD, 지원자 이력서, 분석 리포트 조회/집계/분석 의도가 있으면 True")
    is_app_manual: bool = Field(description="앱 화면, 버튼, 메뉴, 사용 방법 질문이 있으면 True")
    out_of_bounds_response: str = Field(description="범위 밖 의도가 있을 때만 짧은 거절/안내 문장")
    rag_search_query: str = Field(description="앱 사용법 검색용 핵심 명사구. is_app_manual이 False면 빈 문자열")
    hr_search_query: str = Field(description="HR 데이터 조회/분석용 핵심 명사구. is_hr_case가 False면 빈 문자열")


fall_case_model = None


async def invoke_fall_case_node(chats: list[dict]) -> FallCaseStructure:
    global fall_case_model

    if fall_case_model is None:
        fall_case_model = _make_structured_llm(FallCaseStructure)

    return await invoke_llm_async(fall_case_model, fall_case_prompt, chats)


################################################################
#                      context_extractor_node
################################################################


class MemoryItem(BaseModel):
    context: str = Field(description="데이터가 의미하는 맥락")
    value: Union[int, float, str] = Field(description="실제 데이터 값")


class ContextExtractorStructure(BaseModel):
    memories: list[MemoryItem] = Field(
        default_factory=list,
        description="현재 질문 해결에 필요한 이전 대화의 수치/값 목록",
    )


context_extractor_model = None


async def invoke_context_extractor_node(chats: list[dict]) -> ContextExtractorStructure:
    global context_extractor_model

    if context_extractor_model is None:
        context_extractor_model = _make_structured_llm(ContextExtractorStructure)

    return await invoke_llm_async(context_extractor_model, context_extractor_prompt, chats)


################################################################
#                      hr_analyst_node
################################################################


hr_analyst_model = None

RECRUITING_DATA_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "search_recruiting_data",
        "description": (
            "자사 채용 데이터베이스에서 사용자 질문과 관련된 채용 데이터를 검색합니다. "
            "JD, 회사 정보, 지원자 이력서, 분석 리포트 기반 통계나 분석이 필요할 때 호출하세요. "
            "반환 리스트의 첫 번째 요소는 항상 object_type이 company_info인 회사 정보입니다. "
            "JD/resume/report 필터에 검색 조건이 없으면 해당 객체 목록은 반환되지 않습니다. "
            "전체 목록이 필요할 때만 해당 필터의 get_all_list를 true로 설정하세요. "
            "여러 객체 필터를 동시에 쓰면 서로 다른 object_type 데이터가 한 리스트에 섞여 반환되므로, 개수 계산 시 object_type별로 분리해 세세요. "
            "관계는 JobDescription.id -> Resume.job_description_id -> AnalysisReport.resume_id 입니다. "
            "예: 백엔드 JD를 jd_filters.job_name_icontains='백엔드'로 찾고, 반환된 JD id를 "
            "resume_filters.job_description_id_in에 넣어 관련 이력서를 조회한 뒤, 반환된 Resume id를 "
            "report_filters.resume_id_in에 넣어 관련 리포트를 조회할 수 있습니다."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "모든 객체군에 공통 OR icontains로 적용할 자연어 검색어",
                },
                "jd_filters": {
                    "type": "object",
                    "description": "채용공고 JobDescription에 적용할 필터",
                    "properties": {
                        "get_all_list": {
                            "type": "boolean",
                            "description": "true이면 조건 없이 접근 가능한 모든 JD 목록을 조회합니다.",
                        },
                        "query": {"type": "string", "description": "JD 전체 텍스트 검색"},
                        "id_in": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "JobDescription.id 목록으로 조회",
                        },
                        "job_name_icontains": {"type": "string"},
                        "education_level_icontains": {"type": "string"},
                        "major_icontains": {"type": "string"},
                        "career_level_icontains": {"type": "string"},
                        "required_skill_icontains": {"type": "string"},
                        "preferred_skill_icontains": {"type": "string"},
                        "main_task_icontains": {"type": "string"},
                        "hiring_reason_icontains": {"type": "string"},
                        "work_type_in": {"type": "array", "items": {"type": "string"}},
                        "status_in": {"type": "array", "items": {"type": "string"}},
                    },
                },
                "resume_filters": {
                    "type": "object",
                    "description": "지원자 이력서 Resume에 적용할 필터",
                    "properties": {
                        "get_all_list": {
                            "type": "boolean",
                            "description": "true이면 조건 없이 접근 가능한 모든 이력서 목록을 조회합니다.",
                        },
                        "query": {"type": "string", "description": "이력서 전체 텍스트 검색"},
                        "id_in": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "Resume.id 목록으로 조회",
                        },
                        "job_description_id_in": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "Resume.job_description_id 목록으로 관련 JD의 이력서 조회",
                        },
                        "skill_icontains": {"type": "string"},
                        "education_level_icontains": {"type": "string"},
                        "experience_icontains": {"type": "string"},
                        "self_intoduction_icontains": {"type": "string"},
                        "certification_icontains": {"type": "string"},
                        "language_icontains": {"type": "string"},
                        "award_icontains": {"type": "string"},
                        "training_icontains": {"type": "string"},
                        "other_activity_icontains": {"type": "string"},
                        "reviewed_in": {"type": "array", "items": {"type": "boolean"}},
                    },
                },
                "report_filters": {
                    "type": "object",
                    "description": "분석 리포트 AnalysisReport에 적용할 필터",
                    "properties": {
                        "get_all_list": {
                            "type": "boolean",
                            "description": "true이면 조건 없이 접근 가능한 모든 분석 리포트 목록을 조회합니다.",
                        },
                        "query": {"type": "string", "description": "리포트 전체 텍스트 검색"},
                        "id_in": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "AnalysisReport.id 목록으로 조회",
                        },
                        "resume_id_in": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "AnalysisReport.resume_id 목록으로 관련 이력서의 리포트 조회",
                        },
                        "version_icontains": {"type": "string"},
                        "overall_grade_in": {"type": "array", "items": {"type": "string"}},
                        "overall_summary_icontains": {"type": "string"},
                        "candidate_summary_icontains": {"type": "string"},
                        "checklist_icontains": {"type": "string"},
                        "competency_analysis_icontains": {"type": "string"},
                        "fit_analysis_icontains": {"type": "string"},
                        "motive_icontains": {"type": "string"},
                        "collaboration_icontains": {"type": "string"},
                        "strength_icontains": {"type": "string"},
                        "concern_icontains": {"type": "string"},
                        "check_point_icontains": {"type": "string"},
                        "interview_question_icontains": {"type": "string"},
                        "final_comment_icontains": {"type": "string"},
                        "status_in": {"type": "array", "items": {"type": "string"}},
                    },
                },
                "limit": {
                    "type": "integer",
                    "description": "객체군별 최대 결과 개수",
                    "minimum": 1,
                    "maximum": 50,
                },
            },
        },
    },
}


async def _maybe_await(value):
    if inspect.isawaitable(value):
        return await value
    return value


async def _call_recruiting_data_searcher(
    recruiting_data_searcher: Callable[..., Any],
    tool_args: dict,
) -> list[dict]:
    allowed_args = {
        "query",
        "jd_filters",
        "resume_filters",
        "report_filters",
        "limit",
    }
    safe_args = {key: value for key, value in tool_args.items() if key in allowed_args}
    result = await _maybe_await(recruiting_data_searcher(**safe_args))
    return result or []


async def _invoke_hr_analyst_with_tools(
    messages: list,
    recruiting_data_searcher: Callable[..., Any],
) -> str:
    llm_with_tools = hr_analyst_model.bind_tools([RECRUITING_DATA_SEARCH_TOOL])
    current_messages = messages

    for _ in range(3):
        llm_response = await llm_with_tools.ainvoke(current_messages)
        tool_calls = getattr(llm_response, "tool_calls", None) or []

        if not tool_calls:
            return llm_response.content

        tool_messages = []
        for tool_call in tool_calls:
            if tool_call.get("name") != "search_recruiting_data":
                continue

            search_result = await _call_recruiting_data_searcher(
                recruiting_data_searcher,
                tool_call.get("args") or {},
            )
            tool_messages.append(
                ToolMessage(
                    content=json.dumps(search_result, ensure_ascii=False, indent=2),
                    tool_call_id=tool_call["id"],
                    name="search_recruiting_data",
                )
            )

        if not tool_messages:
            return llm_response.content

        current_messages = [*current_messages, llm_response, *tool_messages]

    final_response = await hr_analyst_model.ainvoke(current_messages)
    return final_response.content


async def invoke_hr_analyst_agent(
    search_query: str,
    extracted_memories: list[dict] | None = None,
    recruiting_data_searcher: Callable[..., Any] | None = None,
) -> str:
    global hr_analyst_model

    if hr_analyst_model is None:
        hr_analyst_model = _make_chat_llm()

    extracted_memories = extracted_memories or []

    if extracted_memories:
        memory_str = json.dumps(extracted_memories, ensure_ascii=False)
        search_query = f"[참고할 이전 메모리 데이터]: {memory_str}\n[사용자 질문]: {search_query}"

    if recruiting_data_searcher is None:
        raise ValueError("recruiting_data_searcher is required for HR analysis.")

    user_prompt = (
        f"사용자 질문:\n{search_query}\n\n"
        "자사 채용 데이터베이스는 search_recruiting_data 도구로 조회할 수 있습니다. "
        "질문에 답하기 위해 필요한 JD, 지원자 이력서, 분석 리포트 필터를 객체별로 나누어 도구를 호출하세요. "
        "도구 결과는 object_type과 data를 가진 리스트로 반환되며, 첫 번째 요소는 항상 회사 정보(company_info)입니다. "
        "특정 객체의 검색 조건이 없으면 그 객체 결과는 나오지 않습니다. 전체 목록이 필요할 때만 해당 필터에 get_all_list=true를 넣으세요. "
        "여러 객체를 한 번에 조회하면 결과 리스트에 object_type이 섞일 수 있으므로, 개수나 통계를 낼 때는 object_type별로 분리하세요. "
        "관계 키는 JobDescription.id -> Resume.job_description_id -> AnalysisReport.resume_id입니다. "
        "예를 들어 JD를 먼저 찾은 뒤 반환된 id로 resume_filters.job_description_id_in을 호출하고, "
        "이력서 id로 report_filters.resume_id_in을 호출해 연관 리포트를 찾을 수 있습니다. "
        "도구 결과와 이전 메모리 데이터만 근거로 답변하세요."
    )
    return await _invoke_hr_analyst_with_tools(
        [SystemMessage(content=hr_analyst_prompt), HumanMessage(content=user_prompt)],
        recruiting_data_searcher,
    )


################################################################
#                      app_manual_rag_node
################################################################


app_manual_rag_model = None
pinecone_client = None
pinecone_index = None
embedding_client = None



def get_embedding_client():
    global embedding_client

    if embedding_client is None:
        embedding_client = OpenAI()

    return embedding_client


def get_pinecone_index():
    global pinecone_client, pinecone_index

    if pinecone_index is None:
        pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        pinecone_index = pinecone_client.Index(host=os.getenv("PINECONE_HOST"))

    return pinecone_index


def search_app_manual(query: str, top_k: int = 2) -> list[str]:
    response = get_embedding_client().embeddings.create(
        model="text-embedding-3-small",
        input=query
    )

    result = get_pinecone_index().query(
        namespace="user_manual",
        vector=response.data[0].embedding,
        top_k=top_k,
        include_metadata=True
    )
    return [r["metadata"]["content"] for r in result["matches"]]


async def invoke_app_manual_rag_agent(query: str, user_question: str) -> tuple[str, list[str]]:
    global app_manual_rag_model

    if app_manual_rag_model is None:
        app_manual_rag_model = _make_chat_llm()

    retrieved_docs = search_app_manual(query)

    user_prompt = f"사용자 질문:\n{user_question}\n\n검색된 사용설명서 문서:\n{json.dumps(retrieved_docs, ensure_ascii=False, indent=2)}"

    llm_response = await app_manual_rag_model.ainvoke(
        [SystemMessage(content=app_manual_rag_prompt), HumanMessage(content=user_prompt)]
    )
    return llm_response.content, retrieved_docs


################################################################
#                      summary_node
################################################################


summary_model = None

async def invoke_summary_agent(merge_input: str) -> str:
    global summary_model

    if summary_model is None:
        summary_model = _make_chat_llm()

    llm_response = await summary_model.ainvoke(
        [SystemMessage(content=summary_prompt), HumanMessage(content=merge_input)]
    )
    return llm_response.content
