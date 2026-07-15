import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoverLetterPage } from './CoverLetterPage';
import type { JdItem } from '../api/adapters';
import type { CoverLetterRow } from '../api/adapters';
import type { Resume } from '../data/backendTypes';

const checklistQueryState = vi.hoisted(() => ({
  items: [] as Array<{ id: number; job_description_id: number; content: string }>,
  isLoading: false,
  isError: false,
}));

const jdItem: JdItem = {
  id: '10',
  title: '프론트엔드 JD',
  team: '',
  status: '준비 중',
  statusCode: 'prepare',
  fit: 0,
  stack: ['React'],
  preferredStack: [],
  summary: '',
  requiredExperience: '',
  employmentType: '',
  educationLevel: '',
  major: '',
  hiringReason: '',
  checklistStatus: 'done',
};

const resume: Resume = {
  id: 1,
  job_description_id: 10,
  name: '홍길동',
  skill: ['React'],
  education_level: {},
  experience: [],
  self_intoduction: [{ question: '지원 동기', answer: '프론트엔드 경험이 있습니다.' }],
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

const coverRow: CoverLetterRow = {
  key: '1',
  applicant: '홍길동',
  jd: '프론트엔드 JD',
  status: '분석 대기',
  statusCode: 'onqueue',
  score: 0,
  skills: ['React'],
  experienceCount: 0,
  updatedAt: '2026. 06. 18.',
  reviewed: false,
};

vi.mock('../hooks/useCoverLetterPageData', () => ({
  useCoverLetterPageData: () => ({
    coverRows: [coverRow],
    jdList: [jdItem],
    resumes: [resume],
    selectedJdId: '10',
    selectedResumeId: '1',
    setSelectedJdId: vi.fn(),
    setSelectedResumeId: vi.fn(),
  }),
}));

vi.mock('../hooks/mutations/useResumeMutations', () => ({
  useResumeMutations: () => ({
    addResume: { isPending: false, mutateAsync: vi.fn() },
    analyzeResume: { isPending: false, mutateAsync: vi.fn() },
    deleteResume: { isPending: false, mutateAsync: vi.fn() },
    saveResume: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock('../hooks/useJdChecklist', () => ({
  useJdChecklist: () => ({
    data: checklistQueryState.items,
    isLoading: checklistQueryState.isLoading,
    isError: checklistQueryState.isError,
  }),
}));

describe('CoverLetterPage checklist gate', () => {
  it('disables analysis and shows JD checklist guidance when the linked JD has no checklist', () => {
    checklistQueryState.items = [];

    render(<CoverLetterPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.getByText('연결된 JD에 체크리스트가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('지원서 분석은 JD 체크리스트를 기준으로 진행됩니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /분석 요청/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'JD 체크리스트 만들러 가기' })).toBeInTheDocument();
  });
});
