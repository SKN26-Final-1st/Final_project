
import json
import os
from pathlib import Path

from openai import OpenAI


def _load_backend_env():
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


def sum_resume(resume_dict):
    # openai 기반 요약코드
    _load_backend_env()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되어 있지 않습니다.")

    client = OpenAI(
        api_key=api_key
    )

    resume_json = json.dumps(resume_dict, ensure_ascii=False, indent=2)

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "너는 채용 담당자를 돕는 이력서 요약 전문가야. "
                    "입력받은 dictionary 내용을 바탕으로 핵심 역량, 주요 경험, "
                    "기술 스택, 강점을 간결한 한국어 문단으로 요약해."
                ),
            },
            {
                "role": "user",
                "content": f"다음 이력서 정보를 요약해줘.\n\n{resume_json}",
            },
        ],
    )

    return response.choices[0].message.content
