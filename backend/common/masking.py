
from openai import OpenAI

from typing import List
from pydantic import BaseModel, Field

class MaskingAnalysis(BaseModel):
    comp_name: List[str] = Field(default_factory=list, description="마스킹 필요 회사·고객사·이전회사명")
    person_name: List[str] = Field(default_factory=list, description="지원자 및 제3자 실명")
    address: List[str] = Field(default_factory=list, description="주소·출신지역")
    personal_info: List[str] = Field(default_factory=list, description="고유식별·연락처·차별위험·민감정보")
    school_edu: List[str] = Field(default_factory=list, description="추상화 대상 학교·교육기관")
    project_name: List[str] = Field(default_factory=list, description="프로젝트 실명")
    jd_discrimination: List[str] = Field(default_factory=list, description="JD 내 차별조항(제거·경고)")





