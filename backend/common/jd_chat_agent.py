from typing import List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

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


def _result_value(result, field_name: str):
    return result.model_dump()[field_name]


################################################################
#                      field_intent_node
################################################################


class FieldIntentStructure(BaseModel):
    is_fall_case: bool = Field(
        description="입력이 JD/회사 정보 폼 기입과 무관하거나 프로젝트에서 답변할 수 없는 범위면 true."
    )
    ignore_field: List[str] = Field(
        description="사용자가 채우지 않겠다고 말한 필드 key 목록. 없으면 빈 리스트를 반환한다."
    )
    focus_field: str = Field(
        description="사용자가 지금 채우고 싶다고 말한 필드 key. 명확하지 않으면 빈 문자열을 반환한다."
    )

field_intent_node = None

field_intent_prompt = """
당신은 JD/회사 정보 입력 대화의 의도 분기 분석기입니다.
사용자의 가장 최근 입력만 보고 다음 세 가지를 판단하세요.

0. 처리 범위 밖 입력인지 판단
- JD/회사 정보 폼 기입, 특정 항목 선택, 특정 항목 제외와 무관한 일반 지식 질문, 잡담, 정치/시사/법률/의료/코딩 등 프로젝트 범위 밖 요청이면 is_fall_case를 true로 반환합니다.
- 프로젝트 범위 안에서 처리할 수 있으면 is_fall_case를 false로 반환합니다.

1. 사용자가 채우지 않겠다고 말한 필드
- "이건 안 채울래", "회사 소개는 생략", "우대 기술은 없어", "전공 요건은 빼자"처럼 입력하지 않겠다는 의도가 있으면 ignore_field에 넣습니다.
- 여러 필드를 말하면 모두 넣습니다.

2. 사용자가 지금 채우고 싶다고 말한 필드
- "회사명부터 할게", "JD명 채우자", "필수 기술 입력할래"처럼 특정 필드를 채우겠다는 의도가 있으면 focus_field에 넣습니다.
- 여러 필드를 동시에 말하면 가장 먼저 언급한 필드 하나만 focus_field에 넣습니다.

반드시 아래 field key 중에서만 반환하세요.

회사 정보:
- company_name: 회사명
- employee_count: 직원 수
- team_composition: 팀 구성
- company_description: 회사 소개
- employ_style: 선호 인재상

JD 정보:
- job_name: JD명
- education_level: 학력
- major: 전공 요건
- career_level: 경력
- required_skill: 필수 기술
- preferred_skill: 우대 기술
- main_task: 주요 업무
- hiring_reason: 채용 배경
- work_type: 고용 형태

판단 기준:
- 사용자가 필드명이 아니라 의미로 말해도 가장 가까운 field key로 매핑합니다.
- "회사 정보부터", "JD 정보부터"처럼 그룹만 말하고 구체 필드를 말하지 않으면 focus_field는 빈 문자열로 둡니다.
- 입력 의도가 불명확하면 ignore_field는 빈 리스트, focus_field는 빈 문자열로 둡니다.
- is_fall_case가 true이면 ignore_field는 빈 리스트, focus_field는 빈 문자열로 둡니다.
"""


def invoke_field_intent_node(chats: list[dict]):
    global field_intent_node

    if field_intent_node is None:
        field_intent_node = _make_llm(FieldIntentStructure)

    return invoke_agent(field_intent_node, field_intent_prompt, chats).model_dump()


################################################################
#                      guide_response_node
################################################################


class GuideResponseStructure(BaseModel):
    response: str = Field(description="focus 필드를 채우는 데 도움이 되는 사용자 안내 답변")

guide_response_node = None

guide_response_prompt = """
당신은 JD/회사 정보 입력을 돕는 안내 assistant입니다.
입력으로 회사 정보, JD 정보, 현재 채우려는 focus 필드명이 제공됩니다.

역할:
- 회사 정보와 JD 정보를 읽고, focus 필드를 채울 때 도움이 될 만한 구체적인 조언을 작성합니다.
- 이미 제공된 정보와 자연스럽게 연결해서 어떤 내용을 말하면 좋은지 안내합니다.
- 사용자가 바로 답할 수 있도록 짧고 명확한 질문 또는 예시를 포함합니다.

주의:
- 제공되지 않은 정보를 사실처럼 단정하지 마세요.
- 개인정보 마스킹 토큰은 그대로 유지하세요.
- 최종 답변은 response 필드에만 작성하세요.
"""


def invoke_guide_response_node(data: dict):
    global guide_response_node

    if guide_response_node is None:
        guide_response_node = _make_llm(GuideResponseStructure)

    return invoke_agent(guide_response_node, guide_response_prompt, [str(data)]).model_dump()["response"]


################################################################
#                      company_name_node
################################################################


class CompanyNameStructure(BaseModel):
    company_name: str = Field(description="사용자의 대화에서 실제 회사명만 추출한다. 없으면 빈 문자열을 반환한다.")

company_name_node = None

company_name_prompt = """
당신은 회사 정보 입력을 돕는 분석기입니다.
대화에서 사용자가 말한 실제 회사명만 추출하세요.
회사명이 명확하지 않거나 질문과 무관한 답변이면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_company_name_node(chats: list[dict]):
    global company_name_node

    if company_name_node is None:
        company_name_node = _make_llm(CompanyNameStructure)

    return _result_value(invoke_agent(company_name_node, company_name_prompt, chats), "company_name")


################################################################
#                      employee_count_node
################################################################


class EmployeeCountStructure(BaseModel):
    employee_count: int = Field(description="사용자의 대화에서 직원 수를 숫자로 추출한다. 없으면 -1을 반환한다.")

employee_count_node = None

employee_count_prompt = """
당신은 회사 정보 입력을 돕는 분석기입니다.
대화에서 직원 수를 명확한 정수로 추출하세요.
직원 수가 명시되지 않았거나 계산할 근거가 부족하면 추측하지 말고 -1을 반환하세요.
"""


def invoke_employee_count_node(chats: list[dict]):
    global employee_count_node

    if employee_count_node is None:
        employee_count_node = _make_llm(EmployeeCountStructure)

    return _result_value(invoke_agent(employee_count_node, employee_count_prompt, chats), "employee_count")


################################################################
#                      team_composition_node
################################################################


class TeamCompositionStructure(BaseModel):
    team_composition: List[str] = Field(description="사용자의 대화에서 조직, 부서, 팀 구성을 리스트로 추출한다. 없으면 빈 리스트를 반환한다.")

team_composition_node = None

team_composition_prompt = """
당신은 회사 정보 입력을 돕는 분석기입니다.
대화에서 실제 부서, 조직, 팀 이름만 리스트로 추출하세요.
팀 구성이 언급되지 않았거나 무관한 답변이면 임의로 만들지 말고 빈 리스트를 반환하세요.
"""


def invoke_team_composition_node(chats: list[dict]):
    global team_composition_node

    if team_composition_node is None:
        team_composition_node = _make_llm(TeamCompositionStructure)

    return _result_value(invoke_agent(team_composition_node, team_composition_prompt, chats), "team_composition")


################################################################
#                      company_description_node
################################################################


class CompanyDescriptionStructure(BaseModel):
    company_description: str = Field(description="사용자의 대화에서 회사 사업, 서비스, 소개 문장을 추출한다. 없으면 빈 문자열을 반환한다.")

company_description_node = None

company_description_prompt = """
당신은 회사 정보 입력을 돕는 분석기입니다.
대화에서 회사의 사업, 서비스, 제품, 조직 소개에 해당하는 내용만 자연스러운 한국어 문장으로 정리하세요.
사용자가 제공하지 않은 정보를 추가하거나 꾸며내지 마세요.
관련 정보가 부족하면 빈 문자열을 반환하세요.
"""


def invoke_company_description_node(chats: list[dict]):
    global company_description_node

    if company_description_node is None:
        company_description_node = _make_llm(CompanyDescriptionStructure)

    return _result_value(invoke_agent(company_description_node, company_description_prompt, chats), "company_description")


################################################################
#                      employ_style_node
################################################################


class EmployStyleStructure(BaseModel):
    employ_style: List[str] = Field(description="사용자의 대화에서 선호 인재상, 조직 문화, 채용 성향을 리스트로 추출한다. 없으면 빈 리스트를 반환한다.")

employ_style_node = None

employ_style_prompt = """
당신은 회사 정보 입력을 돕는 분석기입니다.
대화에서 회사가 선호하는 인재상, 조직 문화, 채용 성향을 리스트로 추출하세요.
관련 내용이 없으면 일반적인 인재상을 추측하지 말고 빈 리스트를 반환하세요.
"""


def invoke_employ_style_node(chats: list[dict]):
    global employ_style_node

    if employ_style_node is None:
        employ_style_node = _make_llm(EmployStyleStructure)

    return _result_value(invoke_agent(employ_style_node, employ_style_prompt, chats), "employ_style")


################################################################
#                      job_name_node
################################################################


class JobNameStructure(BaseModel):
    job_name: str = Field(description="사용자의 대화에서 채용 직무명 또는 공고 제목을 추출한다. 없으면 빈 문자열을 반환한다.")

job_name_node = None

job_name_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 실제 채용 직무명 또는 공고 제목만 추출하세요.
직무명이 명확하지 않거나 무관한 답변이면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_job_name_node(chats: list[dict]):
    global job_name_node

    if job_name_node is None:
        job_name_node = _make_llm(JobNameStructure)

    return _result_value(invoke_agent(job_name_node, job_name_prompt, chats), "job_name")


################################################################
#                      education_level_node
################################################################


class EducationLevelStructure(BaseModel):
    education_level: str = Field(description="사용자의 대화에서 요구 학력 조건을 추출한다. 없으면 빈 문자열을 반환한다.")

education_level_node = None

education_level_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 요구 학력 조건만 추출하세요.
학력 조건이 명시되지 않았거나 무관한 답변이면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_education_level_node(chats: list[dict]):
    global education_level_node

    if education_level_node is None:
        education_level_node = _make_llm(EducationLevelStructure)

    return _result_value(invoke_agent(education_level_node, education_level_prompt, chats), "education_level")


################################################################
#                      major_node
################################################################


class MajorStructure(BaseModel):
    major: str = Field(description="사용자의 대화에서 필수 또는 선호 전공 조건을 추출한다. 없으면 빈 문자열을 반환한다.")

major_node = None

major_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 요구하거나 선호하는 전공, 학과 조건만 추출하세요.
전공 조건이 명시되지 않았거나 무관한 답변이면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_major_node(chats: list[dict]):
    global major_node

    if major_node is None:
        major_node = _make_llm(MajorStructure)

    return _result_value(invoke_agent(major_node, major_prompt, chats), "major")


################################################################
#                      career_level_node
################################################################


class CareerLevelStructure(BaseModel):
    career_level: str = Field(description="사용자의 대화에서 요구 경력 조건을 추출한다. 없으면 빈 문자열을 반환한다.")

career_level_node = None

career_level_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 요구 경력 조건만 추출하세요.
경력 조건이 명시되지 않았거나 무관한 답변이면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_career_level_node(chats: list[dict]):
    global career_level_node

    if career_level_node is None:
        career_level_node = _make_llm(CareerLevelStructure)

    return _result_value(invoke_agent(career_level_node, career_level_prompt, chats), "career_level")


################################################################
#                      required_skill_node
################################################################


class RequiredSkillStructure(BaseModel):
    required_skill: List[str] = Field(description="사용자의 대화에서 필수 기술, 언어, 역량을 리스트로 추출한다. 없으면 빈 리스트를 반환한다.")

required_skill_node = None

required_skill_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 필수 기술, 언어, 도구, 역량만 리스트로 추출하세요.
필수 기술 정보가 없거나 무관한 답변이면 임의로 만들지 말고 빈 리스트를 반환하세요.
"""


def invoke_required_skill_node(chats: list[dict]):
    global required_skill_node

    if required_skill_node is None:
        required_skill_node = _make_llm(RequiredSkillStructure)

    return _result_value(invoke_agent(required_skill_node, required_skill_prompt, chats), "required_skill")


################################################################
#                      preferred_skill_node
################################################################


class PreferredSkillStructure(BaseModel):
    preferred_skill: List[str] = Field(description="사용자의 대화에서 우대 기술, 언어, 역량을 리스트로 추출한다. 없으면 빈 리스트를 반환한다.")

preferred_skill_node = None

preferred_skill_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 우대 기술, 언어, 도구, 역량만 리스트로 추출하세요.
우대 조건이 없거나 무관한 답변이면 임의로 만들지 말고 빈 리스트를 반환하세요.
"""


def invoke_preferred_skill_node(chats: list[dict]):
    global preferred_skill_node

    if preferred_skill_node is None:
        preferred_skill_node = _make_llm(PreferredSkillStructure)

    return _result_value(invoke_agent(preferred_skill_node, preferred_skill_prompt, chats), "preferred_skill")


################################################################
#                      main_task_node
################################################################


class MainTaskStructure(BaseModel):
    main_task: str = Field(description="사용자의 대화에서 주요 업무와 담당 역할을 추출한다. 없으면 빈 문자열을 반환한다.")

main_task_node = None

main_task_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 주요 업무와 담당 역할만 명확한 한국어 문장으로 정리하세요.
사용자가 말하지 않은 업무를 추가하지 마세요.
관련 정보가 부족하면 빈 문자열을 반환하세요.
"""


def invoke_main_task_node(chats: list[dict]):
    global main_task_node

    if main_task_node is None:
        main_task_node = _make_llm(MainTaskStructure)

    return _result_value(invoke_agent(main_task_node, main_task_prompt, chats), "main_task")


################################################################
#                      hiring_reason_node
################################################################


class HiringReasonStructure(BaseModel):
    hiring_reason: str = Field(description="사용자의 대화에서 채용 배경 또는 사유를 추출한다. 없으면 빈 문자열을 반환한다.")

hiring_reason_node = None

hiring_reason_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 이번 채용을 진행하는 배경이나 사유만 추출해 한국어 문장으로 정리하세요.
채용 배경이 명확하지 않으면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_hiring_reason_node(chats: list[dict]):
    global hiring_reason_node

    if hiring_reason_node is None:
        hiring_reason_node = _make_llm(HiringReasonStructure)

    return _result_value(invoke_agent(hiring_reason_node, hiring_reason_prompt, chats), "hiring_reason")


################################################################
#                      work_type_node
################################################################


class WorkTypeStructure(BaseModel):
    work_type: str = Field(description="사용자의 대화에서 근무 형태 또는 고용 형태를 추출한다. 없으면 빈 문자열을 반환한다.")

work_type_node = None

work_type_prompt = """
당신은 채용 공고 정보 입력을 돕는 분석기입니다.
대화에서 근무 형태 또는 고용 형태만 추출하세요.
근무 형태가 명확하지 않거나 무관한 답변이면 임의로 추측하지 말고 빈 문자열을 반환하세요.
"""


def invoke_work_type_node(chats: list[dict]):
    global work_type_node

    if work_type_node is None:
        work_type_node = _make_llm(WorkTypeStructure)

    return _result_value(invoke_agent(work_type_node, work_type_prompt, chats), "work_type")
