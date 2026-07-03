import json
from copy import deepcopy
from typing import Any, List

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .analysis_prompt import (
    CHECK_RESUME_FIT_SYSTEM_PROMPT,
    CHECK_RESUME_FIT_USER_PROMPT,
    INTERVIEW_QUESTION_SYSTEM_PROMPT,
    INTERVIEW_QUESTION_USER_PROMPT,
    REPORT_SYSTEM_PROMPT,
    REPORT_USER_PROMPT,
    star_analysis_prompt,
    star_analysis_user_prompt,
)
from .utils import load_env

load_env()

LLM_MODEL = "gpt-4o-mini"
TEMPERATURE = 0
QUESTION_COUNT = 10


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


def _is_empty_input(value):
    return value is None or value == "" or value == {} or value == []


def _get_self_intro_key(resume_summary):
    if not isinstance(resume_summary, dict):
        return None
    if isinstance(resume_summary.get("self_intoduction"), list):
        return "self_intoduction"
    if isinstance(resume_summary.get("self_introduction"), list):
        return "self_introduction"
    return None


def _extract_self_intro_items(self_intro):
    items = []
    for index, item in enumerate(self_intro):
        if isinstance(item, dict):
            answer = item.get("answer") or item.get("content") or item.get("description") or ""
            question = item.get("question") or item.get("title") or ""
        else:
            answer = str(item)
            question = ""

        if str(answer).strip():
            items.append(
                {
                    "index": index,
                    "question": question,
                    "answer": answer,
                }
            )
    return items


def _normalize_checklist(checklist):
    if hasattr(checklist, "checklist") and isinstance(checklist.checklist, list):
        return checklist.checklist
    if hasattr(checklist, "model_dump"):
        dumped = checklist.model_dump()
        if isinstance(dumped, dict) and isinstance(dumped.get("checklist"), list):
            return dumped["checklist"]
    if isinstance(checklist, list):
        normalized = []
        for item in checklist:
            if isinstance(item, str):
                normalized.append(item)
            elif isinstance(item, dict):
                normalized.append(item.get("content") or item.get("checklist") or item.get("question") or str(item))
            else:
                normalized.append(str(item))
        return normalized
    if isinstance(checklist, dict):
        if "checklist" in checklist and isinstance(checklist["checklist"], list):
            return checklist["checklist"]
        return list(checklist.keys())

    raise ValueError("checklist는 list 또는 dict 형태여야 합니다.")


################################################################
#                      star_analysis_node
################################################################


class SelfIntroStarAnalysisItem(BaseModel):
    """자기소개서 답변 1개에 대한 STAR 분석 결과입니다."""

    index: int = Field(description="입력 자기소개서 항목의 index")
    s: str = Field(description="Situation: 답변에 드러난 상황 또는 배경")
    t: str = Field(description="Task: 지원자가 해결해야 했던 과제 또는 목표")
    a: str = Field(description="Action: 지원자가 실제로 취한 행동")
    r: str = Field(description="Result: 행동의 결과 또는 변화")


class SelfIntroStarAnalysisStructure(BaseModel):
    """자기소개서 답변 목록에 대한 STAR 분석 응답 스키마입니다."""

    analyses: List[SelfIntroStarAnalysisItem] = Field(
        description="입력 자기소개서 항목 수와 같은 STAR 분석 결과 목록"
    )
    original_quality: str = Field(
        description="STAR 분석 전 자기소개서 원문의 전반적인 작성 품질과 과대평가 위험"
    )


star_analysis_node = None


def invoke_star_analysis_node(resume_summary: Any):
    global star_analysis_node

    self_intro_key = _get_self_intro_key(resume_summary)
    if not self_intro_key:
        return resume_summary

    self_intro = resume_summary.get(self_intro_key) or []
    star_inputs = _extract_self_intro_items(self_intro)
    if not star_inputs:
        return resume_summary

    if star_analysis_node is None:
        star_analysis_node = _make_llm(SelfIntroStarAnalysisStructure)

    context_json = json.dumps({"self_introduction": star_inputs}, ensure_ascii=False, indent=2)
    result = invoke_agent(
        star_analysis_node,
        star_analysis_prompt,
        [star_analysis_user_prompt.format(context_json=context_json)],
    )
    analysis_by_index = {
        item.index: {
            "s": item.s.strip(),
            "t": item.t.strip(),
            "a": item.a.strip(),
            "r": item.r.strip(),
        }
        for item in result.analyses
        if (
            isinstance(item.index, int)
            and any((item.s.strip(), item.t.strip(), item.a.strip(), item.r.strip()))
        )
    }

    updated_resume = deepcopy(resume_summary)
    updated_self_intro = deepcopy(self_intro)
    for index, star_analysis in analysis_by_index.items():
        if index < 0 or index >= len(updated_self_intro):
            continue

        item = updated_self_intro[index]
        if isinstance(item, dict):
            if "answer" in item:
                item["answer"] = star_analysis
            elif "content" in item:
                item["content"] = star_analysis
            elif "description" in item:
                item["description"] = star_analysis
            else:
                item["answer"] = star_analysis
        else:
            updated_self_intro[index] = {
                "question": "",
                "answer": star_analysis,
            }

    updated_resume[self_intro_key] = updated_self_intro
    updated_resume["original_quality"] = result.original_quality.strip()
    return updated_resume


################################################################
#                      check_resume_fit_node
################################################################


class ChecklistCheckItem(BaseModel):
    """체크리스트 한 문항과 이력서 요약 기준 충족 여부를 함께 표현합니다."""

    content: str = Field(description="체크리스트 원문")
    result: bool = Field(description="지원서 요약 기준 체크리스트 충족 여부")


class ChecklistCheckStructure(BaseModel):
    """체크리스트 전체에 대한 충족/미충족 판단 결과를 묶어 받는 구조입니다."""

    checklist: List[ChecklistCheckItem] = Field(
        description="체크리스트 항목별 충족 여부 목록"
    )


check_resume_fit_node = None

check_resume_fit_prompt = CHECK_RESUME_FIT_SYSTEM_PROMPT


def invoke_check_resume_fit_node(resume_summary: Any, checklist):
    global check_resume_fit_node

    checklist_items = _normalize_checklist(checklist)

    if _is_empty_input(resume_summary):
        raise ValueError("지원서 요약이 필요합니다.")
    if not checklist_items:
        raise ValueError("비교할 체크리스트가 필요합니다.")

    if check_resume_fit_node is None:
        check_resume_fit_node = _make_llm(ChecklistCheckStructure)

    check_context = {
        "resume_info": resume_summary,
        "checklist": checklist_items,
    }
    context_json = json.dumps(check_context, ensure_ascii=False, indent=2)
    result = invoke_agent(
        check_resume_fit_node,
        check_resume_fit_prompt,
        [CHECK_RESUME_FIT_USER_PROMPT.format(context_json=context_json)],
    )
    return [item.model_dump() for item in result.checklist]


################################################################
#                      interview_questions_node
################################################################


class InterviewQuestionAnswer(BaseModel):
    """면접 질문 한 개에 필요한 질문, 예상 답변, 질문 의도를 담는 구조입니다."""

    question: str = Field(
        description="지원서, 회사 정보, JD, 체크리스트 비교 결과를 종합해서 생성한 면접 질문"
    )
    answer: str = Field(description="지원서 내용을 기반으로 지원자가 답변할 수 있는 모범 답안")
    purpose: str = Field(description="이 질문으로 확인하려는 평가 의도")


class InterviewQuestionsStructure(BaseModel):
    """LLM이 생성한 여러 면접 질문을 리스트 형태로 받기 위한 응답 스키마입니다."""

    questions: List[InterviewQuestionAnswer] = Field(
        description="면접 질문, 모범 답안, 질문 의도 목록"
    )


interview_questions_node = None

interview_questions_prompt = INTERVIEW_QUESTION_SYSTEM_PROMPT


def invoke_interview_questions_node(
    resume_summary: Any,
    company_summary: Any,
    jd_summary: Any,
    checklist_checks,
    question_count=QUESTION_COUNT,
):
    global interview_questions_node

    if interview_questions_node is None:
        interview_questions_node = _make_llm(InterviewQuestionsStructure)

    interview_context = {
        "resume_info": resume_summary,
        "company_info": company_summary,
        "jd_info": jd_summary,
        "checklist_checks": checklist_checks,
        "question_count": question_count,
    }
    context_json = json.dumps(interview_context, ensure_ascii=False, indent=2)
    result = invoke_agent(
        interview_questions_node,
        interview_questions_prompt,
        [
            INTERVIEW_QUESTION_USER_PROMPT.format(
                question_count=question_count,
                context_json=context_json,
            )
        ],
    )
    return [item.model_dump() for item in result.questions]


################################################################
#                      report_node
################################################################


class ReportStructure(BaseModel):
    """최종 채용 평가 리포트에 들어갈 등급, 요약, 분석 항목을 정의합니다."""

    overall_grade: str = Field(description="지원자 전체 적합 등급. 예: A, B, C, D")
    overall_summary: str = Field(description="지원자 적합도에 대한 전체 요약")
    candidate_summary: str = Field(description="지원서 요약을 바탕으로 정리한 지원자 핵심 요약")
    checklist: List[ChecklistCheckItem] = Field(description="체크리스트 항목별 충족 여부 목록")
    competency_analysis: List[str] = Field(description="지원자의 역량 분석 목록")
    fit_analysis: str = Field(description="체크리스트 충족 여부를 바탕으로 한 지원자의 직무 적합성 분석")
    motive: str = Field(description="지원서 내용을 바탕으로 분석한 지원 동기")
    collaboration: str = Field(description="지원서의 협업 경험을 바탕으로 분석한 협업 능력")
    strength: List[str] = Field(description="지원자의 강점 목록")
    concern: List[str] = Field(description="지원자 검증 필요 사항 또는 우려 사항 목록")
    check_point: List[str] = Field(description="면접 또는 추가 검증에서 확인해야 할 포인트 목록")
    final_comment: str = Field(description="최종 평가 코멘트")


report_node = None

report_prompt = REPORT_SYSTEM_PROMPT


def invoke_report_node(resume_summary: Any, fit_checks):
    global report_node

    if _is_empty_input(resume_summary):
        raise ValueError("지원서 요약이 필요합니다.")
    if _is_empty_input(fit_checks):
        raise ValueError("지원자 적합 체크 결과가 필요합니다.")

    if report_node is None:
        report_node = _make_llm(ReportStructure)

    report_context = {
        "resume_info": resume_summary,
        "checklist": fit_checks,
    }
    context_json = json.dumps(report_context, ensure_ascii=False, indent=2)
    result = invoke_agent(
        report_node,
        report_prompt,
        [REPORT_USER_PROMPT.format(context_json=context_json)],
    )
    report = result.model_dump()
    report["checklist"] = fit_checks
    return report
