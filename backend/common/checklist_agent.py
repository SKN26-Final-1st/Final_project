import json
import math
import os
from typing import Any, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from openai import OpenAI
from pinecone import Pinecone
from pydantic import BaseModel, Field

from .prompt import (
    EXTRACT_QUERY_SYSTEM_PROMPT,
    EXTRACT_QUERY_USER_PROMPT,
    FIT_CHECKLIST_SYSTEM_PROMPT,
    FIT_CHECKLIST_USER_PROMPT,
    USER_QUERY_PROMPT,
)
from .utils import load_env

load_env()

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0


def invoke_agent(llm, prompt: str, chats: list):
    messages = [SystemMessage(content=prompt)]

    for index, chat in enumerate(chats):
        if isinstance(chat, dict):
            role = str(chat.get("role", "user")).lower()
            content = str(chat.get("message", ""))
        else:
            role = "user" if index % 2 == 0 else "agent"
            content = str(chat)

        if role == "agent":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))

    return llm.invoke(messages)


def _make_llm(structure_model):
    return ChatOpenAI(
        model=LLM_MODEL,
        temperature=TEMPERATURE,
    ).with_structured_output(structure_model)


def _is_empty_input(value: Any) -> bool:
    return value is None or value == "" or value == {} or value == []


################################################################
#                      extract_query_node
################################################################


class SearchQueryStructure(BaseModel):
    """회사/JD 정보를 RAG 검색용 한 문장 쿼리로 요약한 응답 구조입니다."""

    query: str = Field(
        description="채용 상황과 목적을 반영한 RAG 임베딩 검색용 한 문장 쿼리"
    )


extract_query_node = None

extract_query_prompt = EXTRACT_QUERY_SYSTEM_PROMPT


def invoke_extract_query_node(compinfo: dict, jdinfo: dict) -> str:
    global extract_query_node

    query_context = {
        "company_info": None if _is_empty_input(compinfo) else compinfo,
        "jd_info": None if _is_empty_input(jdinfo) else jdinfo,
    }

    if not any(query_context.values()):
        raise ValueError("쿼리 생성을 위한 회사 정보 또는 JD 정보가 필요합니다.")

    if extract_query_node is None:
        extract_query_node = _make_llm(SearchQueryStructure)

    context_json = json.dumps(query_context, ensure_ascii=False, indent=2)
    user_prompt = EXTRACT_QUERY_USER_PROMPT.format(context_json=context_json)
    result = invoke_agent(extract_query_node, extract_query_prompt, [user_prompt])
    return result.model_dump()["query"].strip()


################################################################
#                      fit_checklist_node
################################################################


class FitChecklistStructure(BaseModel):
    """회사와 JD에 대한 지원자 적합성 체크리스트 응답 구조입니다."""

    checklist: List[str] = Field(
        description="지원자가 회사와 JD에 적합한지 판단하기 위한 체크리스트 목록"
    )


fit_checklist_node = None

fit_checklist_prompt = FIT_CHECKLIST_SYSTEM_PROMPT


def invoke_fit_checklist_node(
    company_info: Any,
    jd_info: Any,
    db_data: list[str] | None = None,
    checklist_count: int = 10,
    user_query: str = "",
) -> list[str]:
    global fit_checklist_node

    checklist_context = {
        "company_info": None if _is_empty_input(company_info) else company_info,
        "jd_info": None if _is_empty_input(jd_info) else jd_info,
        "db_data": None if _is_empty_input(db_data) else db_data,
        "checklist_count": checklist_count,
    }

    if not any(checklist_context[key] for key in ("company_info", "jd_info", "db_data")):
        raise ValueError("체크리스트 생성을 위한 회사 정보, JD 정보, DB 데이터 중 최소 하나가 필요합니다.")

    if fit_checklist_node is None:
        fit_checklist_node = _make_llm(FitChecklistStructure)

    context_json = json.dumps(checklist_context, ensure_ascii=False, indent=2)
    user_prompt = FIT_CHECKLIST_USER_PROMPT.format(
        checklist_count=checklist_count,
        context_json=context_json,
    )
    if user_query.strip():
        user_prompt += "\n\n" + USER_QUERY_PROMPT.format(user_query=user_query.strip())

    result = invoke_agent(fit_checklist_node, fit_checklist_prompt, [user_prompt])
    return result.model_dump()["checklist"]


################################################################
#                      search_embedding_node
################################################################


pinecone_client = None
pinecone_index = None
embedding_client = None


def _validate_checklist_count(cnt: int):
    if isinstance(cnt, bool) or not isinstance(cnt, int) or cnt <= 0:
        raise ValueError("cnt는 1 이상의 정수여야 합니다.")


def get_embedding_client():
    """RAG 검색 쿼리를 벡터화할 OpenAI embedding 클라이언트를 재사용합니다."""

    global embedding_client

    if embedding_client is None:
        embedding_client = OpenAI()

    return embedding_client


def get_pinecone_index():
    """체크리스트 참고 데이터를 조회할 Pinecone index 핸들을 재사용합니다."""

    global pinecone_client, pinecone_index

    if pinecone_index is None:
        pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        pinecone_index = pinecone_client.Index(host=os.getenv("PINECONE_HOST"))

    return pinecone_index


def invoke_search_embedding_node(query: str, cnt: int = 5) -> list[str]:
    """검색 쿼리로 필수/우대 조건 namespace에서 참고 체크리스트를 가져옵니다."""

    _validate_checklist_count(cnt)

    query_vector = get_embedding_client().embeddings.create(
        model="text-embedding-3-small",
        input=query,
    ).data[0].embedding

    q_cnt = math.ceil(cnt * 3 / 5)
    p_cnt = cnt - q_cnt

    qresult = get_pinecone_index().query(
        namespace="qualify_conditions",
        vector=query_vector,
        top_k=q_cnt,
        include_metadata=True,
    )
    qlist = [r["metadata"]["condition"] for r in qresult["matches"]]

    plist = []
    if p_cnt > 0:
        presult = get_pinecone_index().query(
            namespace="preffered_conditions",
            vector=query_vector,
            top_k=p_cnt,
            include_metadata=True,
        )
        plist = [r["metadata"]["condition"] for r in presult["matches"]]

    return qlist + plist
