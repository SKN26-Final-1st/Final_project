import os
from pathlib import Path

from dotenv import load_dotenv

def load_env():
    if os.environ.get("OPENAI_API_KEY"):
        return

    if not os.environ.get("IS_REMOTE_HOST"):
        env_path = Path(__file__).resolve().parents[1] / ".env"
        load_dotenv(dotenv_path=env_path, encoding="utf-8")


def mask(data: dict, mask_result: dict):
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
