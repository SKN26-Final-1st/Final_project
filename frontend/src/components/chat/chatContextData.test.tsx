import { describe, expect, it } from 'vitest';
import type { JdItem } from '../../api/adapters';
import type { AnalysisReport, InterviewQuestion, Resume } from '../../data/backendTypes';
import { buildChatContextData, chatScopeOptions } from './chatContextData';

const jd: JdItem = {
  id: '10',
  title: '백엔드 엔지니어',
  team: '플랫폼팀',
  status: '진행 중',
  statusCode: 'on_going',
  checklistStatus: 'done',
  fit: 82,
  stack: ['Django'],
  preferredStack: [],
  summary: 'API 개발',
  requiredExperience: '3년',
  employmentType: '정규직',
  educationLevel: '무관',
  major: '무관',
  hiringReason: '증원',
};

const resume: Resume = {
  id: 1,
  job_description_id: 10,
  name: '홍길동',
  skill: [],
  education_level: {},
  experience: [],
  self_intoduction: [],
  certification: [],
  language: [],
  award: [],
  training: [],
  other_activity: [],
  reviewed: false,
  reviewed_at: '',
  created_at: '',
  updated_at: '',
};

const question: InterviewQuestion = {
  id: 1,
  resume_id: 1,
  question: '장애 대응 경험을 설명해주세요.',
  answer: '',
  purpose: '문제 해결 역량 확인',
};

const report: AnalysisReport = {
  id: 1,
  resume_id: 1,
  overall_grade: 'A',
  overall_summary: '직무 적합도가 높습니다.',
  candidate_summary: '백엔드 경험 보유',
  checklist: [],
  competency_analysis: [],
  fit_analysis: '',
  motive: '',
  collaboration: '',
  strength: [],
  concern: [],
  check_point: [],
  final_comment: '',
  interview_question: [question],
  status: 'done',
  created_at: '',
};

describe('chatContextData', () => {
  it('offers only backend-grounded scopes, sources, and prompts for AI chat', () => {
    const context = buildChatContextData({
      jdList: [jd],
      resumes: [resume],
      analysisReports: [report],
      interviewQuestions: [question],
    });

    expect(chatScopeOptions.map((option) => option.key)).toEqual(['all', 'jd', 'guide']);
    expect(context.sources).toHaveLength(1);
    expect(context.sources.every((source) => source.scope === 'jd')).toBe(true);
    expect(context.prompts.every((prompt) => prompt.scope === 'jd')).toBe(true);
    expect(context.prompts.map((prompt) => prompt.label).join(' ')).not.toContain('홍길동');

    expect(context.collections.find((item) => item.key === 'report')?.count).toBe('1개');
    expect(context.collections.find((item) => item.key === 'report')?.queryable).toBe(false);
    expect(context.collections.find((item) => item.key === 'question')?.count).toBe('1개');
    expect(context.collections.find((item) => item.key === 'jd')?.queryable).toBe(true);
  });
});
