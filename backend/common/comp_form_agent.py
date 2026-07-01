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
# [STEP 1] 회사 정보 추출 구조체 (Pydantic)
# ==========================================

class CompanyNameStructure(BaseModel):
    company_name: str = Field(description="회사명. 없으면 빈 문자열 반환.")

class EmployeeCountStructure(BaseModel):
    employee_count: int = Field(description="직원 수. 없으면 -1 반환.")

class TeamCompositionStructure(BaseModel):
    team_composition: List[str] = Field(description="팀 목록. 없으면 빈 리스트 [] 반환.")

class CompanyDescriptionStructure(BaseModel):
    company_description: str = Field(description="회사 설명. 없으면 빈 문자열 반환.")

class EmployStyleStructure(BaseModel):
    employ_style: List[str] = Field(description="선호 인재상 리스트. 없으면 빈 리스트 [] 반환.")


# ==========================================
# [STEP 2] 질문 및 시스템 프롬프트
# ==========================================

QUESTIONS = {
    "company_name": "회사 이름을 말씀해주세요.",
    "employee_count": "현재 전체 직원 수는 몇 명인가요?",
    "team_composition": "조직이나 팀은 어떻게 구성되어 있나요?",
    "company_description": "회사나 서비스에 대해 간단히 소개해 주세요!",
    "employ_style": "회사가 선호하는 인재상이 있을까요?"
}

SYSTEM_PROMPTS = {
    "company_name": (
        "당신은 회사 이름 추출기입니다. 사용자의 답변에서 '실제 회사명'만 정확히 추출하세요. "
        "만약 사용자가 회사명을 말하지 않았거나 엉뚱한 답변이라면 "
        "절대 임의로 회사 이름을 추측하거나 지어내지 말고, 반드시 '' (빈 문자열)을 반환하세요."
    ),
    "employee_count": (
        "사용자 답변에서 '직원 수'를 나타내는 명확한 숫자만 추출하세요. "
        "질문과 무관한 답변이거나, 숫자가 명시되지 않았다면 억지로 계산하거나 상상하지 말고 무조건 -1을 반환하세요."
    ),
    "team_composition": (
        "사용자 답변에서 언급된 실제 부서, 조직, 팀 이름만 리스트로 추출하세요. "
        "사용자가 팀 구성을 언급하지 않았거나 딴소리를 한다면 빈 리스트 []를 반환해야 합니다. "
        "절대 '기본적인 팀이 있겠지' 하고 가상의 팀을 지어내지 마세요."
    ),
    "company_description": (
        "사용자 답변에 기반하여 회사의 사업이나 서비스 요약을 한국어 문장으로 정리하세요. "
        "가장 중요한 규칙은 사용자가 제공하지 않은 정보를 추가하거나 꾸며내지 않는 것입니다. "
        "답변이 부실하거나 엉뚱한 맥락이라면 억지로 문장을 만들지 말고 '' (빈 문자열)을 반환하세요."
    ),
    "employ_style": (
        "사용자 답변에서 인재상, 컬처핏, 기업 특징을 리스트로 추출하세요. "
        "인재상과 관련된 내용이 답변에 전혀 없다면 임의로 일반적인 인재상을 추측하여 채우지 말고, "
        "반드시 빈 리스트 []를 반환하세요."
    )
}


# ==========================================
# [STEP 3] LLM 호출 함수
# ==========================================

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
# [STEP 4] 자동 테스트 모드
# ==========================================

async def run_integration_test():
    print("====== [테스트 시작] 회사 정보 추출 검증 ======\n")
    
    test_cases = [
        {
            "column": "company_name",
            "answer": "우리 회사 이름은 테크브릿지입니다.",
        },
        {
            "column": "employee_count",
            "answer": "현재 직원은 총 100명이 있습니다.",
        },
        {
            "column": "team_composition",
            "answer": "개발팀, 기획/PM팀, 영업팀 이렇게 3개 팀으로 구성되어 있어요.",
        },
        {
            "column": "company_description",
            "answer": "테크브릿지는 중소기업을 위한 SaaS 기반 업무 자동화 플랫폼을 개발하는 회사입니다. 문서 관리, 고객 관리, 내부 승인 프로세스 자동화 기능을 제공하며, 최근에는 AI를 활용한 데이터 분석 기능을 고도화하고 있습니다.",
        },
        {
            "column": "employ_style",
            "answer": "협업이 가능한 인재, 자신의 일에 책임감을 가질 수 있는 사람을 찾고 있습니다.",
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        col = case["column"]
        ans = case["answer"]
        
        print(f"-> [케이스 {i}] 테스트 항목: '{col}'")
        
        try:
            result = await invoke(col, ans)
            clean_output = json.dumps(result, ensure_ascii=False)
            print(f"   분석 결과: {clean_output}")
            print("   성공 (SUCCESS)\n")
        except Exception as e:
            print(f"   에러 발생 (ERROR): {e}\n")
            
    print("====== [테스트 종료] 모든 회사 정보 검증이 완료되었습니다. ======")


# ==========================================
# [STEP 5] 인터랙티브 모드
# ==========================================

async def run_interactive():
    """사용자가 직접 입력하는 인터랙티브 모드"""
    print("=" * 60)
    print(" HR 챗봇 회사 정보 입력 프로세스 시작")
    print("  (안내: 질문에 맞는 답변을 입력하거나, 없으면 Enter를 누르세요)")
    print("=" * 60)
    
    results = {
        "company_name": "",
        "employee_count": -1,
        "team_composition": [],
        "company_description": "",
        "employ_style": []
    }
    
    for column, question in QUESTIONS.items():
        print(f"\n챗봇 질문: {question}")
        try:
            answer = input("나의 답변 (입력 후 Enter): ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n종료합니다.")
            return
        
        print("-" * 60)
        
        if not answer:
            print("[공란 패스] 답변이 비어있어 해당 항목을 빈 값으로 저장하고 다음으로 넘어갑니다.")
        else:
            try:
                result = await invoke(column, answer)
                result_value = result[column]
                results[column] = result_value
                print(f"분석 완료: {json.dumps(result, ensure_ascii=False)}")
            except Exception as e:
                print(f"오류 발생: {e}")
    
    print("\n" + "=" * 60)
    print("[입력 완료] AI가 기억한 최종 회사 정보 데이터 스냅샷")
    print("=" * 60)
    print(json.dumps(results, ensure_ascii=False, indent=4))
    print("=" * 60)


if __name__ == "__main__":
    # 윈도우 터미널 한글 깨짐 방지 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    
    # 실행 모드 선택
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # 자동 테스트 모드
        asyncio.run(run_integration_test())
    else:
        # 인터랙티브 모드 (기본값)
        asyncio.run(run_interactive())
