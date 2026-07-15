from typing import List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .jd_chat_prompt import (
    field_intent_prompt,
    guide_response_prompt,
    company_name_prompt,
    employee_count_prompt,
    team_composition_prompt,
    company_description_prompt,
    employ_style_prompt,
    job_name_prompt,
    education_level_prompt,
    major_prompt,
    career_level_prompt,
    required_skill_prompt,
    preferred_skill_prompt,
    main_task_prompt,
    hiring_reason_prompt,
    work_type_prompt,
)

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


def invoke_work_type_node(chats: list[dict]):
    global work_type_node

    if work_type_node is None:
        work_type_node = _make_llm(WorkTypeStructure)

    return _result_value(invoke_agent(work_type_node, work_type_prompt, chats), "work_type")
