import json
import operator
import os
from copy import deepcopy
from pathlib import Path
from typing import Annotated, Literal, Union

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

DATABASE_HOST = os.environ.get("RDS_HOSTNAME")

if DATABASE_HOST:
    pass

if not DATABASE_HOST:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0


def reduce_chats(left: list[str], right: list[str]) -> list[str]:
    """두 리스트를 하나로 합치고 중복된 메시지는 순서를 유지하며 제거합니다."""
    result = left.copy()
    for item in right:
        if item not in result:
            result.append(item)
    return result


class GraphState(TypedDict, total=False):
    """각 노드가 공유하는 대화 상태와 중간 결과 필드를 정의합니다."""

    chats: Annotated[list[str], reduce_chats]
    state: str
    is_out_of_bounds: bool
    is_hr_case: bool
    is_app_manual: bool
    rag_search_query: str
    memories: Annotated[list[dict], operator.add]
    retrieved_manual_docs: Annotated[list[str], reduce_chats]
    out_of_bounds_response: str
    hr_response: str
    app_manual_response: str
    response: str


async def invoke_llm_async(llm, prompt: str, chats: list[str]):
    messages = [SystemMessage(content=prompt)]
    for index, chat in enumerate(chats):
        if index % 2 == 0:
            messages.append(HumanMessage(content=chat))
        else:
            messages.append(AIMessage(content=chat))
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


async def fall_case_node(state: GraphState) -> GraphState:
    llm_result = await invoke_llm_async(fall_case_model, fall_case_prompt, state["chats"])
    return {
        "is_out_of_bounds": llm_result.is_out_of_bounds,
        "is_hr_case": llm_result.is_hr_case,
        "is_app_manual": llm_result.is_app_manual,
        "rag_search_query": llm_result.rag_search_query,
        "out_of_bounds_response": llm_result.out_of_bounds_response,
    }


# ==================== 2단계-A: HR 대화 메모리 추출 노드 ====================

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


async def context_extractor_node(state: GraphState) -> GraphState:
    llm_result = await invoke_llm_async(
        context_extractor_model, context_extractor_prompt, state["chats"]
    )
    return {
        "memories": [
            {"context": memory.context, "value": memory.value} for memory in llm_result.memories
        ]
    }


# ==================== 2단계-B: HR 데이터 분석 노드 ====================

answer_llm = ChatOpenAI(model=LLM_MODEL, temperature=TEMPERATURE)

JobDescription = {
    "id": 1,
    "account_id": 1,
    "job_name": "잡코리아 2026 프론트엔드 팀 신규 채용",
    "education_level": "대졸 이상",
    "major": "컴퓨터 공학과 혹은 그에 준하는 관련 학과",
    "career_level": "경력 3년 이상",
    "required_skill": ["html", "CSS", "JS"],
    "preferred_skill": ["react", "vue", "vite"],
    "main_task": "프론트엔드 개발",
    "hiring_reason": "",
    "work_type": "정규직",
    "status": "on_going",
    "created_at": "2026-06-04 12:00:00",
    "updated_at": "2026-06-04 12:00:00",
}

hr_analyst_prompt = """
당신은 자사 채용 데이터베이스(JD)를 직접 분석하고 통계를 내어 답변하는 HR 분석 챗봇입니다.
제공된 [자사 채용 데이터베이스]를 읽고 질문에 정확하게 답변하세요.
이모티콘과 이모지는 사용하지 마세요.
"""


async def hr_analyst_node(state: GraphState) -> GraphState:
    search_query = state["chats"][-1]
    extracted_memories = state.get("memories", [])

    if extracted_memories:
        memory_str = json.dumps(extracted_memories, ensure_ascii=False)
        search_query = f"[참고할 이전 메모리 데이터]: {memory_str}\n[사용자 질문]: {search_query}"

    user_prompt = f"사용자 질문:\n{search_query}\n\n자사 채용 데이터베이스:\n{json.dumps(JobDescription, ensure_ascii=False, indent=2)}"

    llm_response = await answer_llm.ainvoke(
        [SystemMessage(content=hr_analyst_prompt), HumanMessage(content=user_prompt)]
    )
    return {"hr_response": llm_response.content}


# ==================== 2단계-C: 앱 가이드 문서 RAG 검색 노드 ====================

APP_MANUAL_DOCS = [
    "자기소개서 업로드는 마이페이지의 지원서 관리 메뉴에서 파일 업로드 버튼을 눌러 진행할 수 있습니다.",
    "지원자 분석 리포트는 채용 공고 상세 화면에서 지원자 목록을 선택한 뒤 리포트 생성 버튼을 클릭하면 확인할 수 있습니다.",
    "채용 공고 등록은 관리자 페이지의 JD 관리 메뉴에서 새 공고 작성 버튼을 눌러 직무명, 필수 역량, 우대 사항을 입력하면 완료됩니다.",
    "이전 채팅 기록은 챗봇 화면 왼쪽의 대화 목록에서 확인할 수 있으며, 원하는 대화를 선택하면 기존 질문과 답변을 다시 볼 수 있습니다.",
    "지원자 평가 결과는 지원자 상세 페이지의 평가 탭에서 확인할 수 있고, 점수와 코멘트는 평가 수정 버튼을 통해 변경할 수 있습니다.",
]


def _tokenize_for_mock_search(text: str) -> set[str]:
    normalized = (
        text.replace("?", " ")
        .replace("!", " ")
        .replace(".", " ")
        .replace(",", " ")
        .replace("/", " ")
    )
    return {token.strip() for token in normalized.split() if len(token.strip()) >= 2}


def search_app_manual(query: str, top_k: int = 2) -> list[str]:
    query_tokens = _tokenize_for_mock_search(query)
    scored_docs = []
    for doc in APP_MANUAL_DOCS:
        doc_tokens = _tokenize_for_mock_search(doc)
        score = len(query_tokens & doc_tokens)
        for token in query_tokens:
            if token in doc:
                score += 1
        if score > 0:
            scored_docs.append((score, doc))
    scored_docs.sort(key=lambda item: item[0], reverse=True)
    return [doc for _, doc in scored_docs[:top_k]]


app_manual_rag_prompt = """
당신은 우리 애플리케이션 사용법을 안내하는 상담 챗봇입니다.
검색된 사용설명서 문서를 근거로 짧고 정확하게 답변하세요.
이모티콘과 이모지는 사용하지 마세요.
"""


async def app_manual_rag_node(state: GraphState) -> GraphState:
    query = state.get("rag_search_query", "")
    retrieved_docs = search_app_manual(query)

    user_prompt = f"사용자 질문:\n{state['chats'][-1] if state.get('chats') else query}\n\n검색된 사용설명서 문서:\n{json.dumps(retrieved_docs, ensure_ascii=False, indent=2)}"

    llm_response = await answer_llm.ainvoke(
        [SystemMessage(content=app_manual_rag_prompt), HumanMessage(content=user_prompt)]
    )
    return {"retrieved_manual_docs": retrieved_docs, "app_manual_response": llm_response.content}


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


async def summary_node(state: GraphState) -> GraphState:
    user_question = state["chats"][-1]
    responses_to_merge = []
    
    if state.get("is_out_of_bounds") and state.get("out_of_bounds_response"):
        responses_to_merge.append(f"[시스템 1 (범위 밖 질문 안내)]:\n{state['out_of_bounds_response']}")
    if state.get("is_hr_case") and state.get("hr_response"):
        responses_to_merge.append(f"[시스템 2 (HR 채용 통계 분석)]:\n{state['hr_response']}")
    if state.get("is_app_manual") and state.get("app_manual_response"):
        responses_to_merge.append(f"[시스템 3 (앱 사용법 안내)]:\n{state['app_manual_response']}")

    if not responses_to_merge:
        return {"response": "질문하신 내용에 대해 안내해 드릴 수 있는 내용을 찾지 못했습니다."}

    merge_input = f"사용자 원본 질문: {user_question}\n\n취합해야 할 개별 답변 목록:\n" + "\n\n".join(
        responses_to_merge
    )

    llm_response = await answer_llm.ainvoke(
        [SystemMessage(content=summary_prompt), HumanMessage(content=merge_input)]
    )
    return {"response": llm_response.content}

