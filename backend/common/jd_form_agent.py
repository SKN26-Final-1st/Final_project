import asyncio
import json
import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
import sys

sys.stdout.reconfigure(encoding="utf-8")

# 환경 변수 로드 설정
DATABASE_HOST = os.environ.get("RDS_HOSTNAME")
if not DATABASE_HOST:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0

# ==========================================
# [STEP 1] 각 필드별 LLM 추출 구조체 정의 (Pydantic - 할루시네이션 방지 규칙 적용)
# ==========================================

class JobNameStructure(BaseModel):
    job_name: str = Field(
        description="사용자가 직접 명시한 정확한 채용 포지션명 또는 공고 제목. 답변에서 직무명을 유추해야 하거나 딴소리를 한다면 무조건 '' 빈 문자열 반환."
    )

class EducationLevelStructure(BaseModel):
    education_level: str = Field(
        description="사용자가 답변에서 직접 언급한 요구 학력 조건. 학력 조건에 대한 언급이 전혀 없거나 딴소리를 하면 무조건 '' 빈 문자열 반환."
    )

class MajorStructure(BaseModel):
    major: str = Field(
        description="사용자가 답변에서 직접 언급한 필수 또는 우대 전공 학과. 전공 조건이 없거나 모른다고 답하면 무조건 '' 빈 문자열 반환."
    )

class CareerLevelStructure(BaseModel):
    career_level: str = Field(
        description="사용자가 답변에서 직접 언급한 요구 경력 조건이나 년수. 경력 조건에 대한 단서가 없거나 문맥이 맞지 않으면 무조건 '' 빈 문자열 반환."
    )

class RequiredSkillStructure(BaseModel):
    required_skill: List[str] = Field(
        description="사용자가 답변에서 직접 언급한 필수 기술 스택, 언어, 툴 목록. 필수 기술에 대한 내용이 없거나 질문과 다른 답변이면 무조건 빈 리스트 [] 반환."
    )

class PreferredSkillStructure(BaseModel):
    preferred_skill: List[str] = Field(
        description="사용자가 답변에서 직접 언급한 우대 기술 스택, 언어, 툴 목록. 우대 기술에 대한 구체적 명시가 없으면 무조건 빈 리스트 [] 반환."
    )

class MainTaskStructure(BaseModel):
    main_task: str = Field(
        description="사용자가 직접 설명한 주요 업무 및 담당 역할 요약 문장. 질문에 맞는 업무 내용이 없거나 동문서답을 하고 있다면 무조건 '' 빈 문자열 반환."
    )

class HiringReasonStructure(BaseModel):
    hiring_reason: str = Field(
        description="사용자가 직접 밝힌 채용 배경 또는 사유 설명 문장. 내용이 없거나 명확하지 않다면 억지로 상상하지 말고 무조건 '' 빈 문자열 반환."
    )

class WorkTypeStructure(BaseModel):
    work_type: str = Field(
        description="사용자가 직접 언급한 근무 형태 또는 고용 형태(정규직, 계약직 등). 고용 형태 정보가 없거나 엉뚱한 답변이면 무조건 '' 빈 문자열 반환."
    )


# ==========================================
# [STEP 2] 질문 폼 및 시스템 프롬프트 매핑 (할루시네이션 방지 가드레일 강화)
# ==========================================

QUESTIONS = {
    "job_name": "채용 포지션명이 무엇인가요?",
    "education_level": "요구되는 학력 조건이 어떻게 되나요?",
    "major": "선호하거나 필수인 전공이 있나요?",
    "career_level": "요구 경력 조건이 어떻게 되나요?",
    "required_skill": "필수 기술 스택은 무엇인가요?",
    "preferred_skill": "우대하는 기술 스택은 무엇인가요?",
    "main_task": "이 포지션의 주요 업무는 무엇인가요?",
    "hiring_reason": "이번 채용의 배경이나 사유가 있나요?",
    "work_type": "근무 형태는 어떻게 되나요?"
}

SYSTEM_PROMPTS = {
    "job_name": (
        "당신은 채용 공고 정보 분석기입니다. 사용자의 답변에서 '실제 채용 직무명 또는 공고 제목'만 명확하게 추출하세요. "
        "만약 사용자가 직무명을 말하지 않았거나 '강남역 맛집 알려줘' 같이 엉뚱한 동문서답을 한다면 "
        "절대 임의로 포지션을 추측하여 채우지 말고, 반드시 '' (빈 문자열)을 반환하세요. 이모지나 이모티콘은 절대 사용 금지입니다."
    ),
    "education_level": (
        "사용자의 답변에서 요구 학력 조건(예: 대졸 이상, 학력 무관 등)만 있는 그대로 추출하여 한국어로 답변하세요. "
        "질문 내용과 전혀 상관없는 답변이 들어오거나 학력 관련 언급이 없다면 상상해서 채우지 말고 무조건 '' (빈 문자열)을 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "major": (
        "사용자의 답변에서 요구되거나 우대하는 전공 학과명만 정확하게 추출하세요. "
        "명시적인 전공 언급이 없거나 질문과 무관한 딴소리를 한다면 억지로 지어내지 말고 반드시 '' (빈 문자열)을 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "career_level": (
        "사용자의 답변에서 요구하는 경력 조건(예: 경력 3년 이상, 신입 등)을 찾아 정제하세요. "
        "질문과 문맥이 전혀 맞지 않는 답변이거나 경력 조건이 언급되지 않았다면, 억지로 연차를 추측하지 말고 무조건 '' (빈 문자열)을 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "required_skill": (
        "사용자의 답변에서 '필수' 기술 스택, 프로그래밍 언어, 개발 툴만 추출하여 파이썬 리스트 형태로 만드세요. "
        "알파벳 기술명은 무조건 소문자로 통일하세요. 만약 필수 기술에 대한 정보가 없거나 질문과 무관한 딴소리를 한다면 "
        "절대 '기본적인 기술이 있겠지' 하고 가상의 기술을 채워 넣지 마시고 빈 리스트 []를 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "preferred_skill": (
        "사용자의 답변에서 '우대' 기술 스택, 언어, 툴을 찾아서 파이썬 리스트 형태로 추출하세요. "
        "알파벳 기술명은 무조건 소문자로 통일하세요. 우대 기술 조건이 전혀 언급되지 않았거나 엉뚱한 대답을 한다면 "
        "억지로 기술을 상상해서 적지 말고 반드시 빈 리스트 []를 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "main_task": (
        "사용자의 답변에서 이 포지션의 핵심 업무 및 담당 역할 설명만 추출하여 명확한 한국어 문장으로 정리하세요. "
        "가장 중요한 규칙은 사용자가 말하지 않은 업무를 추가하거나 꾸며내지 않는 것입니다. "
        "답변이 동문서답이거나 부실하여 핵심 업무를 요약할 수 없다면 반드시 '' (빈 문자열)을 반환하세요. 이모지 절대 사용 금지입니다."
    ),
    "hiring_reason": (
        "사용자의 답변에서 이번 채용을 진행하게 된 배경이나 사유를 추출하여 정리하세요. "
        "내용이 없거나 질문과 상관없는 딴소리를 한다면 절대 임의로 사유(예: 퇴사자 발생 등)를 지어내지 말고 "
        "무조건 '' (빈 문자열)을 반환하세요. 이모지나 이모티콘은 절대 사용 금지입니다."
    ),
    "work_type": (
        "사용자의 답변에서 고용 및 근무 형태(예: 정규직, 계약직, 인턴 등)만 정확히 추출하여 한국어로 답변하세요. "
        "명확한 고용 형태 언급이 없거나 질문과 문맥이 맞지 않는 답변이라면 억지로 추정하지 말고 무조건 '' (빈 문자열)을 반환하세요. 이모지 절대 사용 금지입니다."
    )
}

# ==========================================
# [STEP 3] 조장님 분기 함수 인터페이스 구현 (LangChain 연계)
# ==========================================

def get_question(column: str) -> str:
    if column in QUESTIONS:
        return QUESTIONS[column]
    raise ValueError(f"알 수 없는 컬럼: {column}")


async def invoke(column: str, answer: str = "") -> dict:
    match column:
        case "job_name": structure_model = JobNameStructure
        case "education_level": structure_model = EducationLevelStructure
        case "major": structure_model = MajorStructure
        case "career_level": structure_model = CareerLevelStructure
        case "required_skill": structure_model = RequiredSkillStructure
        case "preferred_skill": structure_model = PreferredSkillStructure
        case "main_task": structure_model = MainTaskStructure
        case "hiring_reason": structure_model = HiringReasonStructure
        case "work_type": structure_model = WorkTypeStructure
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
# [STEP 4] 실시간 직접 입력 대화형 챗봇 러너 (JD 최종 완성형)
# ==========================================

async def run_jd_interactive_session():
    print("==================================================")
    print("  🚀 [실시간 대화] HR 챗봇 채용 공고(JD) 입력 프로세스 시작 ")
    print("  (안내: 질문에 맞는 답변을 입력하거나, 없으면 그냥 Enter를 누르세요!)")
    print("==================================================\n")
    
    # 최종 수집된 JD 데이터를 누적하여 기억할 메모리 그릇 (State)
    collected_jd_memory = {}
    
    # 우리가 수집할 JD 항목 리스트 순서 설정
    jd_columns_to_collect = [
        "job_name",
        "education_level",
        "major",
        "career_level",
        "required_skill",
        "preferred_skill",
        "main_task",
        "hiring_reason",
        "work_type"
    ]
    
    for col in jd_columns_to_collect:
        bot_question = get_question(col)
        
        # 💡 각 항목마다 올바른 처리가 끝날 때까지 반복하는 루프 가동!
        while True:
            print(f"🤖 챗봇 질문: {bot_question}")
            
            # 사용자가 직접 키보드로 입력할 수 있도록 대기
            user_answer = input("✍️ 나의 답변 (입력 후 Enter): ").strip()
            print("-" * 50)
            
            # 💡 [핵심 가드레일] 아무것도 입력하지 않고 그냥 엔터만 친 경우!
            # LLM 호출을 건너뛰고 코드가 직접 안전하게 빈 데이터로 인정하여 즉시 통과시킵니다.
            if not user_answer:
                print("🎯 [공란 패스] 답변이 비어있어 해당 항목을 빈 값으로 저장하고 다음으로 넘어갑니다.\n")
                if col in ["required_skill", "preferred_skill"]:
                    collected_jd_memory[col] = []
                else:
                    collected_jd_memory[col] = ""
                break # while 루프를 탈출하여 다음 질문(for문)으로 이동!
                
            # 3. 답변이 제대로 입력된 경우에만 AI 데이터 추출 및 구조화 실행
            try:
                print("🔄 AI가 답변을 분석하여 JD 정형 데이터로 변환 중...")
                parsed_result = await invoke(col, user_answer)
                
                # 추출된 실제 값 가져오기
                extracted_value = parsed_result[col]
                
                # 순정 프롬프트 상태에서 엉뚱한 대답(노이즈)을 하여 결과가 비어버렸을 때의 예외 처리
                # 단, '채용 배경(hiring_reason)'은 원래 빈 문자열이 정상일 수 있으므로 제외
                if col != "hiring_reason" and (extracted_value == "" or extracted_value == []):
                    print(f"❌ [추출 실패] 질문 내용과 문맥이 맞지 않는 답변입니다.")
                    print(f"🔄 질문에 알맞은 내용을 다시 입력해 주시거나, 없으시면 그냥 Enter를 눌러주세요!\n")
                    print("-" * 50)
                    continue # while 루프 처음으로 돌아가서 재질문 받기
                
                # 추출 성공 시 데이터를 collected_jd_memory 그릇에 차곡차곡 누적(기억)
                collected_jd_memory.update(parsed_result)
                print("🎯 [추출 성공] 데이터가 정상적으로 저장되었습니다.\n")
                break # 성공했으므로 루프 탈출!
                
            except Exception as e:
                print(f"❌ 분석 중 에러 발생: {e}")
                # 예기치 못한 에러 발생 시 시스템 팅김 방지를 위한 예외 처리 후 탈출
                collected_jd_memory[col] = [] if "skill" in col else ""
                break
                
        print() # 가독성을 위한 한 줄 띄우기

    # ==========================================
    # 🎉 [최종 단계] 챗봇이 기억한 전체 데이터 테이블 출력
    # ==========================================
    print("==================================================")
    print("  🏁 [입력 완료] AI가 기억한 최종 채용 공고(JD) 데이터 스냅샷")
    print("==================================================")
    
    # 딕셔너리 내부 한글과 리스트 기술 스택이 깨지지 않고 완벽하게 출력되도록 설정
    final_snapshot = json.dumps(collected_jd_memory, ensure_ascii=False, indent=4)
    print(final_snapshot)
    
    print("==================================================")
    print("  ✅ 모든 JD 데이터가 지정 양식(정형 데이터)으로 정제되었습니다.")

if __name__ == "__main__":
    # 윈도우 터미널 한글 깨짐 방지 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        
    # 실시간 직접 입력 대화 세션 가동!
    asyncio.run(run_jd_interactive_session())
    