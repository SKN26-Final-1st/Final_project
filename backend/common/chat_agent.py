from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing import Literal, Union
from copy import deepcopy
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

############################################################
# constants
############################################################

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0

############################################################
# GraphState 정의
############################################################

class GraphState(dict):
    pass

############################################################
# function definition
############################################################

# 대화 기록(chats)을 규격에 맞는 메시지 객체들로 변환하여 LLM을 호출하는 공통 함수
def invoke_llm(llm, prompt: str, chats: list[str]):
    buff = []
    # 1. 시스템 프롬프트를 주입합니다.
    buff.append(SystemMessage(content=prompt))
    
    # 2. chats 배열을 돌며 짝수 인덱스는 유저, 홀수 인덱스는 AI 메시지로 변환합니다.
    for i in range(len(chats)):
        if i % 2 == 0:
            buff.append(HumanMessage(content=chats[i]))
        else:
            buff.append(AIMessage(content=chats[i]))

    return llm.invoke(buff)

############################################################
# 1. Fall Case Agent
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
  (ex: "프론트엔드 개발자 채용할 때 필수 역량이 뭐야?" -> 자사 채용 공고를 묻는 것으로 간주하여 is_fall_case=False)

범위 초과 (is_fall_case=True):
- 타사(다른 회사)의 이름이 명시된 정보나 채용 공고 (예: "네이버 연봉 얼마야?", "카카오 채용 공고 찾아줘")
- HR, 채용, 회사 정보와 전혀 무관한 질문 (예: "오늘 날씨 어때?", "점심 메뉴 추천해줘")
- 단순 잡담, 욕설, 의미를 판단하기 어려운 입력

출력 규칙:
- is_fall_case가 True이면 response에 정중하게 거절하는 답변을 작성하세요.
- is_fall_case가 False이면 response는 반드시 빈 문자열("")로 두세요.
"""

def invoke_fall_case_node(chats: list[str]):
    global fall_case_model, fall_case_prompt
    if isinstance(chats, str):
        chats = [chats]
    return invoke_llm(fall_case_model, fall_case_prompt, chats)

def fall_case_node(state: GraphState) -> GraphState:
    """챗봇의 역량 밖의 답변을 처리하는 node"""
    llm_result = invoke_fall_case_node(state["chats"])
    is_fall_case = llm_result.is_fall_case
    response = llm_result.response

    rstate = deepcopy(state)
    rstate["is_fall_case"] = is_fall_case
    
    if is_fall_case:
        rstate["next_state"] = rstate["state"]
        rstate["response"] = response
    else:
        rstate["response"] = ""
        
    return rstate

############################################################
# 2. Memory Extractor Agent
############################################################

# 이쪽 출력이 list[dict] 형태로 바뀌어야 한다, 키 값은 맥락, value 값은 데이터
class MemoryItem(BaseModel):
    context: str = Field(
        description="데이터가 의미하는 대상"
    )
    value: Union[int, float, str] = Field(
        description="실제 데이터 값"
    )

class ContextExtractorStructure(BaseModel):
    memories: list[MemoryItem] = Field(
        default_factory=list,
        description="현재 질문 해결에 필요한 이전 대화의 데이터"
    )

context_extractor_model = ChatOpenAI(
    model=LLM_MODEL,
    temperature=TEMPERATURE
).with_structured_output(ContextExtractorStructure)

# 이전 대화가 가령, 우리 JD 중 백엔드 개발자 지원자가 몇 명이야 라고 했고 AI 답변이 10명입니다 라고 나온 상태에서, 사용자가 JD 중 백엔드 개발자 지원자 숫자의 10배를 곱하면 얼마야 식으로 질문했을 경우 [{"백엔드 개발자 지원자":10}] 식으로 답변이 나와야 한다
context_extractor_prompt = """
당신은 HR 에이전트의 대화 메모리 추출기(Memory Extractor)입니다.

역할:
현재 사용자의 질문을 해결하기 위해 필요한 이전 대화의 데이터 값을 추출하세요.

이전 AI 답변에 포함된 수치, 인원수, 점수, 금액, 날짜, 비율 등의 데이터를 찾아
현재 질문에서 참조하는 값만 추출하세요.

출력 형식:
{
  "memories": [
    {
      "context": "데이터 의미",
      "value": 실제값
    }
  ]
}

예시 1
User: 우리 JD 중 백엔드 개발자 지원자가 몇 명이야?
AI: 현재 10명입니다.
User: JD 중 백엔드 개발자 지원자 숫자의 10배를 곱하면 얼마야?
출력:
{
  "memories": [
    {
      "context": "백엔드 개발자 지원자 수",
      "value": 10
    }
  ]
}

예시 2
User: 김철수 지원자 적합도 점수 알려줘
AI: 85점입니다.
User: 그 점수에 5점을 더하면?
출력:
{
  "memories": [
    {
      "context": "김철수 지원자 적합도",
      "value": 85
    }
  ]
}

예시 3
User: 데이터 분석가 JD 보여줘
AI: JD 내용 ...
User: 거기에 필수 우대사항이 뭐야?
출력:
{
  "memories": []
}

규칙:
- 현재 질문 해결에 필요한 데이터만 추출한다.
- 수치, 날짜, 금액, 점수, 인원수 등을 우선 추출한다.
- 단순히 JD 내용을 다시 묻는 경우는 메모리가 아니다.
- 관련 데이터가 없으면 memories는 빈 리스트([])로 반환한다.
"""

def invoke_context_extractor_node(chats: list[str]):
    if isinstance(chats, str):
        chats = [chats]
    return invoke_llm(context_extractor_model, context_extractor_prompt, chats)

def context_extractor_node(state: GraphState) -> GraphState:
    """
    대화 메모리 추출 노드 (새로 작성하신 정답 버전만 남겨두었습니다! ✨)
    """
    llm_result = invoke_context_extractor_node(state["chats"])

    rstate = deepcopy(state)
    rstate["memories"] = [
        {
            "context": memory.context,
            "value": memory.value
        }
        for memory in llm_result.memories
    ]

    return rstate

############################################################
# Execution (Test Part)
############################################################

# if __name__ == "__main__":
#     print("====== 🔍 HR 에이전트 시스템 컴포넌트 테스트 ======\n")

#     # [테스트 2] GraphState 기반 Fall Case 노드 테스트 (True 상황)
#     mock_state_true = {
#         "chats": ["오늘 강남역 근처 맛집 추천해줄래?"],
#         "state": "INTENT_CHECK",
#         "is_fall_case": None,
#         "response": "이전 찌꺼기 데이터"
#     }
#     print("--- [테스트 2] Fall Case 'True' 검증 ---")
#     result_true = fall_case_node(mock_state_true)
#     print(f"is_fall_case 결과 : {result_true['is_fall_case']}")
#     print(f"response 결과     : '{result_true['response']}'")
#     print(f"next_state 결과   : {result_true.get('next_state', '없음')}\n")

#     # [테스트 3] GraphState 기반 Fall Case 노드 테스트 (False 상황)
#     mock_state_false = {
#         "chats": ["프론트엔드 개발자 채용할 때 필수 역량이 뭐야?"],
#         "state": "INTENT_CHECK",
#         "is_fall_case": None,
#         "response": "이전 찌꺼기 데이터"
#     }
#     print("--- [테스트 3] Fall Case 'False' 검증 ---")
#     result_false = fall_case_node(mock_state_false)
#     print(f"is_fall_case 결과 : {result_false['is_fall_case']}")
#     print(f"response 결과     : '{result_false['response']}' (← 빈 문자열 확인)\n")


#     # ====================================================================
#     # 🤖 [수정완료] 진짜 AI HR 시스템 비서와 나누는 롱컨텍스트 테스트 3종
#     # ====================================================================

#     # [테스트 4] 롱컨텍스트 1: 시스템이 조회한 여러 지원자 데이터 중 특정 값 추출
#     mock_state_long_1 = {
#         "chats": [
#             "시스템님, 이번 기획자 직무 서류 통과한 이몽룡 지원자 적합도 점수가 몇 점으로 기록되어 있나요?", # 🔑 목표 데이터
#             "데이터베이스 조회 결과, 이몽룡 지원자의 서류 적합도 점수는 92점입니다.",
#             "그럼 성춘향 지원자는요?", 
#             "성춘향 지원자의 점수는 88점입니다.",
#             "방자 지원자는 몇 점인가요?", 
#             "방자 지원자는 79점입니다.",
#             "올해 하반기 평가 가이드라인 문서 좀 이 채팅창에 띄워줘.", # 시스템 기능 요청 (방해 대화)
#             "네, '2026_하반기_HR_평가가이드라인.pdf' 문서를 컨텍스트에 로드했습니다. 확인이 필요하신 세부 항목이 있으신가요?",
#             "아니 괜찮고, 아까 그 이몽룡 지원자 점수에 가산점 5점을 더하면 총 몇 점이 되는 거죠?" # 👈 현재 질문
#         ]
#     }
#     print("--- [테스트 4] Memory Extractor 테스트 1 (AI 비서 대화 톤) ---")
#     print(f"현재 질문: {mock_state_long_1['chats'][-1]}")
#     result_long_1 = context_extractor_node(mock_state_long_1)
#     print(f"추출된 메모리: {result_long_1['memories']}")
    
#     assert len(result_long_1["memories"]) > 0
#     assert result_long_1["memories"][0]["value"] == 92



#     # [테스트 5] 롱컨텍스트 2: 시스템이 뱉어준 예산 정보 기억하기
#     mock_state_long_2 = {
#         "chats": [
#             "올해 상반기 마케팅 신입 채용에 배정된 총 예산이 시스템상에 얼마로 잡혀 있어?", # 🔑 목표 데이터
#             "확인 결과, 상반기 마케팅 신입 채용 예산은 총 45000000원(4천5백만 원)으로 편성되어 있습니다.",
#             "예산 세부 항목 내역도 표로 정리해서 보여줄래?", # 방해 대화 1
#             "네, 예산은 플랫폼 광고비 1500만 원, 대행사 수수료 2000만 원, 다과 및 면접장 대여비 1000만 원으로 구성되어 있습니다. 추가적인 예산 증액 내역은 발견되지 않았습니다.",
#             "현재 면접장 공간 예약 현황은 어떻게 관리되고 있어?", # 방해 대화 2
#             "현재 사내 공간 예약 시스템 확인 결과, 3층 소회의실A가 마케팅 면접용 공간으로 예약 완료 상태입니다. 해당 일자의 다른 회의실은 모두 만석입니다.",
#             "아까 말한 마케팅 채용 총 예산에서 광고비로 10000000원을 먼저 쓰면 남은 예산은 얼마가 되나요?" # 👈 현재 질문
#         ]
#     }
#     print("--- [테스트 5] Memory Extractor 테스트 2 (AI 비서 대화 톤) ---")
#     print(f"현재 질문: {mock_state_long_2['chats'][-1]}")
#     result_long_2 = context_extractor_node(mock_state_long_2)
#     print(f"추출된 메모리: {result_long_2['memories']}")
    
#     assert len(result_long_2["memories"]) > 0
#     assert result_long_2["memories"][0]["value"] == 45000000



#     # [테스트 6] 롱컨텍스트 3: 시스템 문서 분석 정보 속 수치 기억하기
#     mock_state_long_3 = {
#         "chats": [
#             "이번에 채용하는 백엔드 신입 사원들의 수습 교육 기간은 총 몇 주로 등록되어 있지?", # 🔑 목표 데이터
#             "시스템에 등록된 백엔드 직무의 수습 교육 및 온보딩 기간은 총 8주입니다.",
#             "작년 백엔드 교육 결과 보고서 요약본 좀 추출해서 보여줘.", # 방해 대화 1
#             "네, '2025_백엔드_온보딩_결과.txt' 문서를 분석한 결과, 종합 만족도는 5점 만점에 4.5점이었으며, 교육 수료율은 100%를 기록했습니다.",
#             "올해 멘토로 지정된 시니어 개발자 풀은 총 몇 명이야?", # 방해 대화 2
#             "현재 테크 조직에서 확보된 3년 차 이상 시니어 개발자 멘토 풀은 총 5명입니다. 이분들의 세부 인적 사항을 원하시면 추가로 조회해 드리겠습니다.",
#             "아니 됐고, 아까 말한 백엔드 수습 교육 기간의 절반에 해당하는 주차(weeks)에는 공통 직무 교육이 끝나는 게 맞나요?" # 👈 현재 질문
#         ]
#     }
#     print("--- [테스트 6] Memory Extractor 테스트 3 (AI 비서 대화 톤) ---")
#     print(f"현재 질문: {mock_state_long_3['chats'][-1]}")
#     result_long_3 = context_extractor_node(mock_state_long_3)
#     print(f"추출된 메모리: {result_long_3['memories']}")
    
#     assert len(result_long_3["memories"]) > 0
#     assert result_long_3["memories"][0]["value"] == 8

from copy import deepcopy
import json
from typing import Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

# 기본 설정
LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0
answer_llm = ChatOpenAI(model=LLM_MODEL, temperature=TEMPERATURE)

# ERD 구조를 그대로 반영한 가상 데이터베이스
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

############################################################
# MOCK DB SEARCH
############################################################

def search_jd(query: str):
    
    # ==========================================
    # 🔥 [여기만 새로 추가되었습니다!] 🔥
    # 유저의 자유로운 표현을 DB용 표준 단어로 번역해서 query 뒤에 붙여줍니다.
    # ==========================================
    query_expansion_prompt = """
    사용자의 질문을 분석하여, 아래 [DB 표준 키워드] 중 사용자가 의도한 단어들을 찾아서 
    원래 질문 뒤에 공백으로 구분하여 모두 이어 붙여서 출력하세요. 다른 설명은 절대 하지 마세요.
    말투가 모호하더라도 의도가 맞다면 표준 키워드를 매칭해야 합니다. 언급이 없으면 붙이지 마세요.

    [DB 표준 키워드]
    백엔드 개발자, 데이터 분석가, 마케터 신입, 학사 이상, 학력 무관, 전공 무관, 정규직, 인턴직, 채용중, 마감
    """
    
    llm_response = answer_llm.invoke([
        SystemMessage(content=query_expansion_prompt),
        HumanMessage(content=query)
    ])
    
    # 기존 query 뒤에 LLM이 매칭해준 표준 키워드를 추가합니다.
    # 예: "전공이 무관했던 jd 보여줘" -> "전공이 무관했던 jd 보여줘 전공 무관"
    query = query + " " + llm_response.content
    # ==========================================

    results = []

    for _, job in MOCK_JOB_DB.items():
        for key, value in job.items():
            
            # 1. 만약 데이터 값이 문자열(str)이고 유저 질문 안에 그 단어가 포함되어 있다면 매칭
            if isinstance(value, str) and value in query:
                if job not in results:
                    results.append(deepcopy(job))
                    break  # 한 번 매칭된 공고는 중복 추가 방지를 위해 탈출
            
            # 2. 만약 데이터 값이 리스트(스킬 목록 등)라면 내부 아이템도 같이 검사해 줍니다.
            elif isinstance(value, list):
                for item in value:
                    if item in query:
                        if job not in results:
                            results.append(deepcopy(job))
                            break
                            
    return results

def db_search_node(state):
    query = state["search_query"]
    results = search_jd(query)
    
    rstate = deepcopy(state)
    rstate["db_results"] = results
    return rstate

# 테스트 실행부
if __name__ == "__main__":
    mock_state = {
        "search_query": "정규직 jd 보여줘"
    }

    result = db_search_node(mock_state)
    
    print("====== 🔍 Mock DB Node 검색 결과 ======")
    print(json.dumps(result["db_results"], ensure_ascii=False, indent=4))