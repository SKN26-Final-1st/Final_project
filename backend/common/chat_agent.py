import json
from copy import deepcopy
from typing import Literal, Union, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# 환경 변수 로드
load_dotenv()

############################################################
# constants & 공통 모델 설정
############################################################

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0

# 기본 모델 선언
answer_llm = ChatOpenAI(model=LLM_MODEL, temperature=TEMPERATURE)

# 대화 기록(chats)을 규격에 맞는 메시지 객체들로 변환하여 LLM을 호출하는 공통 함수
def invoke_llm(llm, prompt: str, chats: list[str]):
    buff = []
    buff.append(SystemMessage(content=prompt))
    
    for i in range(len(chats)):
        if i % 2 == 0:
            buff.append(HumanMessage(content=chats[i]))
        else:
            buff.append(AIMessage(content=chats[i]))

    return llm.invoke(buff)

############################################################
# 1. Fall Case Agent (상담 범위 거절 비서)
############################################################

class FallCaseStructure(BaseModel):
    is_fall_case: bool = Field(
        description="사용자의 입력이 HR 및 채용 상담 범위를 벗어난 fall case이면 True, 아니면 False"
    )
    response: str = Field(
        description="fall case일 때 사용자에게 반환할 안내 응답. fall case가 아니면 빈 문자열"
    )

fall_case_model = ChatOpenAI(
    model=LLM_MODEL,
    temperature=TEMPERATURE
).with_structured_output(FallCaseStructure)

fall_case_prompt = """
당신은 '우리 회사' 전용 HR 및 채용 상담 챗봇의 fall case 분류기입니다.
당신의 역할은 제공되는 채팅 맥락을 확인하고, 가장 최근의 사용자 입력이 오직 '우리 회사'와 관련된 처리 범위에 해당하는지 판단하는 것입니다.

처리 범위 (is_fall_case=False):
- 자사의 정보에 대한 질문
- 자사의 채용 공고(JD), 직무, 필수 역량, 우대 사항에 대한 질문
- 자사에 접수된 지원서 및 지원자 분석/평가에 대한 질문
- 문장에 '우리 회사'라는 말이 명시적으로 없더라도, 자사 채용이나 직무를 묻는 뉘앙스면 False로 판단합니다.

범위 초과 (is_fall_case=True):
- 타사(다른 회사)의 이름이 명시된 정보나 채용 공고
- HR, 채용, 회사 정보와 전혀 무관한 질문 (예: 날씨, 메뉴 추천 등)

출력 규칙:
- is_fall_case가 True이면 response에 정중하게 거절하는 답변을 작성하세요.
- is_fall_case가 False이면 response는 반드시 빈 문자열("")로 두세요.
"""

def invoke_fall_case_agent(chats: list[str]) -> FallCaseStructure:
    """
    외부 호출용: 대화 내역을 받아 채용 상담 범위 외의 질문인지 검증합니다.
    """
    if isinstance(chats, str):
        chats = [chats]
    return invoke_llm(fall_case_model, fall_case_prompt, chats)


############################################################
# 2. Memory Extractor Agent (맥락 수치 추출 비서)
############################################################

class MemoryItem(BaseModel):
    context: str = Field(description="데이터가 의미하는 대상")
    value: Union[int, float, str] = Field(description="실제 데이터 값")

class ContextExtractorStructure(BaseModel):
    memories: list[MemoryItem] = Field(
        default_factory=list,
        description="현재 질문 해결에 필요한 이전 대화의 데이터"
    )

context_extractor_model = ChatOpenAI(
    model=LLM_MODEL,
    temperature=TEMPERATURE
).with_structured_output(ContextExtractorStructure)

context_extractor_prompt = """
당신은 HR 에이전트의 대화 메모리 추출기(Memory Extractor)입니다.
현재 사용자의 질문을 해결하기 위해 필요한 이전 대화의 데이터 값(수치, 인원수, 점수 등)을 추출하세요.
관련 데이터가 없으면 memories는 빈 리스트([])로 반환하세요.
"""

def invoke_context_extractor_agent(chats: list[str]) -> ContextExtractorStructure:
    """
    외부 호출용: 대화 내역을 받아 이전 대화 속에 포함된 핵심 수치 데이터 맥락을 추출합니다.
    """
    if isinstance(chats, str):
        chats = [chats]
    return invoke_llm(context_extractor_model, context_extractor_prompt, chats)


############################################################
# 3. HR Data Analyst Agent (DB 직접 분석 및 답변 비서)
############################################################

# ERD 구조를 반영한 내부 가상 데이터베이스
MOCK_JOB_DB = {
    1: {
        "job_title": "백엔드 개발자",
        "education_level": "학사 이상",
        "major": "컴퓨터공학 관련 학과",
        "career_level": "신입 ~ 경력 3년",
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
        "main_tasks": "사내 HR 에이전트 시스템 및 자사 채용 파이프라인 백엔드 개발",
        "hiring_reason": "AI 기반 신규 HR 플랫폼 확장으로 인한 추가 인력 충원",
        "work_type": "정규직",
        "status": "채용중",
        "created_at": "2026-06-01 09:00:00",
        "updated_at": "2026-06-05 11:00:00"
    },
    2: {
        "job_title": "데이터 분석가",
        "education_level": "학사 이상",
        "major": "통계학, 수학, 컴공 관련 학과",
        "career_level": "경력 2년 이상",
        "required_skills": ["Python", "SQL", "Tableau"],
        "main_tasks": "자사 채용 데이터 및 지원자 이력서 분석 모델링, 인사이트 도출",
        "hiring_reason": "데이터 기반의 객체 지향 채용 프로세스 고도화",
        "work_type": "정규직",
        "status": "채용중",
        "created_at": "2026-05-15 10:30:00",
        "updated_at": "2026-06-02 14:00:00"
    },
    3: {
        "job_title": "마케터 신입",
        "education_level": "학력 무관",
        "major": "전공 무관",
        "career_level": "신입 (인턴 3개월 후 전환 검토)",
        "required_skills": ["GA4", "Content Planning", "SNS Marketing"],
        "main_tasks": "자사 채용 브랜드 마케팅 및 SNS 콘텐츠 기획/운영",
        "hiring_reason": "상반기 공채 통합 채용 브랜딩 강화를 위한 인턴십 진행",
        "work_type": "인턴직",
        "status": "마감",
        "created_at": "2026-04-01 09:00:00",
        "updated_at": "2026-05-01 18:00:00"
    }
}

def invoke_hr_analyst_agent(search_query: str) -> str:
    """
    외부 호출용: 검색 쿼리를 받아 가상 DB를 직접 분석한 뒤 유저에게 줄 최종 답변 문장을 반환합니다.
    """
    global answer_llm, MOCK_JOB_DB
    
    system_prompt = """
    당신은 자사 채용 데이터베이스(JD)를 직접 분석하고 통계를 내어 답변하는 스마트한 HR 분석 비서입니다.
    제공된 [자사 채용 데이터베이스] 전체를 꼼꼼히 읽고, 사용자의 질문 의도에 맞게 분석하여 정확한 정답을 도출하세요.
    
    🚨 중요 규칙:
    1. 데이터베이스 내부의 raw JSON 데이터나 필드값들을 그대로 나열하지 마세요. 
    2. "몇 명이야?", "개수 가르쳐줘" 같은 통계성 질문에는 데이터를 정확히 계산해서 수치 위주로 요약 답변해야 합니다.
       - ex) 데이터 분석가 공고가 1개 존재한다면 "총 1명입니다"라고 분석 결과를 제시.
    3. 데이터베이스에 없는 내용이나 알 수 없는 정보는 절대로 지어내지 말고(할루시네이션 방지), 근거가 부족하다고 명확하게 밝히세요.
    4. 질문한 내용에 대해서만 대답하세요. 데이터베이스에 여러 정보가 있더라도 질문과 관련된 내용만 분석해서 답변해야 합니다.
    5. 대학생처럼 친근하면서도 예의 바른 말투(존댓말)를 사용하고, 문맥에 맞는 귀여운 이모티콘(이모지)을 풍부하게 섞어주세요! 🥰✨
    """
    
    user_content = f"""
    [사용자 질문]
    {search_query}
    
    [자사 채용 데이터베이스]
    {json.dumps(MOCK_JOB_DB, ensure_ascii=False, indent=4)}
    """
    
    llm_response = answer_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content)
    ])
    
    return llm_response.content


############################################################
# 외부 연동 테스트 실행부 (State 딕셔너리 없이 다이렉트 호출! 🧪)
############################################################

if __name__ == "__main__":
    print("====== 🔍 HR 에이전트 개별 인보크 함수 기능 테스트 ======\n")

    # 1. Fall Case 인보크 테스트
    print("--- [테스트 1] Fall Case 범위 초과 질문 거절 검증 ---")
    fall_case_result = invoke_fall_case_agent(["오늘 강남역 날씨 어때?"])
    print(f"결과 객체 : {fall_case_result}")
    print(f"거절 여부 : {fall_case_result.is_fall_case}")
    print(f"거절 답변 : {fall_case_result.response}\n")

    # 2. Memory Extractor 인보크 테스트
    print("--- [테스트 2] 대화 기록 속 수치 기억 맥락 추출 검증 ---")
    memory_result = invoke_context_extractor_agent([
        "우리 회사 백엔드 개발자 지원자가 몇 명이야?", 
        "현재 10명입니다.", 
        "그 지원자 숫자의 5배를 곱하면 얼마야?"
    ])
    print(f"추출 완료된 메모리 목록: {memory_result.memories}\n")

    # 3. HR Analyst 인보크 테스트 (유저님이 원하셨던 조건 분석형 답변 테스트)
    print("--- [테스트 3] HR Analyst DB 통계 직접 분석 검증 ---")
    test_query = "학사이상을 요구하는 jd는 총 몇개야?"
    print(f"사용자 질문: '{test_query}'")
    
    final_answer = invoke_hr_analyst_agent(test_query)
    print("\n====== 최종 분석 답변 ======")
    print(final_answer)