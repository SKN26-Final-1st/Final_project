import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisReportPage } from './AnalysisReportPage';
import type { JdItem } from '../api/adapters';
import type { AnalysisReport, Resume } from '../data/backendTypes';
import type { AnalysisReportItem } from '../hooks/useAnalysisReportPageData';

const saveReport = vi.hoisted(() => vi.fn());
const setSelectedReportId = vi.hoisted(() => vi.fn());
const reloadData = vi.hoisted(() => vi.fn());

vi.mock('../api/backendClient', () => ({
  apiClient: {
    saveReport,
  },
}));

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
  fit_analysis: '적합도 1\n적합도 2\n적합도 3',
  motive: '지원 동기 분석',
  collaboration: '협업 방식 분석',
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
  status: 'done',
  created_at: '2026-06-24T00:00:00+09:00',
};

const selectedItem: AnalysisReportItem = {
  report,
  resume,
  jd,
  questions: report.interview_question,
};

const firstResumeSecondReport: AnalysisReport = {
  ...report,
  id: 6,
  overall_grade: 'B',
  overall_summary: '두 번째 리포트 요약',
  created_at: '2026-06-24T14:03:00+09:00',
};

const firstResumeSecondItem: AnalysisReportItem = {
  report: firstResumeSecondReport,
  resume,
  jd,
  questions: firstResumeSecondReport.interview_question,
};

const secondResume: Resume = {
  ...resume,
  id: 2,
  job_description_id: 20,
  name: '김백엔드',
};

const secondJd: JdItem = {
  ...jd,
  id: '20',
  title: '백엔드 JD',
};

const secondReport: AnalysisReport = {
  ...report,
  id: 2,
  resume_id: 2,
  overall_grade: 'B',
  overall_summary: '백엔드 요약',
  concern: [],
  check_point: [],
  interview_question: [{ id: 5, resume_id: 2, question: 'Django 질문', answer: '답변', purpose: '의도' }],
};

const secondItem: AnalysisReportItem = {
  report: secondReport,
  resume: secondResume,
  jd: secondJd,
  questions: secondReport.interview_question,
};

const thirdResume: Resume = {
  ...resume,
  id: 3,
  job_description_id: 30,
  name: '박운영',
};

const thirdJd: JdItem = {
  ...jd,
  id: '30',
  title: '운영 JD',
};

const thirdReport: AnalysisReport = {
  ...report,
  id: 3,
  resume_id: 3,
  overall_grade: 'C',
  overall_summary: '운영 요약',
  concern: ['운영 우려'],
  check_point: ['운영 확인'],
  interview_question: [],
};

const thirdItem: AnalysisReportItem = {
  report: thirdReport,
  resume: thirdResume,
  jd: thirdJd,
  questions: thirdReport.interview_question,
};

const fourthResume: Resume = {
  ...resume,
  id: 4,
  job_description_id: 40,
  name: '윤무질문',
};

const fourthJd: JdItem = {
  ...jd,
  id: '40',
  title: '데이터 JD',
};

const fourthReport: AnalysisReport = {
  ...report,
  id: 4,
  resume_id: 4,
  overall_grade: 'A',
  overall_summary: '데이터 요약',
  concern: [],
  check_point: [],
  interview_question: [],
};

const fourthItem: AnalysisReportItem = {
  report: fourthReport,
  resume: fourthResume,
  jd: fourthJd,
  questions: fourthReport.interview_question,
};

const processingResume: Resume = {
  ...resume,
  id: 5,
  job_description_id: 50,
  name: '이처리',
};

const processingJd: JdItem = {
  ...jd,
  id: '50',
  title: '처리 JD',
};

const processingReport: AnalysisReport = {
  ...report,
  id: 5,
  resume_id: 5,
  overall_grade: '',
  overall_summary: '',
  candidate_summary: '',
  competency_analysis: [],
  fit_analysis: '',
  motive: '',
  collaboration: '',
  strength: [],
  concern: [],
  check_point: [],
  final_comment: '',
  interview_question: [],
  status: 'processing',
  created_at: '2026-06-24T00:00:00+09:00',
};

const processingItem: AnalysisReportItem = {
  report: processingReport,
  resume: processingResume,
  jd: processingJd,
  questions: [],
};

vi.mock('../hooks/useAnalysisReportPageData', () => ({
  useAnalysisReportPageData: () => ({
    reportItems: [selectedItem, firstResumeSecondItem, secondItem, thirdItem, fourthItem, processingItem],
    reportTreeItems: [
      { resume, jd, reports: [firstResumeSecondItem, selectedItem] },
      { resume: secondResume, jd: secondJd, reports: [secondItem] },
      { resume: thirdResume, jd: thirdJd, reports: [thirdItem] },
      { resume: fourthResume, jd: fourthJd, reports: [fourthItem] },
      { resume: processingResume, jd: processingJd, reports: [processingItem] },
    ],
    reloadData,
    refreshing: false,
    selectedItem,
    selectedReportId: '1',
    selectedReportResumeId: '1',
    setSelectedReportId,
    setSelectedReportResumeId: setSelectedReportId,
  }),
}));

describe('AnalysisReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveReport.mockResolvedValue({
      error: false,
      message: '분석 리포트를 저장했습니다.',
      data: report,
    });
  });

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

  it('리포트 목록을 검색하고 motive/collaboration 분석을 표시한다', async () => {
    const user = userEvent.setup();

    render(<AnalysisReportPage navigate={vi.fn()} />);

    expect(screen.getByText('지원 동기 분석')).toBeInTheDocument();
    expect(screen.getByText('협업 방식 분석')).toBeInTheDocument();
    expect(screen.queryByLabelText('리포트 등급 필터')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('리포트 JD 필터')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('리포트 정렬')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('지원자, JD, 질문 검색'), 'Django');

    expect(screen.getByRole('treeitem', { name: /김백엔드/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /홍길동/ })).not.toBeInTheDocument();
  });

  it('지원자 하위에 여러 리포트를 트리로 보여주고 reportId 단위로 선택한다', async () => {
    const user = userEvent.setup();

    render(<AnalysisReportPage navigate={vi.fn()} />);

    const tree = screen.getByRole('tree', { name: '리포트 트리' });
    const hongReports = within(tree).getByRole('group', { name: '홍길동 리포트' });

    expect(within(tree).getAllByText('홍길동')).toHaveLength(1);
    expect(within(hongReports).getByRole('button', { name: /리포트 1/ })).toBeInTheDocument();
    expect(within(hongReports).getByRole('button', { name: /리포트 2/ })).toBeInTheDocument();

    await user.click(within(hongReports).getByRole('button', { name: /리포트 1/ }));

    expect(setSelectedReportId).toHaveBeenCalledWith('6');
  });

  it('완료된 리포트를 수정 저장할 때 report/modify payload에 허용 필드만 보낸다', async () => {
    const user = userEvent.setup();

    render(<AnalysisReportPage navigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /리포트 수정/ }));
    const summaryInput = screen.getByLabelText('전체 평가 요약 수정');
    await user.clear(summaryInput);
    await user.type(summaryInput, '수정한 전체 요약');
    await user.click(screen.getByRole('button', { name: /리포트 저장/ }));

    expect(saveReport).toHaveBeenCalledTimes(1);
    const payload = saveReport.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({ id: 1, overall_summary: '수정한 전체 요약' }));
    expect(payload).not.toEqual(expect.objectContaining({ resume_id: 1 }));
    expect(payload).not.toEqual(expect.objectContaining({ status: 'done' }));
    expect(payload).not.toEqual(expect.objectContaining({ delete: true }));
    expect(reloadData).toHaveBeenCalled();
  });

  it('진행 중 리포트는 N/A 등급 대신 분석 상태를 표시한다', () => {
    render(<AnalysisReportPage navigate={vi.fn()} />);

    const processingReports = screen.getByRole('group', { name: '이처리 리포트' });
    const processingCard = within(processingReports).getByRole('button', { name: /분석 중/ });

    expect(within(processingCard).getByText('분석 중')).toBeInTheDocument();
    expect(within(processingCard).queryByText(/N\/A/)).not.toBeInTheDocument();
  });

  it('입력 기반 추천검색어를 여러 개 선택해 리포트 목록을 좁히고 해제한다', () => {
    render(<AnalysisReportPage navigate={vi.fn()} />);

    expect(screen.queryByLabelText('리포트 빠른 필터')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '질문 있음' })).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('지원자, JD, 질문 검색');

    fireEvent.change(searchInput, { target: { value: '등' } });

    expect(screen.getByRole('group', { name: '리포트 추천검색어' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A/B 등급' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C 이하' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'A/B 등급' }));

    expect(searchInput).toHaveValue('A/B 등급');
    expect(screen.queryByRole('group', { name: '선택된 리포트 추천검색어' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A/B 등급' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('treeitem', { name: /홍길동/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /김백엔드/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /윤무질문/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /박운영/ })).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'A/B 등급, 질' } });
    expect(screen.getByRole('button', { name: '질문 있음' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '질문 있음' }));

    expect(searchInput).toHaveValue('A/B 등급, 질문 있음');
    expect(screen.getByRole('treeitem', { name: /홍길동/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /김백엔드/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /윤무질문/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /박운영/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '질문 있음' }));

    expect(searchInput).toHaveValue('A/B 등급');
    expect(screen.getByRole('treeitem', { name: /홍길동/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /김백엔드/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /윤무질문/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /박운영/ })).not.toBeInTheDocument();
  });
});
