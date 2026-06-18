import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisReportPage } from './AnalysisReportPage';
import type { JdItem } from '../api/adapters';
import type { AnalysisReport, Resume } from '../data/backendTypes';
import type { AnalysisReportItem } from '../hooks/useAnalysisReportPageData';

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
  status: 'done',
  reviewed: false,
  reviewed_at: '',
  created_at: '',
  updated_at: '',
};

const jd: JdItem = {
  id: '10',
  title: '프론트엔드 JD',
  team: '',
  status: '준비 중',
  statusCode: 'prepare',
  fit: 0,
  stack: [],
  preferredStack: [],
  summary: '',
  requiredExperience: '',
  employmentType: '',
  educationLevel: '',
  major: '',
  hiringReason: '',
};

const report: AnalysisReport = {
  id: 1,
  resume_id: 1,
  overall_grade: 'A',
  overall_summary: '전체 요약',
  candidate_summary: '지원자 요약',
  checklist: [],
  competency_analysis: ['역량 1', '역량 2', '역량 3', '역량 4'],
  fit_analysis: ['적합도 1', '적합도 2', '적합도 3'],
  strength: ['강점 1', '강점 2', '강점 3'],
  concern: ['우려 1', '우려 2', '우려 3'],
  check_point: ['포인트 1', '포인트 2', '포인트 3'],
  final_comment: '최종 코멘트',
  interview_question: [
    { id: 1, resume_id: 1, question: '질문 1', answer: '답변 1', purpose: '의도 1' },
    { id: 2, resume_id: 1, question: '질문 2', answer: '답변 2', purpose: '의도 2' },
    { id: 3, resume_id: 1, question: '질문 3', answer: '답변 3', purpose: '의도 3' },
    { id: 4, resume_id: 1, question: '질문 4', answer: '답변 4', purpose: '의도 4' },
  ],
};

const selectedItem: AnalysisReportItem = {
  report,
  resume,
  jd,
  questions: report.interview_question,
};

vi.mock('../hooks/useAnalysisReportPageData', () => ({
  useAnalysisReportPageData: () => ({
    reportItems: [selectedItem],
    selectedItem,
    selectedReportResumeId: '1',
    setSelectedReportResumeId: vi.fn(),
  }),
}));

describe('AnalysisReportPage', () => {
  it('긴 리포트 배열 섹션은 일부만 먼저 보여주고 전체 보기로 펼친다', async () => {
    const user = userEvent.setup();

    render(<AnalysisReportPage navigate={vi.fn()} />);

    expect(screen.getByText('역량 1')).toBeInTheDocument();
    expect(screen.getByText('역량 2')).toBeInTheDocument();
    expect(screen.queryByText('역량 3')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /전체 보기/ })[0]);

    expect(screen.getByText('역량 3')).toBeInTheDocument();
  });

  it('질문 추천은 질문만 compact하게 먼저 보이고 답변/의도는 상세에서 펼친다', async () => {
    const user = userEvent.setup();

    render(<AnalysisReportPage navigate={vi.fn()} />);

    await user.click(screen.getByRole('tab', { name: '질문 추천' }));

    expect(screen.getByText('질문 1')).toBeInTheDocument();
    expect(screen.getByText('질문 3')).toBeInTheDocument();
    expect(screen.queryByText('질문 4')).not.toBeInTheDocument();
    expect(screen.queryByText('답변 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /상세 보기/ }));

    expect(screen.getByText('답변 1')).toBeInTheDocument();
    expect(screen.getByText('의도 1')).toBeInTheDocument();
  });
});
