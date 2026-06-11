import json
import os
from pathlib import Path
from typing import Literal, Union
from pinecone import Pinecone
from openai import OpenAI

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

DATABASE_HOST = os.environ.get("RDS_HOSTNAME")

if DATABASE_HOST:
    pass

if not DATABASE_HOST:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0


def _get_chat_role(chat: dict) -> str:
    return str(chat.get("role", "")).lower()


def _get_chat_message(chat: dict) -> str:
    return str(chat.get("message", ""))


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


# ==================== 1단계: 질문 분류 노드 ====================

class FallCaseStructure(BaseModel):
    is_out_of_bounds: bool
    is_hr_case: bool
    is_app_manual: bool
    out_of_bounds_response: str
    rag_search_query: str


fall_case_model = ChatOpenAI(
    model=LLM_MODEL,
    temperature=TEMPERATURE,
).with_structured_output(FallCaseStructure)

fall_case_prompt = """
당신은 우리 회사 HR/채용 챗봇의 다중 의도 분류기입니다.
사용자의 가장 최근 입력을 분석하여, 아래의 3가지 속성이 각각 포함되어 있는지 여부를 True/False로 판단하세요.

분류 속성:
1. is_out_of_bounds: HR, 채용, 앱 사용법과 전혀 상관없는 질문(예: 날씨, 맛집 등)이 포함된 경우
2. is_hr_case: 우리 회사 채용 통계, 인원수, JD 내용, 지원자 점수/평가 등 '실제 데이터베이스 내부 데이터'를 조회하거나 분석해달라는 질문인 경우
3. is_app_manual: 우리 앱의 화면 위치, 버튼 클릭 방법, 메뉴 사용법, 리포트 생성 버튼 위치 등 '기능 사용법' 질문인 경우

[분류 예외 필수 규칙]
- 메뉴명이나 기능 이름 자체에 '지원자 분석 리포트', '채용 공고 등록', '평가 수정'과 같이 '지원자'나 '채용'이라는 단어가 포함되어 있더라도, 질문의 본질이 "어디서 봐요?", "어떻게 올려요?", "어느 버튼 눌러요?" 같은 '기능 위치/사용법'이라면 1번(is_hr_case)은 False로 하고 오직 3번(is_app_manual)만 True로 해야 합니다.
- 1번(is_hr_case)은 오직 통계를 내거나 실제 데이터 내용을 조회해야 할 때만 True로 켜세요.
"""


async def invoke_fall_case_node(chats: list[dict]) -> FallCaseStructure:
    return await invoke_llm_async(fall_case_model, fall_case_prompt, chats)


class MemoryItem(BaseModel):
    context: str = Field(description="데이터가 의미하는 맥락")
    value: Union[int, float, str] = Field(description="실제 데이터 값")


class ContextExtractorStructure(BaseModel):
    memories: list[MemoryItem] = Field(
        default_factory=list,
        description="현재 질문 해결에 필요한 이전 대화의 수치/값 목록",
    )


context_extractor_model = ChatOpenAI(
    model=LLM_MODEL,
    temperature=TEMPERATURE,
).with_structured_output(ContextExtractorStructure)

context_extractor_prompt = """
당신은 HR 챗봇의 메모리 추출기입니다.
현재 사용자 질문을 해결하는 데 필요한 이전 대화의 수치, 인원수, 점수, 금액, 날짜, 비율 등을 추출하세요.
"""


async def invoke_context_extractor_node(chats: list[dict]) -> ContextExtractorStructure:
    return await invoke_llm_async(context_extractor_model, context_extractor_prompt, chats)


answer_llm = ChatOpenAI(model=LLM_MODEL, temperature=TEMPERATURE)

hr_analyst_prompt = """
당신은 자사 채용 데이터베이스(JD)를 직접 분석하고 통계를 내어 답변하는 HR 분석 챗봇입니다.
제공된 [자사 채용 데이터베이스]를 읽고 질문에 정확하게 답변하세요.
이모티콘과 이모지는 사용하지 마세요.
"""


async def invoke_hr_analyst_agent(
    search_query: str,
    job_descriptions: list[dict] | None = None,
    extracted_memories: list[dict] | None = None,
) -> str:
    job_descriptions = job_descriptions or []
    extracted_memories = extracted_memories or []

    if extracted_memories:
        memory_str = json.dumps(extracted_memories, ensure_ascii=False)
        search_query = f"[참고할 이전 메모리 데이터]: {memory_str}\n[사용자 질문]: {search_query}"

    user_prompt = f"사용자 질문:\n{search_query}\n\n자사 채용 데이터베이스:\n{json.dumps(job_descriptions, ensure_ascii=False, indent=2)}"

    llm_response = await answer_llm.ainvoke(
        [SystemMessage(content=hr_analyst_prompt), HumanMessage(content=user_prompt)]
    )
    return llm_response.content


# ==================== 2단계-C: 앱 가이드 문서 RAG 검색 노드 ====================

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index(host=os.getenv("PINECONE_HOST"))
embedding_client = OpenAI()

def search_app_manual(query: str, top_k: int = 2) -> list[str]:
    global embedding_client, pinecone_index

    response = embedding_client.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )

    result = pinecone_index.query(
        namespace="user_manual",
        vector=response.data[0].embedding,
        top_k=top_k,
        include_metadata=True
    )
    return [r["metadata"]["content"] for r in result["matches"]]


app_manual_rag_prompt = """
당신은 우리 애플리케이션 사용법을 안내하는 상담 챗봇입니다.
검색된 사용설명서 문서를 근거로 짧고 정확하게 답변하세요.
이모티콘과 이모지는 사용하지 마세요.
"""


async def invoke_app_manual_rag_agent(query: str, user_question: str) -> tuple[str, list[str]]:
    retrieved_docs = search_app_manual(query)

    user_prompt = f"사용자 질문:\n{user_question}\n\n검색된 사용설명서 문서:\n{json.dumps(retrieved_docs, ensure_ascii=False, indent=2)}"

    llm_response = await answer_llm.ainvoke(
        [SystemMessage(content=app_manual_rag_prompt), HumanMessage(content=user_prompt)]
    )
    return llm_response.content, retrieved_docs


# ==================== 3단계: 답변 최종 요약 및 병합 노드 ====================

summary_prompt = """
당신은 답변 요약 및 병합 전문가입니다.
사용자의 질문에 대해 여러 시스템(범위 밖 안내, HR 분석 결과, 앱 사용법 안내)에서 도출된 개별 답변들을 보고, 
자연스럽게 이어지는 하나의 통합된 답변 문장으로 요약 및 재구성하세요.

규칙:
- 각 시스템 답변 중 비어있지 않은 내용(내용이 있는 답변)만 유기적으로 연결하세요.
- 시스템 답변 내용을 왜곡하거나 임의로 정보를 지워버리지 마세요.
- 문맥의 흐름에 맞게 적절한 접속사(그리고, 또한 등)를 사용해 가독성을 높이세요.
- 격식 있는 존댓말을 사용하고, 이모티콘이나 이모지는 절대 사용하지 마세요.
"""


async def invoke_summary_agent(merge_input: str) -> str:
    llm_response = await answer_llm.ainvoke(
        [SystemMessage(content=summary_prompt), HumanMessage(content=merge_input)]
    )
    return llm_response.content
