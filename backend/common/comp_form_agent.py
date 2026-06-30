import asyncio
import json
from typing import List

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
import sys

try:
    from .utils import load_env
except ImportError:
    from utils import load_env

load_env()

print(sys.stdout.encoding)

# 환경 변수 로드 설정
LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0

# ==========================================
# [STEP 1] 각 필드별 LLM 추출 구조체 정의 (Pydantic)
# ==========================================

class CompanyNameStructure(BaseModel):
    company_name: str = Field(
        description="사용자가 직접 명시한 정확한 회사 이름. 답변에 회사명이 드러나지 않거나 유추해야 한다면 무조건 '' 빈 문자열 반환."
    )

class EmployeeCountStructure(BaseModel):
    employee_count: int = Field(
        description="사용자 답변에 '명시된' 구체적인 전체 직원 수 숫자. 숫자가 언급되지 않았거나 정확한 인원 파악이 불가능하면 무조건 -1 반환."
    )

class TeamCompositionStructure(BaseModel):
    team_composition: List[str] = Field(
        description="사용자가 답변에서 직접 언급한 부서/팀 목록. 질문과 상관없는 내용이거나 언급된 팀이 없다면 빈 리스트 [] 반환."
    )

class CompanyDescriptionStructure(BaseModel):
    company_description: str = Field(
        description="사용자가 직접 설명한 회사의 사업 및 서비스 요약 문장. 회사 정보가 없거나 질문과 동문서답을 하고 있다면 무조건 '' 빈 문자열 반환."
    )

class EmployStyleStructure(BaseModel):
    employ_style: List[str] = Field(
        description="사용자가 언급한 선호 인재상 및 특징 리스트. 명시적인 인재상 내용이 없다면 빈 리스트 [] 반환."
    )


# ==========================================
# [STEP 2] 질문 폼 및 시스템 프롬프트 매핑 (할루시네이션 방지 강화)
# ==========================================

QUESTIONS = {
    "company_name": "회사 이름을 먼저 말씀해주세요.",
    "employee_count": "현재 회사의 전체 직원 수는 몇 명인가요?",
    "team_composition": "조직이나 팀은 어떻게 구성되어 있나요? (예: 개발팀, 기획팀 등)",
    "company_description": "회사나 서비스에 대해 간단히 소개해 주세요!",
    "employ_style": "회사가 선호하는 인재상이나 지원자가 알아두면 좋은 특징이 있을까요?"
}

SYSTEM_PROMPTS = {
    "company_name": (
        "당신은 회사 이름 추출기입니다. 사용자의 답변에서 '실제 회사명'만 정확히 추출하세요. "
        "만약 사용자가 회사명을 말하지 않았거나, '모르겠어요', '강남역 맛집 알려줘' 같이 엉뚱한 동문서답을 한다면 "
        "절대 임의로 회사 이름을 추측하거나 지어내지 말고, 반드시 '' (빈 문자열)을 반환하세요. 이모지는 절대 사용 금지입니다."
    ),
    "employee_count": (
        "사용자 답변에서 '직원 수'를 나타내는 명확한 숫자만 추출하세요. "
        "질문과 무관한 답변이거나, 숫자가 명시되지 않았다면 억지로 계산하거나 상상하지 말고 무조건 -1을 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "team_composition": (
        "사용자 답변에서 언급된 실제 부서, 조직, 팀 이름만 리스트로 추출하세요. "
        "사용자가 팀 구성을 언급하지 않았거나 딴소리를 한다면 빈 리스트 []를 반환해야 합니다. "
        "절대 '기본적인 팀이 있겠지' 하고 가상의 팀을 지어내지 마세요. 알파벳 팀명은 소문자로 정제하세요."
    ),
    "company_description": (
        "사용자 답변에 기반하여 회사의 사업이나 서비스 요약을 한국어 문장으로 만드세요. "
        "가장 중요한 규칙은 사용자가 제공하지 않은 정보를 추가하거나 꾸며내지 않는 것입니다. "
        "답변이 부실하거나 엉뚱한 맥락이라면 억지로 문장을 만들지 말고 '' (빈 문자열)을 반환하세요."
    ),
    "employ_style": (
        "사용자 답변에서 인재상, 컬처핏, 기업 특징을 리스트로 추출하세요. "
        "인재상과 관련된 내용이 답변에 전혀 없다면 임의로 일반적인 인재상(예: 성실한 사람 등)을 추측하여 채우지 말고, "
        "반드시 빈 리스트 []를 반환하세요."
    )
}


# ==========================================
# [STEP 3] 분기 함수 인터페이스 구현 (LangChain 연계)
# ==========================================

def get_question(column: str) -> str:
    if column in QUESTIONS:
        return QUESTIONS[column]
    raise ValueError(f"알 수 없는 컬럼: {column}")


async def invoke(column: str, answer: str = "") -> dict:
    match column:
        case "company_name":
            structure_model = CompanyNameStructure
        case "employee_count":
            structure_model = EmployeeCountStructure
        case "team_composition":
            structure_model = TeamCompositionStructure
        case "company_description":
            structure_model = CompanyDescriptionStructure
        case "employ_style":
            structure_model = EmployStyleStructure
        case _:
            raise ValueError(f"알 수 없는 컬럼: {column}")

    extractor_model = ChatOpenAI(
        model=LLM_MODEL,
        temperature=TEMPERATURE,
    ).with_structured_output(structure_model)

    messages = [
        SystemMessage(content=SYSTEM_PROMPTS[column]),
        HumanMessage(content=f"사용자 답변: {answer}")
    ]
    
    result = await extractor_model.ainvoke(messages)
    return result.model_dump()


# ==========================================
# [STEP 4] 터미널 한글 보기 편한 테스트 러너 (JD 최종 완성형)
# ==========================================

async def run_integration_test():
    print("====== [테스트 시작] HR 챗봇 채용 공고(JD) 추출 검증 ======\n")
    
    # 100% 한국어 대화형 JD 목업 데이터셋 세팅
    test_cases = [
        {
            "column": "job_name",
            "answer": "이번에 백엔드 개발자 포지션 신규 채용 공고 좀 올리려고 합니다.",
        },
        {
            "column": "education_level",
            "answer": "학력은 크게 상관없고 대학교 졸업 이상이거나 그에 준하는 실력이면 됩니다.",
        },
        {
            "column": "major",
            "answer": "컴퓨터공학이나 소프트웨어 관련 전공자를 선호하긴 하지만 필수 조건은 아니에요.",
        },
        {
            "column": "career_level",
            "answer": "해당 직무 경력이 최소 3년 이상인 분들 위주로 채용하고 싶습니다.",
        },
        {
            "column": "required_skill",
            "answer": "기본적으로 파이썬이랑 장고(Django) 프레임워크는 다루실 줄 알아야 해요.",
        },
        {
            "column": "preferred_skill",
            "answer": "AWS 클라우드 환경 경험이 있거나 도커(Docker) 쓰실 줄 알면 아주 좋습니다.",
        },
        {
            "column": "main_task",
            "answer": "주요 업무는 자사 서비스의 백엔드 API 개발 및 대용량 데이터베이스 아키텍처 설계와 최적화입니다.",
        },
        {
            "column": "hiring_reason",
            "answer": "최근에 신규 프로젝트가 확장되면서 서버 개발팀 인원이 급하게 충원되어야 하는 상황입니다.",
        },
        {
            "column": "work_type",
            "answer": "정규직 수습 3개월 조건으로 진행하려고 합니다."
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        col = case["column"]
        ans = case["answer"]
        
        print(f"-> [케이스 {i}] 테스트 항목: '{col}'")
        
        try:
            # 1. LLM 구조화 분석 실행
            result = await invoke(col, ans)
            
            # 2. json.dumps에 ensure_ascii=False를 주면 터미널에 진짜 깨끗한 한글로 찍힙니다!
            clean_output = json.dumps(result, ensure_ascii=False)
            
            print(f"   분석 결과: {clean_output}")
            print("   성공 (SUCCESS)\n")
        except Exception as e:
            print(f"   에러 발생 (ERROR): {e}\n")
            
    print("====== [테스트 종료] 모든 채용 공고(JD) 검증이 완료되었습니다. ======")

if __name__ == "__main__":
    # 윈도우 터미널 한글 깨짐 방지 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    # 자동화 테스트 가동!
    asyncio.run(run_integration_test())
