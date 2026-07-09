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
    "dlfp22/exaone-star-lora-best",
)
HF_TOKEN = os.environ.get("HF_TOKEN")
DEFAULT_MAX_NEW_TOKENS = int(os.environ.get("DEFAULT_MAX_NEW_TOKENS", "1024"))
USE_4BIT = os.environ.get("USE_4BIT", "1").lower() not in {"0", "false", "no"}

FORMAT_INSTRUCTIONS = """
{
  "analyses": [
    {
      "index": 0,
      "s": "Situation",
      "t": "Task",
      "a": "Action",
      "r": "Result"
    }
  ],
  "original_quality": "원문 자기소개서 품질 평가"
}
""".strip()

star_analysis_prompt = """
너는 채용 평가를 위한 자기소개서 STAR 분석가야. 각 자기소개서 답변을 Situation, Task, Action, Result로 나누어 한국어로 작성해. s, t, a, r 각각은 1문장 이내로 간결해야 한다. 입력에 없는 경험, 수치, 성과, 회사명, 인명은 만들지 말고, 마스킹 토큰은 원문 그대로 유지해. 또한 original_quality에는 STAR 분석 전 원문 자기소개서가 전반적으로 얼마나 구조적이고 구체적으로 작성되었는지, 경험 맥락·행동·결과가 얼마나 명확한지 1~2문장으로 평가해. 원문이 부족한데 STAR 분석 결과만 좋아 보일 수 있는 위험도 함께 언급해.

[출력 규칙]
- 반드시 JSON object 하나만 출력한다.
- 첫 글자는 반드시 {{ 로 시작하고 마지막 글자는 반드시 }} 로 끝난다.
- 코드블록, 코드펜스, ```json, ``` 를 절대 사용하지 않는다.
- 설명, 해설, 마크다운, 리스트 단독 출력, 번역, 영어 변환을 절대 하지 않는다.
- analyses는 입력 항목 수와 같은 개수여야 한다.
- index는 입력 index와 같아야 한다.
- 키는 반드시 analyses, original_quality만 사용한다.
- analyses 내부 키는 반드시 index, s, t, a, r만 사용한다.

[출력 형식]
{format_instructions}
""".strip().format(format_instructions=FORMAT_INSTRUCTIONS)

star_analysis_user_prompt = """
다음 자기소개서 문항과 답변을 각각 STAR 관점으로 분석해줘. analyses는 입력 항목 수와 같은 개수여야 하고, index는 입력 index와 같아야 해. 마지막에 original_quality도 반드시 작성해.

{context_json}
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
    print("[BOOT] Starting EXAONE STAR analysis worker", flush=True)
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


def empty_star_result() -> dict[str, Any]:
    return {
        "analyses": [],
        "original_quality": "",
    }


def _normalize_analysis(item: Any) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None

    try:
        index = int(item.get("index", 0))
    except (TypeError, ValueError):
        index = 0

    return {
        "index": index,
        "s": item.get("s", "") if isinstance(item.get("s", ""), str) else "",
        "t": item.get("t", "") if isinstance(item.get("t", ""), str) else "",
        "a": item.get("a", "") if isinstance(item.get("a", ""), str) else "",
        "r": item.get("r", "") if isinstance(item.get("r", ""), str) else "",
    }


def parse_prediction_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    first = cleaned.find("{")
    last = cleaned.rfind("}")

    if first == -1 or last == -1 or first >= last:
        raise ValueError(f"JSON object를 찾지 못했습니다: {cleaned}")

    obj = json.loads(cleaned[first : last + 1])

    if not isinstance(obj, dict):
        return empty_star_result()

    analyses = obj.get("analyses", [])
    if not isinstance(analyses, list):
        analyses = []

    normalized = []
    for item in analyses:
        analysis = _normalize_analysis(item)
        if analysis is not None:
            normalized.append(analysis)

    original_quality = obj.get("original_quality", "")
    if not isinstance(original_quality, str):
        original_quality = ""

    return {
        "analyses": normalized,
        "original_quality": original_quality,
    }


def _extract_context_json(job_input: Any) -> str:
    if isinstance(job_input, str):
        return job_input

    if isinstance(job_input, dict):
        for key in ("context_json", "text", "instr", "input", "content"):
            value = job_input.get(key)
            if isinstance(value, str):
                return value

        if "data" in job_input:
            value = job_input["data"]
            if isinstance(value, str):
                return value
            return json.dumps(value, ensure_ascii=False, indent=2)

        payload = {
            key: value
            for key, value in job_input.items()
            if key not in {"max_new_tokens"}
        }
        return json.dumps(payload, ensure_ascii=False, indent=2)

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


def predict_star(context_json: str, max_new_tokens: int = DEFAULT_MAX_NEW_TOKENS) -> str:
    messages = [
        {"role": "system", "content": star_analysis_prompt},
        {
            "role": "user",
            "content": star_analysis_user_prompt.format(context_json=context_json),
        },
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
    context_json = _extract_context_json(job_input)

    if not context_json.strip():
        return {"error": "input context_json is required"}

    max_new_tokens = _extract_max_new_tokens(job_input)

    try:
        with GENERATION_LOCK:
            raw = predict_star(context_json, max_new_tokens=max_new_tokens)

        try:
            parsed = parse_prediction_json(raw)
        except Exception as parse_error:
            return {
                "model": MODEL_NAME,
                "adapter": ADAPTER_NAME,
                "input": context_json,
                "raw": raw,
                "result": empty_star_result(),
                "parse_error": str(parse_error),
            }

        return {
            "model": MODEL_NAME,
            "adapter": ADAPTER_NAME,
            "input": context_json,
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
