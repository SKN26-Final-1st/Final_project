import { describe, expect, it } from 'vitest';
import { mapAdmin, mapCoverLetterRows, mapDashboard, type DashboardSource } from './adapters';
import type { AnalysisReport, JobDescription, Resume } from '../data/backendTypes';

const now = '2026-06-24T00:00:00+09:00';

const jobDescription: JobDescription = {
  id: 10,
  job_name: '프론트엔드 개발자',
  education_level: '',
  major: '',
  career_level: '3년 이상',
  required_skill: ['React'],
  preferred_skill: [],
  main_task: '',
  hiring_reason: '',
  work_type: '',
  status: 'on_going',
  checklist_status: 'done',
  created_at: now,
  updated_at: now,
};

const resumeWithoutStatus = {
  id: 1,
  job_description_id: 10,
  name: '홍길동',
  skill: ['React'],
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
  created_at: now,
  updated_at: now,
} as Resume;

const resumeWithoutReport = {
  ...resumeWithoutStatus,
  id: 2,
  name: '김대기',
} as Resume;

function makeReport(overrides: Partial<AnalysisReport>): AnalysisReport {
  return {
    id: 1,
    resume_id: 1,
    overall_grade: '',
    overall_summary: '',
    candidate_summary: '',
    checklist: [],
    competency_analysis: [],
    fit_analysis: '',
    motive: '',
    collaboration: '',
    strength: [],
    concern: [],
    check_point: [],
    final_comment: '',
    interview_question: [],
    status: 'onqueue',
    created_at: now,
    ...overrides,
  };
}

function makeDashboardSource(analysisReports: AnalysisReport[]): DashboardSource {
  return {
    account: {
      id: 1,
      username: 'admin@example.com',
      account_hash: 'hash',
      name: '관리자',
      verification_question: '',
      verification_answer: '',
      credit: 100,
      subscribe: true,
      subscribe_expiration: now,
    },
    company_info: {
      id: 1,
      company_name: 'HumouR',
      employee_count: 10,
      team_composition: [],
      company_description: '',
      employ_style: [],
    },
    job_descriptions: [jobDescription],
    resumes: [resumeWithoutStatus, resumeWithoutReport],
    analysis_reports: analysisReports,
    interview_questions: [],
  };
}

describe('adapters', () => {
  it('resume.status 없이 최신 AnalysisReport.status로 지원서 상태를 계산한다', () => {
    const reports = [
      makeReport({ id: 1, status: 'done', overall_grade: 'A', created_at: '2026-06-24T01:00:00+09:00' }),
      makeReport({ id: 2, status: 'processing', overall_grade: '', created_at: '2026-06-24T02:00:00+09:00' }),
    ];

    const rows = mapCoverLetterRows([resumeWithoutStatus, resumeWithoutReport], [jobDescription], reports);
    const dashboard = mapDashboard(makeDashboardSource(reports));
    const admin = mapAdmin(makeDashboardSource(reports));

    expect(rows[0]).toMatchObject({
      status: '분석 중',
      statusCode: 'processing',
      resumeStatus: 'processing',
    });
    expect(rows[1]).toMatchObject({
      status: '분석 전',
      statusCode: 'normal',
      resumeStatus: 'normal',
    });
    expect(dashboard.insightCards.find((item) => item.title === '분석 대기')?.detail).toContain('1명의 지원서');
    expect(admin.operatingStatus.processingResumes).toBe(1);
  });
});
