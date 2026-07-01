import asyncio
import json

from rouge_score import rouge_scorer
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from chat_agent import (
    search_app_manual,
    invoke_app_manual_rag_agent,
)

GOLDENSET_PATH = "llm_goldenset.json"


def load_golden_set():
    with open(GOLDENSET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def evaluate_retrieval(golden_set, top_k=2):
    """
    정답 context가 검색 결과 안에 존재하는지 평가
    """

    correct = 0

    for sample in golden_set:
        question = sample["question"]
        expected_context = sample["context"]

        retrieved_docs = search_app_manual(
            query=question,
            top_k=top_k
        )

        found = False

        for doc in retrieved_docs:
            if expected_context.strip() in doc:
                found = True
                break

        if found:
            correct += 1

    accuracy = correct / len(golden_set)

    return accuracy


async def llm_judge(question, ground_truth, generated):
    """
    의미적 정확도를 LLM으로 평가
    """

    prompt = f"""당신은 RAG 시스템의 답변 품질을 평가하는 전문가입니다.

질문: {question}
정답 (ground truth): {ground_truth}
생성된 답변: {generated}

평가 기준:
- 핵심 정보(버튼명, 메뉴명, 절차)가 일치하는가
- 사실적으로 틀린 내용이 없는가
- 표현 방식 차이는 감점 없음

0.0 ~ 1.0 사이의 숫자 하나만 출력하세요. 다른 텍스트는 절대 포함하지 마세요."""

    result, _ = await invoke_app_manual_rag_agent(
        query=prompt,
        user_question=prompt
    )

    try:
        return float(result.strip())
    except ValueError:
        return 0.0


async def evaluate_answer_similarity(golden_set):
    """
    ground_truth 와 실제 생성 답변 비교
    """

    scorer = rouge_scorer.RougeScorer(
        ["rougeL"],
        use_stemmer=False
    )

    total_rouge = 0
    total_llm = 0

    for idx, sample in enumerate(golden_set, start=1):

        question = sample["question"]
        ground_truth = sample["ground_truth"]

        generated_answer, _ = await invoke_app_manual_rag_agent(
            query=question,
            user_question=question
        )

        rouge_result = scorer.score(
            ground_truth,
            generated_answer
        )

        rouge_l = rouge_result["rougeL"].fmeasure
        total_rouge += rouge_l

        llm_score = await llm_judge(question, ground_truth, generated_answer)
        total_llm += llm_score

        print("=" * 80)
        print(f"[CASE {idx}]")
        print(f"질문: {question}")
        print(f"정답: {ground_truth}")
        print(f"생성: {generated_answer}")
        print(f"ROUGE-L: {rouge_l:.4f} | LLM Judge: {llm_score:.4f}")

    return total_rouge / len(golden_set), total_llm / len(golden_set)


async def main():

    golden_set = load_golden_set()

    print("\n===== RAG Retrieval Evaluation =====\n")

    retrieval_acc = evaluate_retrieval(
        golden_set,
        top_k=2
    )

    print(f"Top-2 Retrieval Accuracy : {retrieval_acc:.4f}")

    print("\n===== RAG Answer Evaluation =====\n")

    avg_rouge, avg_llm = await evaluate_answer_similarity(
        golden_set
    )

    print("\n===== Final Result =====")

    print(f"Retrieval Accuracy : {retrieval_acc:.4f}")
    print(f"Average ROUGE-L    : {avg_rouge:.4f}")
    print(f"Average LLM Judge  : {avg_llm:.4f}")


if __name__ == "__main__":
    asyncio.run(main())