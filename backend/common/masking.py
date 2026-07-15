import os
import json
import requests

from openai import OpenAI

from typing import List
from pydantic import BaseModel, Field

from .utils import load_env

load_env()

class MaskingAnalysis(BaseModel):
    """LLM이 추출해야 하는 마스킹 대상 카테고리별 목록입니다."""

    comp_name: List[str] = Field(default_factory=list, description="마스킹 필요 회사·고객사·이전회사명")
    person_name: List[str] = Field(default_factory=list, description="지원자 및 제3자 실명")
    address: List[str] = Field(default_factory=list, description="주소·출신지역")
    personal_info: List[str] = Field(default_factory=list, description="고유식별·연락처·차별위험·민감정보")
    school_edu: List[str] = Field(default_factory=list, description="추상화 대상 학교·교육기관")
    project_name: List[str] = Field(default_factory=list, description="프로젝트 실명")
    jd_discrimination: List[str] = Field(default_factory=list, description="JD 내 차별조항(제거·경고)")

MODEL_NAME = "gpt-4o-mini"

masking_prompt = """
당신은 한국 채용 데이터의 개인정보 마스킹 전문가입니다.
입력으로 들어온 자유 텍스트(자기소개서, 채용공고(JD) 본문, 회사 소개,
채용 사유, 메모 등)에서 "마스킹이 필요한 표현"을 찾아
아래 7개 카테고리로 분류하여 추출하세요.
(추출된 표현은 후처리에서 모두 마스킹 처리됩니다. 당신의 역할은 마스킹할
스팬을 찾아내는 것이며, 어떻게 가릴지·삭제할지는 판단하지 않습니다.)

[마스킹 카테고리]
1. comp_name        : 회사/기관/고객사/이전 근무처 등 조직 식별명
2. person_name      : 지원자 본인 및 제3자(교수·추천인·동료 등)의 실명
3. address          : 주소 및 출신·거주 지역
4. personal_info    : 고유식별정보·연락처·차별위험정보·민감정보
5. school_edu       : 학교/교육기관/주최기관명
6. project_name     : 내부·제3자 정보가 포함될 수 있는 프로젝트 실명
7. jd_discrimination: JD 내 차별 소지 조항(성별·나이·외모·출신·혼인·가족)

[카테고리 상세 기준]

■ comp_name
  - 포함: 현재/이전 회사명, 고객사명("A은행", "B카드"), JD 제목 속 회사명,
          투자사·파트너사 등 식별 가능한 조직명.
  - 제외: 일반 업종 표현("금융권", "대형 IT 기업")은 추출하지 않음(이미 비식별).

■ person_name
  - 포함: 지원자 본명, 자소서 속 교수·멘토·추천인·동료 등 제3자 실명,
          메모/팀 구성 속 실명.
  - 제외: 직책만 있고 이름이 없는 경우("CTO", "팀장")는 추출하지 않음.

■ address
  - 포함: 도로명/지번 주소, 동·구 단위 출신지·거주지("서울 대방동", "부산 출신").
  - 제외: 근무 희망 지역처럼 직무상 필요한 일반 지역 표현은 신중히 판단.

■ personal_info  (가장 넓음 — 가능하면 subtype을 함께 표기)
  - 고유식별: 주민등록번호, 여권번호, 운전면허번호, 외국인등록번호
  - 연락처  : 이메일, 전화번호 (텍스트 내에 노출된 경우)
  - 차별위험: 생년월일·나이, 성별, 병역("2021년 군 전역"),
              혼인여부, 가족관계("2남 1녀 중 차남"), 출신지역, 재산
  - 민감정보: 종교, 정치성향, 노조·정당 가입, 건강·장애 정보
  - ※ 나이를 직접 유추시키는 표현(전역 연도, 졸업 연도+나이 등)도 포함.

■ school_edu
  - 포함: 대학·고교명, 부트캠프/교육기관("플레이데이터"),
          공모전 주최사("삼성전자 주최 공모전"의 삼성전자).

■ project_name
  - 포함: 내부 프로젝트 실명, 고객사 프로젝트명("차세대 시스템 구축").

■ jd_discrimination
  - 성별   : "남성 우대", "여성 우대", "군필자 우대"
  - 나이   : "20대 선호", "30세 이하", "젊고 활기찬 분"
  - 외모/신체: "사진 부착 필수", "키 170 이상", "용모 단정"
  - 출신지역: "서울 거주자 우대", "지방 출신 환영"
  - 혼인   : "미혼자 우대"
  - 가족   : "부모 직업", "가족 학력/재산"

[추출 규칙]
- 입력 텍스트에 등장한 "원문 표현 그대로" 추출한다(임의 정규화·번역 금지).
- 동일 표현이 여러 번 나와도 리스트에는 한 번만 넣는다(중복 제거).
- 해당 카테고리에 없으면 빈 리스트 []를 반환한다.
- 이미 마스킹된 표현(예: "[MASK_COMPANY]", "금융권")은 추출하지 않는다.
- 판단이 모호하면 누락보다 과추출을 택한다(마스킹은 보수적으로).
- 추출 외의 설명·해설 문장은 출력하지 않는다.
"""

client = None

def get_client():
    """마스킹 분석에 사용할 OpenAI 클라이언트를 지연 생성해 재사용합니다."""

    global client

    if client is not None: 
        return client
    
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return client

def invoke_openai(data):
    """원본 채용 데이터를 받아 마스킹해야 할 표현 목록(mask_result)을 생성합니다."""

    global masking_prompt

    ai_client = get_client()

    data_text = json.dumps(data, ensure_ascii=False, indent=2)
    messages = [
        {"role": "system", "content": masking_prompt},
        {"role": "user", "content": data_text},
    ]

    parse_method = getattr(ai_client.beta.chat.completions, "parse", None)
    if parse_method:
        response = parse_method(
            model=MODEL_NAME,
            messages=messages,
            response_format=MaskingAnalysis,
        )
        return response.choices[0].message.parsed.model_dump()

    response = ai_client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        response_format={"type": "json_object"},
    )

    return MaskingAnalysis.model_validate_json(
        response.choices[0].message.content
    ).model_dump()


RUNPOD_ENDPOINT_ID = os.environ.get("RUNPOD_MASKING_ENDPOINT_ID")
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY")

def invoke_runpod(data):
    indata = json.dumps(data, ensure_ascii=False, indent=2)
    
    url = f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/runsync"

    headers = {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "input": {
            "instr": indata
        }
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=600,
    )

    if response.status_code != 200:
        return response.status_code, None

    try:
        response_data = response.json()
    except ValueError:
        return response.status_code, None

    output = response_data.get("output")
    if not isinstance(output, dict):
        return response.status_code, None

    result = output.get("result")
    if result is None:
        return response.status_code, None

    return response.status_code, result

def invoke(data):
    
    status_code, res = invoke_runpod(data)

    if status_code == 200 and res is not None:
        return res

    return invoke_openai(data)
