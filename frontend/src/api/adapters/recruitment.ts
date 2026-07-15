import type { CompanyInfo, InterviewQuestion, JobDescription } from '../../data/backendTypes';
import { toStringList } from './common';

export type RecruitmentPreview = { title: string; sections: string[] };
export type TemplateQuestion = { title: string; guide: string };

export function mapRecruitmentPreview(companyInfo: CompanyInfo, jobDescription?: JobDescription): RecruitmentPreview {
  if (!jobDescription) {
    return {
      title: '모집 공고 미리보기',
      sections: [
        `${companyInfo.company_name || '회사'} 정보를 불러왔습니다.`,
        '선택한 JD를 바탕으로 공고 초안을 미리 확인할 수 있습니다.',
      ],
    };
  }

  const requiredSkills = toStringList(jobDescription.required_skill).join(', ') || '입력 없음';
  const preferredSkills = toStringList(jobDescription.preferred_skill).join(', ') || '입력 없음';
  return {
    title: jobDescription.job_name,
    sections: [
      `${companyInfo.company_name}는 ${companyInfo.company_description}`,
      `주요 업무는 ${jobDescription.main_task || '입력되지 않았습니다.'}`,
      `필수 역량은 ${requiredSkills}이며, 우대 역량은 ${preferredSkills}입니다.`,
      `근무 형태는 ${jobDescription.work_type || '입력 없음'}, 요구 경력은 ${jobDescription.career_level}입니다.`,
      '공고 생성과 PDF 다운로드는 준비 중입니다.',
    ],
  };
}

export function mapTemplateQuestions(data: InterviewQuestion[]): TemplateQuestion[] {
  return data.map((question) => ({ title: question.question, guide: question.purpose }));
}
