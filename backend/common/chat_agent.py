import json
import os
from typing import Literal, Union

from pinecone import Pinecone
from openai import OpenAI


from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

try:
    from .utils import load_env
except ImportError:
    from utils import load_env

load_env()

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
    rag_search_query: str   # app_manual 전용 검색 쿼리
    hr_search_query: str    # hr_case 전용 검색 쿼리


fall_case_model = None

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

[rag_search_query 생성 규칙 - 앱 사용법 전용]
- is_app_manual이 True인 경우에만 채워주세요. 사용자 질문에서 핵심 기능/화면 키워드만 추출해 명사형으로 작성하세요.
  예) "로그인 어떻게 해?" → "로그인 방법"
  예) "지원서 파일 올리려면 어떻게 해?" → "지원서 파일 업로드"
  예) "대시보드에서 뭘 볼 수 있어?" → "대시보드 기능"
  예) "AI 문서 검색 플로팅 버튼이 어디 있어? 그리고 PM JD 우대 기술도 알려줘." → "AI 문서 검색 플로팅 버튼 위치" (app 관련 부분만)
- is_app_manual이 False이면 빈 문자열로 두세요.

[hr_search_query 생성 규칙 - HR 데이터 조회 전용]
- is_hr_case가 True인 경우에만 채워주세요. 조회가 필요한 HR 데이터 키워드만 추출해 명사형으로 작성하세요.
  예) "백엔드 JD 필수 기술이 뭐야?" → "백엔드 JD 필수 기술"
  예) "AI 문서 검색 플로팅 버튼이 어디 있어? 그리고 PM JD 우대 기술도 알려줘." → "PM JD 우대 기술" (hr 관련 부분만)
  예) "경력 3년 이상 요구하는 직무가 뭐야?" → "경력 요건 직무 목록"
- is_hr_case가 False이면 빈 문자열로 두세요.
"""


async def invoke_fall_case_node(chats: list[dict]) -> FallCaseStructure:
    global fall_case_model

    if fall_case_model is None:
        fall_case_model = ChatOpenAI(
            model=LLM_MODEL,
            temperature=TEMPERATURE,
        ).with_structured_output(FallCaseStructure)

    return await invoke_llm_async(fall_case_model, fall_case_prompt, chats)


class MemoryItem(BaseModel):
    context: str = Field(description="데이터가 의미하는 맥락")
    value: Union[int, float, str] = Field(description="실제 데이터 값")


class ContextExtractorStructure(BaseModel):
    memories: list[MemoryItem] = Field(
        default_factory=list,
        description="현재 질문 해결에 필요한 이전 대화의 수치/값 목록",
    )


context_extractor_model = None

context_extractor_prompt = """
당신은 HR 챗봇의 메모리 추출기입니다.
현재 사용자 질문을 해결하는 데 필요한 이전 대화의 수치, 인원수, 점수, 금액, 날짜, 비율 등을 추출하세요.
"""


async def invoke_context_extractor_node(chats: list[dict]) -> ContextExtractorStructure:
    global context_extractor_model

    if context_extractor_model is None:
        context_extractor_model = ChatOpenAI(
            model=LLM_MODEL,
            temperature=TEMPERATURE,
        ).with_structured_output(ContextExtractorStructure)

    return await invoke_llm_async(context_extractor_model, context_extractor_prompt, chats)


answer_llm = None


def get_answer_llm():
    global answer_llm

    if answer_llm is None:
        answer_llm = ChatOpenAI(model=LLM_MODEL, temperature=TEMPERATURE)

    return answer_llm

hr_analyst_prompt = """
당신은 자사 채용 데이터베이스(JD) 및 이전 대화 맥락을 직접 분석하고 통계를 내어 답변하는 HR 분석 챗봇입니다.

[답변 작성 필수 규칙]
1. 제공된 [자사 채용 데이터베이스]와 [참고할 이전 메모리 데이터]를 종합적으로 분석하세요.
2. 만약 현재 채용 데이터베이스가 비어있더라도, [참고할 이전 메모리 데이터]에 관련 수치나 인원수 정보가 있다면 그것을 신뢰할 수 있는 사실로 판단하여 "백엔드 지원자는 총 X명입니다"와 같이 확정형 문장으로 명확하게 답변하세요. "데이터베이스에는 없지만 메모리에는 있다"처럼 사용자를 혼란스럽게 하는 모순된 표현은 절대 금지합니다.
3. 이모티콘과 이모지는 사용하지 마세요.
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

    llm_response = await get_answer_llm().ainvoke(
        [SystemMessage(content=hr_analyst_prompt), HumanMessage(content=user_prompt)]
    )
    return llm_response.content


# ==================== 2단계-C: 앱 가이드 문서 RAG 검색 노드 ====================

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


app_manual_rag_prompt = """
당신은 우리 애플리케이션 사용법을 안내하는 상담 챗봇입니다.
검색된 사용설명서 문서를 근거로 짧고 정확하게 답변하세요.
이모티콘과 이모지는 사용하지 마세요.
"""


async def invoke_app_manual_rag_agent(query: str, user_question: str) -> tuple[str, list[str]]:
    retrieved_docs = search_app_manual(query)

    user_prompt = f"사용자 질문:\n{user_question}\n\n검색된 사용설명서 문서:\n{json.dumps(retrieved_docs, ensure_ascii=False, indent=2)}"

    llm_response = await get_answer_llm().ainvoke(
        [SystemMessage(content=app_manual_rag_prompt), HumanMessage(content=user_prompt)]
    )
    return llm_response.content, retrieved_docs


# ==================== 3단계: 답변 최종 요약 및 병합 노드 ====================

summary_prompt = """
당신은 답변 요약 및 병합 전문가입니다.
사용자의 질문에 대해 여러 시스템(범위 밖 안내, HR 분석 결과, 앱 사용법 안내)에서 도출된 개별 답변들을 보고, 맥락이 자연스럽게 이어지는 하나의 통합된 답변 문장으로 재구성하세요.

[연결어 및 문장 결합 규칙]
1. 하위 답변들을 단순히 문장 단위로 나열하거나 붙여넣지 마세요. 문맥에 맞는 적절한 부사와 접속사(예: '다만', '한편', '이와 관련하여', '또한')를 유기적으로 사용하여 흐름을 매끄럽게 만드세요.
2. 만약 앞문장과 뒷문장의 성격이 다를 때(예: 범위 밖 질문 거절 + 정상 답변 제공)는 "전자의 정보는 제공할 수 없으나, 후자의 경우 ~입니다" 혹은 "A에 대한 안내는 어려우나, 요청하신 B에 대해 말씀드리겠습니다"처럼 대조/전환의 연결어를 사용하여 세련되게 문장을 시작하세요.
3. 하위 답변 간에 내용이 중복되거나 모순되는 표현이 있다면, 생략하거나 더 정확한 수치가 포함된 정보를 기준으로 문장을 깔끔하게 다듬으세요.
4. 격식 있는 존댓말을 사용하고, 이모티콘이나 이모지는 절대 사용하지 마세요.
"""

async def invoke_summary_agent(merge_input: str) -> str:
    llm_response = await get_answer_llm().ainvoke(
        [SystemMessage(content=summary_prompt), HumanMessage(content=merge_input)]
    )
    return llm_response.content