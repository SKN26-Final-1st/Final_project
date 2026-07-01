import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoverLetterPage } from './CoverLetterPage';
import type { JdItem } from '../api/adapters';
import type { CoverLetterRow } from '../api/adapters';
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
  education_level: {
    final_degree: 'bachelor',
    bachelor: '한국대학교',
    master: '',
    doctoral: '',
  },
  experience: [
    {
      company_name: ' 휴머 ',
      length: ' 6개월 ',
      position: ' 인턴 ',
      experience_description: ' 데이터 분석 업무 ',
    },
    {
      company_name: '   ',
      length: '',
      position: '',
      experience_description: '',
    },
  ],
  self_intoduction: [{ question: '지원 동기', answer: '답변' }],
  certification: [' SQLD ', ' '],
  language: [{ language_name: ' 영어 ', test_name: ' OPIC ', score: ' IH ' }],
  award: [{ award_name: ' 해커톤 우수상 ', award_from: ' 서울시 ', time: ' 2024 ' }],
  training: [
    {
      education_name: ' AI 부트캠프 ',
      education_from: ' 패스트캠퍼스 ',
      education_description: ' 프로젝트 교육 ',
      start: ' 2024-01 ',
      end: ' 2024-03 ',
    },
  ],
  other_activity: [
    {
      activity_name: ' 오픈소스 기여 ',
      activity_description: ' 문서 개선 ',
      start: ' 2023-01 ',
      end: ' 2023-12 ',
    },
  ],
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

const coverRow: CoverLetterRow = {
  key: '1',
  applicant: '홍길동',
  jd: '프론트엔드 JD',
  status: '분석 대기',
  statusCode: 'onqueue',
  score: 0,
  skills: ['React', 'TypeScript'],
  experienceCount: 1,
  updatedAt: '2026. 06. 18.',
  reviewed: false,
};

const coverLetterPageData = vi.hoisted(() => ({
  coverRows: [] as CoverLetterRow[],
}));
const checklistQueryState = vi.hoisted(() => ({
  items: [{ id: 1, job_description_id: 10, content: 'React 경험 확인' }],
  isLoading: false,
  isError: false,
}));

vi.mock('../hooks/useCoverLetterPageData', () => ({
  useCoverLetterPageData: () => ({
    coverRows: coverLetterPageData.coverRows,
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

vi.mock('../hooks/useJdChecklist', () => ({
  useJdChecklist: () => ({
    data: checklistQueryState.items,
    isLoading: checklistQueryState.isLoading,
    isError: checklistQueryState.isError,
  }),
}));

describe('CoverLetterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coverLetterPageData.coverRows = [];
    checklistQueryState.items = [{ id: 1, job_description_id: 10, content: 'React 경험 확인' }];
    checklistQueryState.isLoading = false;
    checklistQueryState.isError = false;
  });

  it('저장할 때 이력서 구조화 필드를 목업 JSON 구조로 정리한다', async () => {
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
          education_level: {
            final_degree: 'bachelor',
            bachelor: '한국대학교',
            master: '',
            doctoral: '',
          },
          experience: [
            {
              company_name: '휴머',
              length: '6개월',
              position: '인턴',
              experience_description: '데이터 분석 업무',
            },
          ],
          self_intoduction: [{ question: '지원 동기', answer: '답변' }],
          certification: ['SQLD'],
          language: [{ language_name: '영어', test_name: 'OPIC', score: 'IH' }],
          award: [{ award_name: '해커톤 우수상', award_from: '서울시', time: '2024' }],
          training: [
            {
              education_name: 'AI 부트캠프',
              education_from: '패스트캠퍼스',
              education_description: '프로젝트 교육',
              start: '2024-01',
              end: '2024-03',
            },
          ],
          other_activity: [
            {
              activity_name: '오픈소스 기여',
              activity_description: '문서 개선',
              start: '2023-01',
              end: '2023-12',
            },
          ],
        }),
      );
    });
  });

  it('자소서 목록을 검색하고 선택한 resume 구조화 필드를 읽기 쉽게 보여준다', async () => {
    const user = userEvent.setup();
    coverLetterPageData.coverRows = [
      coverRow,
      {
        ...coverRow,
        key: '2',
        applicant: '김백엔드',
        jd: '백엔드 JD',
        status: '분석 완료',
        statusCode: 'done',
        score: 94,
        skills: ['Django'],
      },
    ];

    render(<CoverLetterPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.getByText('구조화 이력 요약')).toBeInTheDocument();
    expect(screen.getByText('영어 · OPIC · IH')).toBeInTheDocument();
    expect(screen.queryByLabelText('자소서 분석 상태 필터')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('자소서 검토 필터')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('자소서 JD 필터')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('자소서 정렬')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('지원자, JD, 기술 검색'), 'Django');

    expect(screen.getByRole('button', { name: '김백엔드 자소서 선택' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '홍길동 자소서 선택' })).not.toBeInTheDocument();
  });

  it('입력 기반 추천검색어를 여러 개 선택해 자소서 목록을 좁히고 해제한다', () => {
    coverLetterPageData.coverRows = [
      { ...coverRow, resumeStatus: 'onqueue' },
      {
        ...coverRow,
        key: '2',
        applicant: '김백엔드',
        jd: '백엔드 JD',
        status: '분석 완료',
        statusCode: 'done',
        resumeStatus: 'done',
        score: 94,
        skills: ['Django'],
        reviewed: true,
      },
      {
        ...coverRow,
        key: '3',
        applicant: '최처리',
        jd: '운영 JD',
        status: '분석 중',
        statusCode: 'processing',
        resumeStatus: 'processing',
        skills: ['Vue'],
      },
      {
        ...coverRow,
        key: '4',
        applicant: '이완료',
        jd: '프론트엔드 JD',
        status: '분석 완료',
        statusCode: 'done',
        resumeStatus: 'done',
        skills: ['React'],
      },
    ];

    render(<CoverLetterPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.queryByLabelText('자소서 빠른 필터')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '분석 완료' })).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('지원자, JD, 기술 검색');

    fireEvent.change(searchInput, { target: { value: '분' } });

    const suggestionGroup = screen.getByRole('group', { name: '자소서 추천검색어' });
    expect(suggestionGroup).toBeInTheDocument();
    expect(within(suggestionGroup).getByRole('button', { name: '분석 대기' })).toBeInTheDocument();
    expect(within(suggestionGroup).getByRole('button', { name: '분석 중' })).toBeInTheDocument();

    fireEvent.click(within(suggestionGroup).getByRole('button', { name: '분석 완료' }));

    expect(screen.getByLabelText('김백엔드 자소서 선택')).toBeInTheDocument();
    expect(screen.getByLabelText('이완료 자소서 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('홍길동 자소서 선택')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('최처리 자소서 선택')).not.toBeInTheDocument();
    expect(searchInput).toHaveValue('분석 완료');
    expect(screen.queryByRole('group', { name: '선택된 자소서 추천검색어' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: '자소서 추천검색어' })).getByRole('button', { name: '분석 완료' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(searchInput, { target: { value: '분석 완료, React' } });

    expect(screen.getByLabelText('이완료 자소서 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('홍길동 자소서 선택')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('김백엔드 자소서 선택')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '분석 완료, 검' } });
    fireEvent.click(within(screen.getByRole('group', { name: '자소서 추천검색어' })).getByRole('button', { name: '검토 완료' }));

    expect(searchInput).toHaveValue('분석 완료, 검토 완료');
    expect(screen.getByLabelText('김백엔드 자소서 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('이완료 자소서 선택')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('group', { name: '자소서 추천검색어' })).getByRole('button', { name: '검토 완료' }));

    expect(searchInput).toHaveValue('분석 완료');
    expect(screen.getByLabelText('김백엔드 자소서 선택')).toBeInTheDocument();
    expect(screen.getByLabelText('이완료 자소서 선택')).toBeInTheDocument();
  });

  it('분석 완료 상태여도 채팅 화면에서 리포트 확인 버튼을 표시하지 않는다', () => {
    coverLetterPageData.coverRows = [
      {
        ...coverRow,
        status: '분석 완료',
        statusCode: 'done',
        resumeStatus: 'done',
        score: 94,
      },
    ];

    render(<CoverLetterPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '채팅 화면에서 리포트 확인' })).not.toBeInTheDocument();
  });
});
