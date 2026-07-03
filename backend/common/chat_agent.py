import json
import os
from typing import Union

from pinecone import Pinecone
from openai import OpenAI


from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
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
    is_out_of_bounds: bool
    is_hr_case: bool
    is_app_manual: bool
    out_of_bounds_response: str
    rag_search_query: str   # app_manual 전용 검색 쿼리
    hr_search_query: str    # hr_case 전용 검색 쿼리


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


async def invoke_hr_analyst_agent(
    search_query: str,
    job_descriptions: list[dict] | None = None,
    extracted_memories: list[dict] | None = None,
) -> str:
    global hr_analyst_model

    if hr_analyst_model is None:
        hr_analyst_model = _make_chat_llm()

    job_descriptions = job_descriptions or []
    extracted_memories = extracted_memories or []

    if extracted_memories:
        memory_str = json.dumps(extracted_memories, ensure_ascii=False)
        search_query = f"[참고할 이전 메모리 데이터]: {memory_str}\n[사용자 질문]: {search_query}"

    user_prompt = f"사용자 질문:\n{search_query}\n\n자사 채용 데이터베이스:\n{json.dumps(job_descriptions, ensure_ascii=False, indent=2)}"

    llm_response = await hr_analyst_model.ainvoke(
        [SystemMessage(content=hr_analyst_prompt), HumanMessage(content=user_prompt)]
    )
    return llm_response.content


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
