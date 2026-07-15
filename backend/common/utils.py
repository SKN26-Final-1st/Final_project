import os
from pathlib import Path

from dotenv import load_dotenv

def load_env():
    """로컬 backend/.env 파일을 읽어 OpenAI/Pinecone 환경변수를 준비합니다."""

    if os.environ.get("OPENAI_API_KEY"):
        return

    if not os.environ.get("IS_REMOTE_HOST"):
        env_path = Path(__file__).resolve().parents[1] / ".env"
        load_dotenv(dotenv_path=env_path, encoding="utf-8")


def mask(data: dict, mask_result: dict):
    """mask_result에 들어 있는 원문 표현을 [CATEGORY_N] 토큰으로 치환합니다."""

    buff = data

    for key, values in mask_result.items():
        if not isinstance(values, list):
            continue

        mask_key = key.upper()
        for index, value in enumerate(values, start=1):
            if not isinstance(value, str) or not value:
                continue
            mask_format = f"[{mask_key}_{index}]"
            buff = recursive_alter(buff, value, mask_format)
    
    return buff


def unmask(data: dict, mask_result: dict):
    """마스킹 토큰을 mask_result에 기록된 원래 표현으로 되돌립니다."""

    buff = data

    for key, values in mask_result.items():
        if not isinstance(values, list):
            continue

        mask_key = key.upper()
        for index, value in enumerate(values, start=1):
            if not isinstance(value, str) or not value:
                continue
            mask_format = f"[{mask_key}_{index}]"
            buff = recursive_alter(buff, mask_format, value)

    return buff


def recursive_alter(data, target: str, result: str):
    """dict/list/string 내부를 재귀적으로 돌며 target 문자열을 result로 바꿉니다."""

    if isinstance(data, str):
        return data.replace(target, result)

    if isinstance(data, list):
        return [recursive_alter(item, target, result) for item in data]

    if isinstance(data, dict):
        return {
            key: recursive_alter(value, target, result)
            for key, value in data.items()
        }

    return data
