import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JdPage } from './JdPage';
import type { JdItem } from '../api/adapters';

const saveJdMutateAsync = vi.hoisted(() => vi.fn());
const addJdMutateAsync = vi.hoisted(() => vi.fn());
const analyzeJdMutateAsync = vi.hoisted(() => vi.fn());
const deleteJdMutateAsync = vi.hoisted(() => vi.fn());

const jdPageData = vi.hoisted(() => ({
  selectedJd: null as JdItem | null,
  jdList: [] as JdItem[],
}));
const checklistData = vi.hoisted(() => ({
  items: [{ id: 1, job_description_id: 1, content: 'React 실무 경험 확인' }],
}));

function makeJdItem(overrides: Partial<JdItem> = {}): JdItem {
  return {
    id: '1',
    title: '프론트엔드 개발자',
    team: '',
    status: '준비 중',
    statusCode: 'prepare',
    fit: 0,
    stack: [' React ', '   ', 'TypeScript'],
    preferredStack: [' Django ', ''],
    summary: '서비스 개발',
    requiredExperience: '3년 이상',
    employmentType: '정규직',
    educationLevel: '학사',
    major: '컴퓨터공학',
    hiringReason: '확장',
    ...overrides,
  };
}

vi.mock('../hooks/useJdPageData', () => ({
  useJdPageData: () => ({
    jdList: jdPageData.jdList,
    resumes: [],
    selectedJdId: jdPageData.selectedJd?.id ?? null,
    selectedJd: jdPageData.selectedJd,
    setSelectedJdId: vi.fn(),
  }),
}));

vi.mock('../hooks/mutations/useJdMutations', () => ({
  useJdMutations: () => ({
    addJd: { isPending: false, mutateAsync: addJdMutateAsync },
    analyzeJd: { isPending: false, mutateAsync: analyzeJdMutateAsync },
    deleteJd: { isPending: false, mutateAsync: deleteJdMutateAsync },
    saveJd: { isPending: false, mutateAsync: saveJdMutateAsync },
  }),
}));

vi.mock('../hooks/useJdChecklist', () => ({
  useJdChecklist: () => ({
    data: checklistData.items,
    isLoading: false,
  }),
}));

describe('JdPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jdPageData.selectedJd = makeJdItem();
    jdPageData.jdList = [jdPageData.selectedJd];
    saveJdMutateAsync.mockResolvedValue({
      error: false,
      message: '저장되었습니다.',
      data: jdPageData.selectedJd,
    });
  });

  it('저장할 때 필수 기술과 우대 기술 배열의 빈 항목을 제거하고 공백을 정리한다', async () => {
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /저장/ }));

    await waitFor(() => {
      expect(saveJdMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          required_skill: ['React', 'TypeScript'],
          preferred_skill: ['Django'],
        }),
      );
    });
  });

  it('필수 기술이 비어 있으면 저장하지 않고 기존 검증 메시지를 표시한다', async () => {
    jdPageData.selectedJd = makeJdItem({ stack: ['   '], preferredStack: [] });
    jdPageData.jdList = [jdPageData.selectedJd];
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /저장/ }));

    expect(await screen.findByText('필수 기술을 입력하세요.')).toBeInTheDocument();
    expect(saveJdMutateAsync).not.toHaveBeenCalled();
  });

  it('JD 목록을 검색하고 선택된 JD의 checklist를 조회 표시한다', () => {
    const backendJd = makeJdItem({
      id: '2',
      title: '백엔드 개발자',
      status: '진행 중',
      statusCode: 'on_going',
      stack: ['Django'],
      preferredStack: ['PostgreSQL'],
      summary: 'API 서버 개발',
      employmentType: '계약직',
    });
    jdPageData.selectedJd = makeJdItem();
    jdPageData.jdList = [jdPageData.selectedJd, backendJd];

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.getByText('React 실무 경험 확인')).toBeInTheDocument();
    expect(screen.queryByLabelText('JD 상태 필터')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('JD 정렬')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('기술 키워드')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('JD명, 업무, 기술 검색'), { target: { value: 'API 서버' } });

    expect(screen.getByRole('button', { name: '백엔드 개발자 JD 선택' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '프론트엔드 개발자 JD 선택' })).not.toBeInTheDocument();
  });
});
