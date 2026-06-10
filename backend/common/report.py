import json
import os
from pathlib import Path
from typing import List

from openai import OpenAI
from pydantic import BaseModel, Field


MODEL_NAME = "gpt-4.1-mini"
QUESTION_COUNT = 10
CHECKLIST_COUNT = 10
DEFAULT_DB_DATA = "Python/Java/Node, REST API, DB 설계, 인증/권한, 서버 배포 경험"

RESUME_SUMMARY_SYSTEM_PROMPT = (
    "너는 채용 담당자를 돕는 이력서 요약 전문가야. "
    "입력받은 dictionary의 name, skill, education, experience, self_introduction, "
    "certification, language, award, education_history, other_activity를 바탕으로 "
    "지원자의 핵심 역량, 주요 경험, 학력, 기술 스택, 강점을 간결한 한국어 문단으로 요약해. "
    "experience와 self_introduction은 실제 역량을 판단하는 주요 근거로 사용해. "
    "id, applicant_id, file_name, file_path, file_type, parse_status, "
    "error_message, created_at, updated_at, company_id 같은 관리용 필드는 요약에 직접 언급하지 마."
)
RESUME_SUMMARY_USER_PROMPT = "다음 이력서 정보를 요약해줘.\n\n{resume_json}"

COMPANY_SUMMARY_SYSTEM_PROMPT = (
    "너는 지원자가 지원 기업을 빠르게 이해하도록 돕는 회사 정보 요약 전문가야. "
    "입력받은 dictionary를 바탕으로 회사의 규모, 조직/팀 구성, 사업 또는 서비스 설명, "
    "employ_style에 담긴 선호 인재상과 지원자가 알아두면 좋은 특징을 간결한 한국어 문단으로 요약해. "
    "id, user_id, created_at, updated_at 같은 관리용 필드는 요약에 직접 언급하지 마."
)
COMPANY_SUMMARY_USER_PROMPT = "다음 회사 정보를 요약해줘.\n\n{company_json}"

JD_SUMMARY_SYSTEM_PROMPT = (
    "너는 지원자가 채용 공고를 빠르게 이해하도록 돕는 JD 요약 전문가야. "
    "입력받은 dictionary의 job_name, education_level, major, career_level, "
    "required_skill, preferred_skill, main_task, hiring_reason, work_type을 바탕으로 "
    "포지션명, 학력/전공/경력 조건, 필수 및 우대 기술, 주요 업무, 채용 배경, 근무 형태를 간결한 한국어 문단으로 요약해. "
    "id, user_id, company_info_id, status, created_at, updated_at 같은 관리용 필드는 "
    "요약에 직접 언급하지 마."
)
JD_SUMMARY_USER_PROMPT = "다음 채용 공고 정보를 요약해줘.\n\n{jd_json}"

INTERVIEW_QUESTION_SYSTEM_PROMPT = (
    "너는 채용 면접관을 돕는 면접 질문 생성 전문가야. "
    "지원서 요약, 회사 요약, JD 요약, 체크리스트 충족 결과를 종합해서 "
    "실제 면접에서 물어볼 질문과 모범 답안, 질문 의도를 만들어. "
    "체크리스트에서 true인 항목은 경험을 더 깊게 검증하는 질문으로 만들고, "
    "false인 항목은 부족한 부분을 확인하거나 보완 가능성을 평가하는 질문으로 만들어. "
    "질문은 지원자의 경험 검증, JD 적합성, 기술 역량, 협업 방식, 회사/직무 이해도를 "
    "균형 있게 확인할 수 있어야 해. "
    "answer는 반드시 지원서 요약에 있는 경험과 역량을 근거로 작성한 모범 답안이어야 해. "
    "purpose는 해당 질문으로 무엇을 평가하려는지 한 문장으로 작성해. "
    "반드시 한국어로 작성하고, 지정된 Pydantic schema에 맞는 JSON 객체로 반환해."
)
INTERVIEW_QUESTION_USER_PROMPT = (
    "다음 정보를 바탕으로 면접 질문, 모범 답안, 질문 의도를 정확히 {question_count}개 생성해줘. "
    "각 항목은 question, answer, purpose를 포함해야 해.\n\n{context_json}"
)

FIT_CHECKLIST_SYSTEM_PROMPT = (
    "너는 채용 적합도 평가 기준을 만드는 전문가야. "
    "회사 요약, JD 요약, DB 데이터를 종합해서 지원자가 해당 회사와 포지션에 적합한지 "
    "판단하기 위한 체크리스트를 만들어. "
    "회사 요약 또는 JD 요약이 비어 있으면 제공된 나머지 정보와 DB 데이터만 근거로 사용해. "
    "각 체크리스트는 나중에 지원서 요약과 비교할 수 있도록 관찰 가능하고 판단 가능한 기준이어야 해. "
    "기술 스택, 직무 경험, 업무 이해도, 협업 방식, 서비스/도메인 적합성, 성장 가능성을 균형 있게 포함해. "
    "반드시 한국어로 작성하고, 지정된 Pydantic schema에 맞는 JSON 객체로 반환해."
)
FIT_CHECKLIST_USER_PROMPT = (
    "다음 정보를 바탕으로 적합도 판단 체크리스트를 정확히 {checklist_count}개 생성해줘. "
    "각 항목은 하나의 구체적인 평가 기준 문장이어야 해.\n\n{context_json}"
)

CHECK_RESUME_FIT_SYSTEM_PROMPT = (
    "너는 지원서 요약과 채용 적합도 체크리스트를 비교하는 평가자야. "
    "각 체크리스트 항목을 지원서 요약이 충족하는지 true 또는 false로 판단해. "
    "지원서 요약에 근거가 명확히 있으면 true, 근거가 없거나 불충분하면 false로 판단해. "
    "반드시 체크리스트 원문을 content에 그대로 사용하고, result는 boolean만 사용해. "
    "반드시 지정된 Pydantic schema에 맞는 JSON 객체로 반환해."
)
CHECK_RESUME_FIT_USER_PROMPT = (
    "다음 지원서 요약과 체크리스트를 비교해서 충족 여부를 판단해줘.\n\n{context_json}"
)

REPORT_SYSTEM_PROMPT = (
    "너는 채용 평가 리포트를 작성하는 전문가야. "
    "지원서 요약과 지원자 적합 체크 결과를 종합해서 최종 평가 리포트를 작성해. "
    "checklist에서 result가 true인 항목은 충족한 기준, false인 항목은 부족하거나 추가 검증이 필요한 기준으로 판단해. "
    "리포트의 checklist 필드는 입력받은 checklist 배열을 content, result 키 이름 그대로 포함해. "
    "overall_grade는 A, B, C, D 중 하나로 작성해. "
    "JSON 컬럼에 해당하는 competency_analysis, fit_analysis, strength, concern, check_point는 "
    "각각 문자열 리스트로 작성해. "
    "반드시 한국어로 작성하고, 지정된 Pydantic schema에 맞는 JSON 객체로 반환해."
)
REPORT_USER_PROMPT = "다음 정보를 바탕으로 채용 평가 리포트를 생성해줘.\n\n{context_json}"


class InterviewQuestionAnswer(BaseModel):
    """면접 질문 한 개에 필요한 질문, 예상 답변, 질문 의도를 담는 구조입니다."""

    question: str = Field(
        description="지원서, 회사 정보, JD, 체크리스트 비교 결과를 종합해서 생성한 면접 질문"
    )
    answer: str = Field(
        description="지원서 내용을 기반으로 지원자가 답변할 수 있는 모범 답안"
    )
    purpose: str = Field(
        description="이 질문으로 확인하려는 평가 의도"
    )


class InterviewQuestionsStructure(BaseModel):
    """LLM이 생성한 여러 면접 질문을 리스트 형태로 받기 위한 응답 스키마입니다."""

    questions: List[InterviewQuestionAnswer] = Field(
        description="면접 질문, 모범 답안, 질문 의도 목록"
    )


class FitChecklistStructure(BaseModel):
    """회사/JD 기준으로 지원자 적합성을 판단할 체크리스트 목록 구조입니다."""

    checklist: List[str] = Field(
        description="지원자가 회사와 JD에 적합한지 판단하기 위한 체크리스트 목록"
    )


class ChecklistCheckItem(BaseModel):
    """체크리스트 한 문항과 이력서 요약 기준 충족 여부를 함께 표현합니다."""

    content: str = Field(
        description="체크리스트 원문"
    )
    result: bool = Field(
        description="지원서 요약 기준 체크리스트 충족 여부"
    )


class ChecklistCheckStructure(BaseModel):
    """체크리스트 전체에 대한 충족/미충족 판단 결과를 묶어 받는 구조입니다."""

    checklist: List[ChecklistCheckItem] = Field(
        description="체크리스트 항목별 충족 여부 목록"
    )


class ReportStructure(BaseModel):
    """최종 채용 평가 리포트에 들어갈 등급, 요약, 분석 항목을 정의합니다."""

    overall_grade: str = Field(
        description="지원자 전체 적합 등급. 예: A, B, C, D"
    )
    overall_summary: str = Field(
        description="지원자 적합도에 대한 전체 요약"
    )
    candidate_summary: str = Field(
        description="지원서 요약을 바탕으로 정리한 지원자 핵심 요약"
    )
    checklist: List[ChecklistCheckItem] = Field(
        description="체크리스트 항목별 충족 여부 목록"
    )
    competency_analysis: List[str] = Field(
        description="지원자의 역량 분석 목록"
    )
    fit_analysis: List[str] = Field(
        description="체크리스트 충족 여부를 바탕으로 한 회사/직무 적합도 분석 목록"
    )
    strength: List[str] = Field(
        description="지원자의 강점 목록"
    )
    concern: List[str] = Field(
        description="지원자 검증 필요 사항 또는 우려 사항 목록"
    )
    check_point: List[str] = Field(
        description="면접 또는 추가 검증에서 확인해야 할 포인트 목록"
    )
    final_comment: str = Field(
        description="최종 평가 코멘트"
    )


def _load_backend_env():
    """backend/.env 파일을 읽어 OpenAI API 키 같은 환경 변수를 런타임에 보강합니다."""

    DATABASE_HOST = os.environ.get("RDS_HOSTNAME")

    if DATABASE_HOST:
        return

    if not DATABASE_HOST:
        env_path = Path(__file__).resolve().parents[1] / ".env"
        if not env_path.exists():
            return

        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


def _get_openai_client():
    """환경 변수에서 API 키를 확인한 뒤 OpenAI 클라이언트를 생성합니다."""

    _load_backend_env()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되어 있지 않습니다.")

    return OpenAI(api_key=api_key)


def _is_empty_input(value):
    """None, 빈 문자열, 빈 dict/list처럼 프롬프트 입력으로 의미 없는 값을 판별합니다."""

    return value is None or value == "" or value == {} or value == []


def _to_prompt_value(value):
    """dict/list 입력은 JSON 문자열로, 그 외 입력은 문자열로 바꿔 프롬프트에 넣기 쉽게 만듭니다."""

    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, indent=2)
    return str(value)


def _normalize_checklist(checklist):
    """Pydantic 객체, dict, list 등으로 들어온 체크리스트를 문자열 리스트로 표준화합니다."""

    if isinstance(checklist, FitChecklistStructure):
        return checklist.checklist
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
            elif isinstance(item, ChecklistCheckItem):
                normalized.append(item.content)
            elif isinstance(item, dict):
                normalized.append(item.get("content") or item.get("checklist") or item.get("question") or str(item))
            else:
                normalized.append(str(item))
        return normalized
    if isinstance(checklist, dict):
        if "checklist" in checklist and isinstance(checklist["checklist"], list):
            return checklist["checklist"]
        return list(checklist.keys())

    raise ValueError("checklist는 FitChecklistStructure, list, dict 중 하나여야 합니다.")


def _normalize_fit_checks(fit_checks):
    """dict, Pydantic 객체, list 형태의 체크 결과를 checklist/result 리스트로 표준화합니다."""

    if isinstance(fit_checks, ChecklistCheckStructure):
        return [item.model_dump() for item in fit_checks.checklist]
    if hasattr(fit_checks, "model_dump"):
        dumped = fit_checks.model_dump()
        if isinstance(dumped, dict):
            fit_checks = dumped.get("checklist", dumped.get("checks", dumped))

    if isinstance(fit_checks, dict):
        if "checklist" in fit_checks and isinstance(fit_checks["checklist"], list):
            fit_checks = fit_checks["checklist"]
        elif "checks" in fit_checks and isinstance(fit_checks["checks"], list):
            fit_checks = fit_checks["checks"]
        else:
            return [
                {"content": str(content), "result": bool(result)}
                for content, result in fit_checks.items()
            ]

    if isinstance(fit_checks, list):
        normalized = []
        for item in fit_checks:
            if isinstance(item, ChecklistCheckItem):
                normalized.append(item.model_dump())
            elif isinstance(item, dict):
                content = item.get("content", item.get("checklist", item.get("question", "")))
                result = item.get("result", item.get("is_checked", False))
                normalized.append({"content": content, "result": bool(result)})
            else:
                raise ValueError("체크 결과 리스트 항목은 dict 또는 ChecklistCheckItem이어야 합니다.")
        return normalized

    raise ValueError("fit_checks는 ChecklistCheckStructure, list, dict 중 하나여야 합니다.")


def _messages(system_prompt, user_prompt):
    """OpenAI Chat Completion 호출에 맞는 system/user 메시지 배열을 구성합니다."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _create_text_completion(system_prompt, user_prompt):
    """구조화가 필요 없는 요약형 텍스트 응답을 LLM으로부터 생성합니다."""

    client = _get_openai_client()
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=_messages(system_prompt, user_prompt),
    )
    return response.choices[0].message.content


def _create_structured_completion(system_prompt, user_prompt, response_format):
    """Pydantic 스키마에 맞춘 구조화 응답을 생성하고, parse 미지원 시 JSON 검증으로 보완합니다."""

    client = _get_openai_client()
    messages = _messages(system_prompt, user_prompt)

    parse_method = getattr(client.beta.chat.completions, "parse", None)
    if parse_method:
        response = parse_method(
            model=MODEL_NAME,
            messages=messages,
            response_format=response_format,
        )
        return response.choices[0].message.parsed

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        response_format={"type": "json_object"},
    )
    return response_format.model_validate_json(response.choices[0].message.content)


def sum_resume(resume_dict):
    """이력서 원본 dict를 LLM에 전달해 평가에 사용할 핵심 요약문을 만듭니다."""

    resume_json = json.dumps(resume_dict, ensure_ascii=False, indent=2)
    return _create_text_completion(
        RESUME_SUMMARY_SYSTEM_PROMPT,
        RESUME_SUMMARY_USER_PROMPT.format(resume_json=resume_json),
    )


def sum_company(company_dict):
    """회사 정보 dict가 있을 때 지원자 평가 맥락에 필요한 회사 요약문을 생성합니다."""

    if _is_empty_input(company_dict):
        return ""

    company_json = json.dumps(company_dict, ensure_ascii=False, indent=2)
    return _create_text_completion(
        COMPANY_SUMMARY_SYSTEM_PROMPT,
        COMPANY_SUMMARY_USER_PROMPT.format(company_json=company_json),
    )


def sum_jd(jd_dict):
    """채용 공고/JD dict가 있을 때 직무 조건과 업무 내용을 중심으로 요약합니다."""

    if _is_empty_input(jd_dict):
        return ""

    jd_json = json.dumps(jd_dict, ensure_ascii=False, indent=2)
    return _create_text_completion(
        JD_SUMMARY_SYSTEM_PROMPT,
        JD_SUMMARY_USER_PROMPT.format(jd_json=jd_json),
    )


def make_interview_questions(
    resume_summary,
    company_summary,
    jd_summary,
    checklist_checks,
    question_count=QUESTION_COUNT,
):
    """이력서, 회사, JD, 적합성 체크 결과를 종합해 면접 질문과 예상 답변을 생성합니다."""

    interview_context = {
        "resume_summary": resume_summary,
        "company_summary": company_summary,
        "jd_summary": jd_summary,
        "checklist_checks": checklist_checks,
        "question_count": question_count,
    }
    context_json = json.dumps(interview_context, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        INTERVIEW_QUESTION_SYSTEM_PROMPT,
        INTERVIEW_QUESTION_USER_PROMPT.format(
            question_count=question_count,
            context_json=context_json,
        ),
        InterviewQuestionsStructure,
    )
    return [item.model_dump() for item in parsed.questions]


def make_fit_checklist(
    company_summary,
    jd_summary,
    db_data=DEFAULT_DB_DATA,
    checklist_count=CHECKLIST_COUNT,
):
    """회사 요약, JD 요약, 기본 DB 데이터를 바탕으로 지원자 적합성 체크 기준을 만듭니다."""

    checklist_context = {
        "company_summary": None if _is_empty_input(company_summary) else _to_prompt_value(company_summary),
        "jd_summary": None if _is_empty_input(jd_summary) else _to_prompt_value(jd_summary),
        "db_data": None if _is_empty_input(db_data) else _to_prompt_value(db_data),
        "checklist_count": checklist_count,
    }

    if not any(checklist_context[key] for key in ("company_summary", "jd_summary", "db_data")):
        raise ValueError("체크리스트 생성을 위한 회사 요약, JD 요약, DB 데이터 중 최소 하나가 필요합니다.")

    context_json = json.dumps(checklist_context, ensure_ascii=False, indent=2)
    return _create_structured_completion(
        FIT_CHECKLIST_SYSTEM_PROMPT,
        FIT_CHECKLIST_USER_PROMPT.format(
            checklist_count=checklist_count,
            context_json=context_json,
        ),
        FitChecklistStructure,
    )


def check_resume_fit(resume_summary, checklist):
    """이력서 요약이 각 체크리스트 기준을 충족하는지 LLM으로 판정합니다."""

    checklist_items = _normalize_checklist(checklist)

    if _is_empty_input(resume_summary):
        raise ValueError("지원서 요약이 필요합니다.")
    if not checklist_items:
        raise ValueError("비교할 체크리스트가 필요합니다.")

    check_context = {
        "resume_summary": resume_summary,
        "checklist": checklist_items,
    }
    context_json = json.dumps(check_context, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        CHECK_RESUME_FIT_SYSTEM_PROMPT,
        CHECK_RESUME_FIT_USER_PROMPT.format(context_json=context_json),
        ChecklistCheckStructure,
    )
    return [item.model_dump() for item in parsed.checklist]


def make_report(resume_summary, fit_checks):
    """이력서 요약과 체크리스트 판정 결과를 이용해 최종 평가 리포트를 생성합니다."""

    checklist_results = _normalize_fit_checks(fit_checks)

    if _is_empty_input(resume_summary):
        raise ValueError("지원서 요약이 필요합니다.")
    if _is_empty_input(checklist_results):
        raise ValueError("지원자 적합 체크 결과가 필요합니다.")

    report_context = {
        "resume_summary": resume_summary,
        "checklist": checklist_results,
    }
    context_json = json.dumps(report_context, ensure_ascii=False, indent=2)
    parsed = _create_structured_completion(
        REPORT_SYSTEM_PROMPT,
        REPORT_USER_PROMPT.format(context_json=context_json),
        ReportStructure,
    )
    report = parsed.model_dump()
    report["checklist"] = checklist_results
    return report


def invoke(resume_dict, company_dict, jd_dict):
    """요약, 체크리스트, 적합성 판단, 면접 질문, 리포트 생성을 순서대로 실행하는 전체 파이프라인입니다."""

    resume_summary = sum_resume(resume_dict)
    company_summary = sum_company(company_dict)
    jd_summary = sum_jd(jd_dict)

    checklist = make_fit_checklist(
        company_summary=company_summary,
        jd_summary=jd_summary,
        db_data=DEFAULT_DB_DATA,
    )
    fit_checks = check_resume_fit(
        resume_summary=resume_summary,
        checklist=checklist,
    )
    questions = make_interview_questions(
        resume_summary=resume_summary,
        company_summary=company_summary,
        jd_summary=jd_summary,
        checklist_checks=fit_checks,
    )
    report = make_report(
        resume_summary=resume_summary,
        fit_checks=fit_checks,
    )

    return {
        "questions": questions,
        "report": report,
    }
