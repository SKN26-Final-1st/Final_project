import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CoverLetterPage } from './CoverLetterPage';
import type { JdItem } from '../api/adapters';
import type { Resume } from '../data/backendTypes';

const saveResumeMutateAsync = vi.hoisted(() => vi.fn());
const addResumeMutateAsync = vi.hoisted(() => vi.fn());
const analyzeResumeMutateAsync = vi.hoisted(() => vi.fn());
const deleteResumeMutateAsync = vi.hoisted(() => vi.fn());

const resume: Resume = {
  id: 1,
  job_description_id: 10,
  name: '홍길동',
  skill: [' React ', '   ', 'TypeScript'],
  education_level: {},
  experience: [' 인턴 6개월 ', ''],
  self_intoduction: [{ question: '지원 동기', answer: '답변' }],
  certification: [' SQLD ', ' '],
  language: [' 영어 OPIC IH ', ''],
  award: [' 해커톤 우수상 ', ''],
  training: [' AI 부트캠프 ', ''],
  other_activity: [' 오픈소스 기여 ', ''],
  status: 'onqueue',
  reviewed: false,
  reviewed_at: '',
  created_at: '',
  updated_at: '',
};

const jdItem: JdItem = {
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

vi.mock('../hooks/useCoverLetterPageData', () => ({
  useCoverLetterPageData: () => ({
    coverRows: [],
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
    addResume: { isPending: false, mutateAsync: addResumeMutateAsync },
    analyzeResume: { isPending: false, mutateAsync: analyzeResumeMutateAsync },
    deleteResume: { isPending: false, mutateAsync: deleteResumeMutateAsync },
    saveResume: { isPending: false, mutateAsync: saveResumeMutateAsync },
  }),
}));

describe('CoverLetterPage', () => {
  it('저장할 때 기술 스택 배열의 빈 항목을 제거하고 공백을 정리한다', async () => {
    saveResumeMutateAsync.mockResolvedValue({
      error: false,
      message: '저장되었습니다.',
      data: resume,
    });
    const user = userEvent.setup();

    render(<CoverLetterPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /저장/ }));

    await waitFor(() => {
      expect(saveResumeMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          skill: ['React', 'TypeScript'],
          experience: ['인턴 6개월'],
          certification: ['SQLD'],
          language: ['영어 OPIC IH'],
          award: ['해커톤 우수상'],
          training: ['AI 부트캠프'],
          other_activity: ['오픈소스 기여'],
        }),
      );
    });
  });
});
