import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Literal, Union

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


class GraphState(TypedDict, total=False):
    """각 노드가 공유하는 대화 상태와 중간 결과 필드를 정의합니다."""

    chats: list[str]
    state: str
    is_fall_case: int
    fall_case_type: int
    rag_search_query: str
    memories: list[dict]
    retrieved_manual_docs: list[str]
    response: str


def invoke_llm(llm, prompt: str, chats: list[str]):
    """대화 히스토리를 System/Human/AI 메시지 순서로 변환해 지정한 LLM을 호출합니다."""

    messages = [SystemMessage(content=prompt)]

    for index, chat in enumerate(chats):
        if index % 2 == 0:
            messages.append(HumanMessage(content=chat))
        else:
            messages.append(AIMessage(content=chat))

    return llm.invoke(messages)


class FallCaseStructure(BaseModel):
    """사용자 입력을 범위 밖, HR 질문, 앱 사용법 질문으로 분류한 결과 구조입니다."""

    is_fall_case: Literal[0, 1, 2] = Field(
        description="0=범위 밖 질문, 1=HR/채용 질문, 2=애플리케이션 사용법 질문"
    )
    response: str = Field(
        description="0번일 때 사용자에게 반환할 안내 답변. 1번 또는 2번이면 빈 문자열."
    )
    rag_search_query: str = Field(
        description="2번일 때 사용설명서 RAG 검색에 쓸 검색어. 0번 또는 1번이면 빈 문자열."
    )


fall_case_model = ChatOpenAI(
    model=LLM_MODEL,
    temperature=TEMPERATURE,
).with_structured_output(FallCaseStructure)

fall_case_prompt = """
당신은 우리 회사 HR/채용 챗봇의 입력 분류기입니다.
가장 최근 사용자 입력을 보고 반드시 아래 셋 중 하나로 분류하세요.

분류값:
- 0: HR/채용, 우리 회사 정보, 애플리케이션 사용법과 무관한 질문 또는 의미 없는 입력
- 1: 우리 회사 HR/채용/JD/직무/지원자/평가/채용 데이터 관련 질문
- 2: 우리 애플리케이션의 화면, 메뉴, 버튼, 기능, 사용 방법, 오류 해결 관련 질문

규칙:
- 다른 회사 이름이 명시된 채용 질문은 0으로 분류하세요.
- 일반적인 직무/채용 질문이지만 우리 회사 맥락으로 답할 수 있으면 1로 분류하세요.
- 앱 사용법, 화면 위치, 버튼 위치, 채팅 기록 확인 방법 등은 2로 분류하세요.
- 0이면 response에 정중한 안내 답변을 작성하세요.
- 1 또는 2이면 response는 빈 문자열로 두세요.
- 2이면 rag_search_query에 사용설명서 검색에 적합한 짧은 한국어 검색어를 넣으세요.
- 0 또는 1이면 rag_search_query는 빈 문자열로 두세요.
"""


def invoke_fall_case_node(chats: list[str] | str) -> FallCaseStructure:
    """최근 대화 내용을 기준으로 질문 유형을 분류하는 LLM 노드를 직접 호출합니다."""

    if isinstance(chats, str):
        chats = [chats]
    return invoke_llm(fall_case_model, fall_case_prompt, chats)


def fall_case_node(state: GraphState) -> GraphState:
    """그래프 상태의 대화를 분류하고, 범위 밖 질문이면 즉시 반환할 응답을 채웁니다."""

    llm_result = invoke_fall_case_node(state["chats"])

    rstate = deepcopy(state)
    rstate["is_fall_case"] = llm_result.is_fall_case
    rstate["fall_case_type"] = llm_result.is_fall_case
    rstate["rag_search_query"] = llm_result.rag_search_query

    if llm_result.is_fall_case == 0:
        rstate["response"] = llm_result.response
    else:
        rstate["response"] = ""

    return rstate


class MemoryItem(BaseModel):
    """이전 대화에서 현재 질문에 재사용할 수 있는 값과 그 맥락을 표현합니다."""

    context: str = Field(description="데이터가 의미하는 맥락")
    value: Union[int, float, str] = Field(description="실제 데이터 값")


class ContextExtractorStructure(BaseModel):
    """현재 질문 해결에 필요한 이전 대화의 수치/값 목록을 담는 구조입니다."""

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

규칙:
- 현재 질문에서 참조하는 값만 추출하세요.
- 관련 값이 없으면 memories는 빈 배열로 반환하세요.
- 단순히 이전 답변의 문서 내용이나 설명을 다시 묻는 경우에는 메모리를 추출하지 마세요.
"""


def invoke_context_extractor_node(chats: list[str] | str) -> ContextExtractorStructure:
    """대화 히스토리에서 현재 질문에 필요한 숫자, 날짜, 비율 같은 메모리를 추출합니다."""

    if isinstance(chats, str):
        chats = [chats]
    return invoke_llm(context_extractor_model, context_extractor_prompt, chats)


def context_extractor_node(state: GraphState) -> GraphState:
    """추출된 메모리를 그래프 상태에 저장해 다음 HR 분석 노드가 참고할 수 있게 합니다."""

    llm_result = invoke_context_extractor_node(state["chats"])

    rstate = deepcopy(state)
    rstate["memories"] = [
        {"context": memory.context, "value": memory.value}
        for memory in llm_result.memories
    ]
    return rstate


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
	"status": "on_going", # ["prepare", "on_going", "closed"] 3개 중
	"created_at": "2026-06-04 12:00:00",
	"updated_at": "2026-06-04 12:00:00"
}

hr_analyst_prompt = """
당신은 자사 채용 데이터베이스(JD)를 직접 분석하고 통계를 내어 답변하는 HR 분석 챗봇입니다.
제공된 [자사 채용 데이터베이스] 전체를 읽고, 사용자의 질문 의도에 맞게 정확하게 답변하세요.

규칙:
- 질문과 관련된 데이터만 분석하세요.
- 몇 명, 몇 개, 개수, 상태 같은 통계 질문은 정확한 수치를 먼저 답하세요.
- 데이터베이스에 없는 내용은 추측하지 말고 확인되지 않는다고 답하세요.
- raw JSON이나 내부 필드명을 그대로 나열하지 말고 자연어로 요약하세요.
- 존댓말을 사용하세요.
- 이모티콘과 이모지는 사용하지 마세요.
"""


def invoke_hr_analyst_agent(search_query: str) -> str:
    """사용자 질문과 목업 JD 데이터베이스를 함께 전달해 HR 분석 답변을 생성합니다."""

    user_prompt = f"""
사용자 질문:
{search_query}

자사 채용 데이터베이스:
{json.dumps(JobDescription, ensure_ascii=False, indent=2)}
"""

    llm_response = answer_llm.invoke([
        SystemMessage(content=hr_analyst_prompt),
        HumanMessage(content=user_prompt),
    ])
    return llm_response.content


def hr_analyst_node(state: GraphState) -> GraphState:
    """현재 질문과 필요 시 이전 메모리를 결합해 HR 분석 에이전트의 최종 답변을 저장합니다."""

    search_query = state["chats"][-1]
    extracted_memories = state.get("memories", [])

    if extracted_memories:
        memory_str = json.dumps(extracted_memories, ensure_ascii=False)
        search_query = f"""[참고할 이전 메모리 데이터]: {memory_str}
[사용자 질문]: {search_query}

위 메모리 데이터가 현재 질문 해결에 필요한 경우에만 사용해서 답변하세요."""

    rstate = deepcopy(state)
    rstate["response"] = invoke_hr_analyst_agent(search_query)
    return rstate


APP_MANUAL_DOCS = [
    "자기소개서 업로드는 마이페이지의 지원서 관리 메뉴에서 파일 업로드 버튼을 눌러 진행할 수 있습니다.",
    "지원자 분석 리포트는 채용 공고 상세 화면에서 지원자 목록을 선택한 뒤 리포트 생성 버튼을 클릭하면 확인할 수 있습니다.",
    "채용 공고 등록은 관리자 페이지의 JD 관리 메뉴에서 새 공고 작성 버튼을 눌러 직무명, 필수 역량, 우대 사항을 입력하면 완료됩니다.",
    "이전 채팅 기록은 챗봇 화면 왼쪽의 대화 목록에서 확인할 수 있으며, 원하는 대화를 선택하면 기존 질문과 답변을 다시 볼 수 있습니다.",
    "지원자 평가 결과는 지원자 상세 페이지의 평가 탭에서 확인할 수 있고, 점수와 코멘트는 평가 수정 버튼을 통해 변경할 수 있습니다.",
]

app_manual_rag_prompt = """
당신은 우리 애플리케이션 사용법을 안내하는 상담 챗봇입니다.
사용자의 질문과 검색된 사용설명서 문서를 근거로 짧고 정확하게 답변하세요.

규칙:
- 검색된 문서 내용만 근거로 답변하세요.
- 문서에 없는 내용은 추측하지 말고, 사용설명서에서 확인되지 않는다고 말하세요.
- 사용자가 바로 따라 할 수 있도록 메뉴명, 화면명, 버튼명을 포함해 안내하세요.
- 이모티콘과 이모지는 사용하지 마세요.
"""


def _tokenize_for_mock_search(text: str) -> set[str]:
    """간단한 목업 검색을 위해 문장부호를 제거하고 2글자 이상 토큰 집합으로 변환합니다."""

    normalized = (
        text.replace("?", " ")
        .replace("!", " ")
        .replace(".", " ")
        .replace(",", " ")
        .replace("/", " ")
    )
    return {token.strip() for token in normalized.split() if len(token.strip()) >= 2}


def search_app_manual(query: str, top_k: int = 2) -> list[str]:
    """앱 사용설명서 문서에서 검색어와 겹치는 토큰이 많은 문서를 상위 N개 반환합니다."""

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


def app_manual_rag_node(state: GraphState) -> GraphState:
    """앱 사용법 질문에 대해 목업 RAG 검색 결과를 근거로 안내 답변을 생성합니다."""

    query = state.get("rag_search_query", "")
    retrieved_docs = search_app_manual(query)

    user_prompt = f"""
사용자 질문:
{state["chats"][-1] if state.get("chats") else query}

RAG 검색 쿼리:
{query}

검색된 사용설명서 문서:
{json.dumps(retrieved_docs, ensure_ascii=False, indent=2)}
"""

    llm_response = answer_llm.invoke([
        SystemMessage(content=app_manual_rag_prompt),
        HumanMessage(content=user_prompt),
    ])

    rstate = deepcopy(state)
    rstate["retrieved_manual_docs"] = retrieved_docs
    rstate["response"] = llm_response.content
    return rstate


if __name__ == "__main__":
    sample_state: GraphState = {
        "chats": ["우리 회사 채용중인 JD는 몇 개야?"],
        "state": "FALL_CASE",
        "response": "",
    }
    print(fall_case_node(sample_state))

