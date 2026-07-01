import inspect
import contextlib
import json
import os
import re
import sys
import threading
import types
from typing import Any, TypedDict

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


MODEL_NAME = os.environ.get(
    "MODEL_NAME",
    "LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct",
)
ADAPTER_NAME = os.environ.get(
    "ADAPTER_NAME",
    "dlfp22/exaone-masking-lora-best",
)
HF_TOKEN = os.environ.get("HF_TOKEN")
DEFAULT_MAX_NEW_TOKENS = int(os.environ.get("DEFAULT_MAX_NEW_TOKENS", "512"))
USE_4BIT = os.environ.get("USE_4BIT", "1").lower() not in {"0", "false", "no"}

LABEL_CATS = [
    "comp_name",
    "person_name",
    "address",
    "personal_info",
    "school_edu",
    "project_name",
    "jd_discrimination",
]

FORMAT_INSTRUCTIONS = """
{
  "comp_name": [],
  "person_name": [],
  "address": [],
  "personal_info": [],
  "school_edu": [],
  "project_name": [],
  "jd_discrimination": []
}
""".strip()

STRICT_SYSTEM_PROMPT = f"""
당신은 한국 채용 데이터의 개인정보 마스킹 전문가입니다.
입력으로 들어온 자유 텍스트(자기소개서, 채용공고(JD) 본문, 회사 소개,
채용 사유, 메모 등)에서 "마스킹이 필요한 표현"을 찾아
아래 7개 카테고리로 분류하여 추출하세요.

[마스킹 카테고리]
1. comp_name        : 회사/기관/고객사/이전 근무처 등 조직 식별명
2. person_name      : 지원자 본인 및 제3자(교수·추천인·동료 등)의 실명
3. address          : 주소 및 출신·거주 지역
4. personal_info    : 고유식별정보·연락처·차별위험정보·민감정보
5. school_edu       : 학교/교육기관/주최기관명
6. project_name     : 내부·제3자 정보가 포함될 수 있는 프로젝트 실명
7. jd_discrimination: JD 내 차별 소지 조항

[출력 규칙]
- 반드시 JSON object 하나만 출력한다.
- 첫 글자는 반드시 {{ 로 시작하고 마지막 글자는 반드시 }} 로 끝난다.
- 코드블록, 코드펜스, ```json, ``` 를 절대 사용하지 않는다.
- 설명, 해설, 마크다운, 리스트 단독 출력, 번역, 영어 변환을 절대 하지 않는다.
- 입력 텍스트에 등장한 원문 표현 그대로 추출한다.
- 동일 표현은 한 번만 넣는다.
- 해당 카테고리에 없으면 빈 리스트 []를 넣는다.
- 키는 반드시 아래 JSON 스키마의 7개만 사용한다.

[출력 형식]
{FORMAT_INSTRUCTIONS}
""".strip()

GENERATION_LOCK = threading.Lock()


def _patch_transformers_compat() -> None:
    try:
        import transformers.utils.generic as generic_utils

        if not hasattr(generic_utils, "maybe_autocast"):

            def maybe_autocast(*args: Any, **kwargs: Any):
                return contextlib.nullcontext()

            generic_utils.maybe_autocast = maybe_autocast
            print("[PATCH] Added missing maybe_autocast shim.", flush=True)
    except Exception as exc:
        print(f"[PATCH][WARN] maybe_autocast shim skipped: {exc}", flush=True)

    try:
        import transformers.modeling_rope_utils as rope_utils

        if not hasattr(rope_utils, "RopeParameters"):

            class RopeParameters(TypedDict, total=False):
                rope_type: str
                factor: float
                low_freq_factor: float
                high_freq_factor: float
                original_max_position_embeddings: int
                attention_factor: float
                beta_fast: float
                beta_slow: float
                short_factor: list[float]
                long_factor: list[float]

            rope_utils.RopeParameters = RopeParameters
            print("[PATCH] Added missing RopeParameters shim.", flush=True)
    except Exception as exc:
        print(f"[PATCH][WARN] RopeParameters shim skipped: {exc}", flush=True)

    try:
        import transformers.integrations as tf_integrations

        def noop_kernel_patch(*args: Any, **kwargs: Any):
            if args and callable(args[0]) and len(args) == 1:
                return args[0]

            def decorator(fn):
                return fn

            return decorator

        for name in (
            "use_kernel_forward_from_hub",
            "use_kernel_func_from_hub",
            "use_kernelized_func",
        ):
            if not hasattr(tf_integrations, name):
                setattr(tf_integrations, name, noop_kernel_patch)
                print(f"[PATCH] Added missing {name} shim.", flush=True)
    except Exception as exc:
        print(f"[PATCH][WARN] integrations shim skipped: {exc}", flush=True)


def _patch_exaone(model):
    if getattr(model, "_exaone_compat_patched", False):
        return model

    if hasattr(model, "transformer") and hasattr(model.transformer, "wte"):
        embed = model.transformer.wte
    elif hasattr(model, "transformer") and hasattr(model.transformer, "embed_tokens"):
        embed = model.transformer.embed_tokens
    elif hasattr(model, "model") and hasattr(model.model, "embed_tokens"):
        embed = model.model.embed_tokens
    else:
        raise AttributeError("embedding layer not found")

    model.get_input_embeddings = lambda: embed
    model.set_input_embeddings = lambda value: setattr(embed, "weight", value.weight)

    import transformers.masking_utils as masking_utils

    original_create_causal_mask = masking_utils.create_causal_mask
    original_params = inspect.signature(original_create_causal_mask).parameters

    def create_causal_mask_compat(*args: Any, **kwargs: Any):
        if "input_embeds" in kwargs and "input_embeds" not in original_params:
            value = kwargs.pop("input_embeds")
            if "inputs_embeds" in original_params:
                kwargs["inputs_embeds"] = value
            elif "input_tensor" in original_params:
                kwargs["input_tensor"] = value
            else:
                kwargs["input_ids"] = value
        elif "inputs_embeds" in kwargs and "inputs_embeds" not in original_params:
            value = kwargs.pop("inputs_embeds")
            if "input_embeds" in original_params:
                kwargs["input_embeds"] = value
            elif "input_tensor" in original_params:
                kwargs["input_tensor"] = value
            else:
                kwargs["input_ids"] = value

        accepts_var_kwargs = any(
            param.kind == inspect.Parameter.VAR_KEYWORD
            for param in original_params.values()
        )

        if not accepts_var_kwargs:
            kwargs = {key: value for key, value in kwargs.items() if key in original_params}

        return original_create_causal_mask(*args, **kwargs)

    masking_utils.create_causal_mask = create_causal_mask_compat

    for module in list(sys.modules.values()):
        if module is None or not hasattr(module, "create_causal_mask"):
            continue
        if getattr(module, "create_causal_mask", None) is original_create_causal_mask:
            setattr(module, "create_causal_mask", create_causal_mask_compat)

    backbone = getattr(model, "transformer", None) or getattr(model, "model", None)

    if backbone is not None and not hasattr(backbone, "_exaone_forward_patched"):
        original_forward = backbone.forward

        def patched_forward(self, *args: Any, **kwargs: Any):
            if "input_embeds" in kwargs and "inputs_embeds" not in kwargs:
                kwargs["inputs_embeds"] = kwargs.pop("input_embeds")
            return original_forward(*args, **kwargs)

        backbone.forward = types.MethodType(patched_forward, backbone)
        backbone._exaone_forward_patched = True

    model._exaone_compat_patched = True
    print("[PATCH] EXAONE compatibility patch applied.", flush=True)
    return model


def _load_model():
    print("[BOOT] Starting EXAONE masking worker", flush=True)
    print(f"[BOOT] MODEL_NAME={MODEL_NAME}", flush=True)
    print(f"[BOOT] ADAPTER_NAME={ADAPTER_NAME}", flush=True)
    print(f"[BOOT] CUDA available={torch.cuda.is_available()}", flush=True)
    print(f"[BOOT] USE_4BIT={USE_4BIT}", flush=True)

    _patch_transformers_compat()

    tokenizer = AutoTokenizer.from_pretrained(
        ADAPTER_NAME,
        token=HF_TOKEN,
        trust_remote_code=True,
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model_kwargs: dict[str, Any] = {
        "device_map": "auto",
        "token": HF_TOKEN,
        "trust_remote_code": True,
    }

    if USE_4BIT:
        compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        model_kwargs["quantization_config"] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=compute_dtype,
            bnb_4bit_use_double_quant=True,
        )
    elif torch.cuda.is_available():
        model_kwargs["torch_dtype"] = (
            torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        )

    base_model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, **model_kwargs)
    base_model = _patch_exaone(base_model)

    model = PeftModel.from_pretrained(
        base_model,
        ADAPTER_NAME,
        token=HF_TOKEN,
    )
    model.eval()

    if hasattr(model, "config"):
        model.config.use_cache = True

    print("[BOOT] Adapter loaded successfully.", flush=True)
    return tokenizer, model


tokenizer, model = _load_model()


def empty_masking_result() -> dict[str, list[str]]:
    return {key: [] for key in LABEL_CATS}


def parse_prediction_json(text: str) -> dict[str, list[Any]]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    first = cleaned.find("{")
    last = cleaned.rfind("}")

    if first == -1 or last == -1 or first >= last:
        raise ValueError(f"JSON object를 찾지 못했습니다: {cleaned}")

    obj = json.loads(cleaned[first : last + 1])

    if not isinstance(obj, dict):
        return empty_masking_result()

    return {
        key: obj.get(key, []) if isinstance(obj.get(key, []), list) else []
        for key in LABEL_CATS
    }


def _extract_input_text(job_input: Any) -> str:
    if isinstance(job_input, str):
        return job_input

    if isinstance(job_input, dict):
        for key in ("text", "instr", "input", "content"):
            value = job_input.get(key)
            if isinstance(value, str):
                return value

        if "data" in job_input:
            value = job_input["data"]
            if isinstance(value, str):
                return value
            return json.dumps(value, ensure_ascii=False, indent=2)

        return json.dumps(job_input, ensure_ascii=False, indent=2)

    if job_input is None:
        return ""

    return str(job_input)


def _extract_max_new_tokens(job_input: Any) -> int:
    if not isinstance(job_input, dict) or "max_new_tokens" not in job_input:
        return DEFAULT_MAX_NEW_TOKENS

    try:
        value = int(job_input["max_new_tokens"])
    except (TypeError, ValueError):
        return DEFAULT_MAX_NEW_TOKENS

    return max(1, value)


def predict_masking(input_text: str, max_new_tokens: int = DEFAULT_MAX_NEW_TOKENS) -> str:
    messages = [
        {"role": "system", "content": STRICT_SYSTEM_PROMPT},
        {"role": "user", "content": input_text},
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        add_special_tokens=False,
    ).to(next(model.parameters()).device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated = outputs[0][inputs["input_ids"].shape[-1] :]

    return tokenizer.decode(
        generated,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    ).strip()


def handler(job):
    job_input = job.get("input", {})
    input_text = _extract_input_text(job_input)

    if not input_text.strip():
        return {"error": "input text is required"}

    max_new_tokens = _extract_max_new_tokens(job_input)

    try:
        with GENERATION_LOCK:
            raw = predict_masking(input_text, max_new_tokens=max_new_tokens)

        try:
            parsed = parse_prediction_json(raw)
        except Exception as parse_error:
            return {
                "model": MODEL_NAME,
                "adapter": ADAPTER_NAME,
                "input": input_text,
                "raw": raw,
                "result": empty_masking_result(),
                "parse_error": str(parse_error),
            }

        return {
            "model": MODEL_NAME,
            "adapter": ADAPTER_NAME,
            "input": input_text,
            "raw": raw,
            "result": parsed,
        }

    except Exception as exc:
        return {
            "error": str(exc),
            "model": MODEL_NAME,
            "adapter": ADAPTER_NAME,
        }


if __name__ == "__main__":
    import runpod

    runpod.serverless.start({"handler": handler})
