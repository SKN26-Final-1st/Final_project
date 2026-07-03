import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from chat_agent import (
    invoke_fall_case_node,
    invoke_context_extractor_node,
    invoke_hr_analyst_agent,
    invoke_app_manual_rag_agent,
    invoke_summary_agent,
)

SUMMARY_GOLDENSET_PATH = "summary_goldenset.json"

# ── 목업 JD 데이터 (평가 전용) ──────────────────────────────────────────────
MOCK_JD_LIST = [
    {
        "id": 1,
        "account_id": 1,
        "job_name": "잡코리아 2026 프론트엔드 팀 신규 채용",
        "education_level": "대졸 이상",
        "major": "컴퓨터 공학과 혹은 그에 준하는 관련 학과",
        "career_level": "경력 3년 이상",
        "required_skill": ["HTML", "CSS", "JavaScript"],
        "preferred_skill": ["React", "Vue", "Vite"],
        "main_task": "프론트엔드 개발",
        "hiring_reason": "프론트엔드 팀 인원 확충",
        "work_type": "정규직",
        "status": "on_going",
    },
    {
        "id": 2,
        "account_id": 1,
        "job_name": "2026 백엔드 엔지니어 채용",
        "education_level": "대졸 이상",
        "major": "컴퓨터 공학과 혹은 그에 준하는 관련 학과",
        "career_level": "경력 2년 이상",
        "required_skill": ["Python", "FastAPI", "PostgreSQL"],
        "preferred_skill": ["Docker", "Kubernetes", "AWS"],
        "main_task": "서버 API 개발 및 DB 설계",
        "hiring_reason": "신규 AI 기능 고도화 대응을 위한 백엔드 인력 보강",
        "work_type": "정규직",
        "status": "on_going",
    },
    {
        "id": 3,
        "account_id": 1,
        "job_name": "2026 PM(프로덕트 매니저) 채용",
        "education_level": "대졸 이상",
        "major": "무관",
        "career_level": "경력 3년 이상",
        "required_skill": ["요구사항 정의", "일정 관리", "스프린트 운영"],
        "preferred_skill": ["Jira", "Notion", "SQL 기초"],
        "main_task": "제품 로드맵 수립 및 개발팀·영업팀 간 커뮤니케이션 조율",
        "hiring_reason": "SaaS 플랫폼 신규 모듈 출시를 위한 전담 PM 충원",
        "work_type": "정규직",
        "status": "on_going",
    },
    {
        "id": 4,
        "account_id": 1,
        "job_name": "2026 UX/UI 디자이너 채용",
        "education_level": "대졸 이상",
        "major": "시각디자인, HCI, 산업디자인 혹은 관련 학과",
        "career_level": "경력 2년 이상",
        "required_skill": ["Figma", "사용자 리서치", "프로토타이핑"],
        "preferred_skill": ["Zeplin", "After Effects", "디자인 시스템 구축 경험"],
        "main_task": "SaaS 플랫폼 UI 설계 및 사용성 개선",
        "hiring_reason": "기존 디자인 리소스 부족으로 인한 UX 개선 전담 인력 채용",
        "work_type": "정규직",
        "status": "prepare",
    },
]
# ────────────────────────────────────────────────────────────────────────────


async def mock_recruiting_data_searcher(**kwargs):
    return [
        {
            "company_info": {},
            "job_description": jd,
            "resume_count": 0,
            "report_count": 0,
            "resumes": [],
        }
        for jd in MOCK_JD_LIST
    ]


def load_golden_set():
    with open(SUMMARY_GOLDENSET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


async def run_full_pipeline(question: str) -> str:
    chats = [{"role": "user", "message": question}]

    fall_case = await invoke_fall_case_node(chats)
    sub_answers = []

    if fall_case.is_out_of_bounds:
        sub_answers.append(f"[범위 밖 안내]: {fall_case.out_of_bounds_response}")

    if fall_case.is_hr_case:
        memory = await invoke_context_extractor_node(chats)
        extracted_memories = [m.dict() for m in memory.memories]
        hr_answer = await invoke_hr_analyst_agent(
            search_query=fall_case.hr_search_query,   # hr 전용 쿼리 사용
            extracted_memories=extracted_memories,
            recruiting_data_searcher=mock_recruiting_data_searcher,
        )
        sub_answers.append(f"[HR 분석 결과]: {hr_answer}")

    if fall_case.is_app_manual:
        rag_answer, _ = await invoke_app_manual_rag_agent(
            query=fall_case.rag_search_query,          # app 전용 쿼리 사용
            user_question=question,
        )
        sub_answers.append(f"[앱 사용법 안내]: {rag_answer}")

    merge_input = f"사용자 질문: {question}\n\n" + "\n\n".join(sub_answers)
    final_answer = await invoke_summary_agent(merge_input)

    return final_answer


async def llm_judge(question: str, ground_truth: str, generated: str) -> dict:
    from chat_agent import get_answer_llm
    from langchain_core.messages import SystemMessage, HumanMessage

    prompt = f"""당신은 HR 채용 시스템 챗봇의 최종 답변 품질을 평가하는 전문가입니다.

질문: {question}
정답 (ground truth): {ground_truth}
생성된 답변: {generated}

아래 항목을 각각 0.0 ~ 1.0으로 평가하세요.
반드시 아래 JSON 형식으로만 출력하고 다른 텍스트는 절대 포함하지 마세요.

{{
  "intent_understanding": 0.0,
  "logical_coherence": 0.0,
  "hallucination_free": 0.0,
  "practical_helpfulness": 0.0,
  "overall": 0.0
}}

평가 기준:
- intent_understanding: 질문 의도를 정확히 파악하고 답변했는가
- logical_coherence: 답변이 논리적으로 일관성 있고 자연스럽게 연결되는가
- hallucination_free: ground truth에 없는 내용을 지어내지 않았는가 (없으면 1.0)
- practical_helpfulness: 실제 사용자에게 실질적으로 도움이 되는가
- overall: 전체적인 최종 답변 품질"""

    llm = get_answer_llm()
    response = await llm.ainvoke(
        [SystemMessage(content="당신은 평가 전문가입니다."), HumanMessage(content=prompt)]
    )

    try:
        clean = response.content.strip().replace("```json", "").replace("```", "")
        return json.loads(clean)
    except (ValueError, json.JSONDecodeError):
        return {
            "intent_understanding": 0.0,
            "logical_coherence": 0.0,
            "hallucination_free": 0.0,
            "practical_helpfulness": 0.0,
            "overall": 0.0,
        }


async def evaluate_summary(golden_set):

    total_scores = {
        "intent_understanding": 0,
        "logical_coherence": 0,
        "hallucination_free": 0,
        "practical_helpfulness": 0,
        "overall": 0,
    }

    type_scores = {}
    all_scores = []

    for idx, sample in enumerate(golden_set, start=1):
        question = sample["question"]
        ground_truth = sample["ground_truth"]
        sample_type = sample.get("type", "unknown")

        final_answer = await run_full_pipeline(question)
        scores = await llm_judge(question, ground_truth, final_answer)

        for key in total_scores:
            total_scores[key] += scores[key]

        if sample_type not in type_scores:
            type_scores[sample_type] = []
        type_scores[sample_type].append(scores["overall"])
        all_scores.append(scores)

        print("=" * 80)
        print(f"[CASE {idx}] type: {sample_type}")
        print(f"질문         : {question}")
        print(f"정답         : {ground_truth}")
        print(f"생성         : {final_answer}")
        print(f"의도 이해          : {scores['intent_understanding']:.4f}")
        print(f"논리적 일관성      : {scores['logical_coherence']:.4f}")
        print(f"Hallucination 없음 : {scores['hallucination_free']:.4f}")
        print(f"실질적 도움        : {scores['practical_helpfulness']:.4f}")
        print(f"전체 품질          : {scores['overall']:.4f}")

        if scores["overall"] < 0.5:
            print("⚠️  낮은 케이스")

    n = len(golden_set)
    avg_scores = {key: total_scores[key] / n for key in total_scores}

    print("\n===== Type별 평균 =====")
    for t, scores_list in type_scores.items():
        print(f"{t}: {sum(scores_list) / len(scores_list):.4f}")

    return avg_scores


async def debug_single(question: str):
    """특정 질문 하나만 파이프라인 실행해서 중간 과정까지 출력"""
    chats = [{"role": "user", "message": question}]

    fall_case = await invoke_fall_case_node(chats)
    print(f"[fall_case] is_hr_case={fall_case.is_hr_case} | is_app_manual={fall_case.is_app_manual} | is_out_of_bounds={fall_case.is_out_of_bounds}")
    print(f"[fall_case] rag_search_query={fall_case.rag_search_query}")
    print(f"[fall_case] hr_search_query={fall_case.hr_search_query}")

    sub_answers = []

    if fall_case.is_out_of_bounds:
        print(f"[out_of_bounds] {fall_case.out_of_bounds_response}")
        sub_answers.append(f"[범위 밖 안내]: {fall_case.out_of_bounds_response}")

    if fall_case.is_hr_case:
        memory = await invoke_context_extractor_node(chats)
        extracted_memories = [m.dict() for m in memory.memories]
        hr_answer = await invoke_hr_analyst_agent(
            search_query=fall_case.hr_search_query,   # hr 전용 쿼리 사용
            extracted_memories=extracted_memories,
            recruiting_data_searcher=mock_recruiting_data_searcher,
        )
        print(f"[hr_answer] {hr_answer}")
        sub_answers.append(f"[HR 분석 결과]: {hr_answer}")

    if fall_case.is_app_manual:
        rag_answer, retrieved_docs = await invoke_app_manual_rag_agent(
            query=fall_case.rag_search_query,          # app 전용 쿼리 사용
            user_question=question,
        )
        print(f"[retrieved_docs] {retrieved_docs}")
        print(f"[rag_answer] {rag_answer}")
        sub_answers.append(f"[앱 사용법 안내]: {rag_answer}")

    merge_input = f"사용자 질문: {question}\n\n" + "\n\n".join(sub_answers)
    final_answer = await invoke_summary_agent(merge_input)
    print(f"\n[최종 답변]\n{final_answer}")


async def main():
    golden_set = load_golden_set()

    print("\n===== Summary Node End-to-End Evaluation =====\n")

    avg_scores = await evaluate_summary(golden_set)

    print("\n===== Final Result =====")
    print(f"의도 이해              : {avg_scores['intent_understanding']:.4f}")
    print(f"논리적 일관성          : {avg_scores['logical_coherence']:.4f}")
    print(f"Hallucination 없음     : {avg_scores['hallucination_free']:.4f}")
    print(f"실질적 도움            : {avg_scores['practical_helpfulness']:.4f}")
    print(f"전체 품질 (LLM Judge)  : {avg_scores['overall']:.4f}")


async def debug():
    await debug_single("AI 문서 검색 플로팅 버튼이 어디 있어? PM JD 우대 기술도 알려줘.")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "debug":
        asyncio.run(debug())
    else:
        asyncio.run(main())
