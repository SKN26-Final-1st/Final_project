import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JdPage } from './JdPage';
import type { JdItem } from '../api/adapters';
import type { Resume } from '../data/backendTypes';
import { AuthSessionProvider } from '../hooks/AuthSessionProvider';
import { getAuthCapabilities } from '../utils/authCapabilities';

const saveJdMutateAsync = vi.hoisted(() => vi.fn());
const addJdMutateAsync = vi.hoisted(() => vi.fn());
const analyzeJdMutateAsync = vi.hoisted(() => vi.fn());
const generateChecklistMutateAsync = vi.hoisted(() => vi.fn());
const refreshChecklistFailureMutateAsync = vi.hoisted(() => vi.fn());
const addChecklistMutateAsync = vi.hoisted(() => vi.fn());
const updateChecklistMutateAsync = vi.hoisted(() => vi.fn());
const deleteChecklistMutateAsync = vi.hoisted(() => vi.fn());
const deleteJdMutateAsync = vi.hoisted(() => vi.fn());

const jdPageData = vi.hoisted(() => ({
  selectedJd: null as JdItem | null,
  jdList: [] as JdItem[],
  resumes: [] as Resume[],
}));
const checklistData = vi.hoisted(() => ({
  items: [{ id: 1, job_description_id: 1, content: 'React 실무 경험 확인' }],
}));
const defaultChecklistItems = checklistData.items;
const checklistQueryState = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
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
    checklistStatus: 'done',
    ...overrides,
  };
}

vi.mock('../hooks/useJdPageData', () => ({
  useJdPageData: () => ({
    jdList: jdPageData.jdList,
    resumes: jdPageData.resumes,
    selectedJdId: jdPageData.selectedJd?.id ?? null,
    selectedJd: jdPageData.selectedJd,
    setSelectedJdId: vi.fn(),
  }),
}));

vi.mock('../hooks/mutations/useJdMutations', () => ({
  useJdMutations: () => ({
    addJd: { isPending: false, mutateAsync: addJdMutateAsync },
    analyzeJd: { isPending: false, mutateAsync: analyzeJdMutateAsync },
    addChecklist: { isPending: false, mutateAsync: addChecklistMutateAsync },
    deleteJd: { isPending: false, mutateAsync: deleteJdMutateAsync },
    deleteChecklist: { isPending: false, mutateAsync: deleteChecklistMutateAsync },
    generateChecklist: { isPending: false, mutateAsync: generateChecklistMutateAsync },
    refreshChecklistFailure: { isPending: false, mutateAsync: refreshChecklistFailureMutateAsync },
    saveJd: { isPending: false, mutateAsync: saveJdMutateAsync },
    updateChecklist: { isPending: false, mutateAsync: updateChecklistMutateAsync },
  }),
}));

vi.mock('../hooks/useJdChecklist', () => ({
  useJdChecklist: () => ({
    data: checklistData.items,
    isLoading: checklistQueryState.isLoading,
    isError: checklistQueryState.isError,
  }),
}));

describe('JdPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jdPageData.selectedJd = makeJdItem();
    jdPageData.jdList = [jdPageData.selectedJd];
    jdPageData.resumes = [];
    checklistData.items = [...defaultChecklistItems];
    checklistQueryState.isLoading = false;
    checklistQueryState.isError = false;
    saveJdMutateAsync.mockResolvedValue({
      error: false,
      message: '저장되었습니다.',
      data: jdPageData.selectedJd,
    });
    addChecklistMutateAsync.mockResolvedValue({
      error: false,
      message: '체크리스트를 추가했습니다.',
      data: { id: 2, job_description_id: 1, content: 'TypeScript 이해도 확인' },
    });
    updateChecklistMutateAsync.mockResolvedValue({
      error: false,
      message: '체크리스트를 수정했습니다.',
      data: { id: 1, job_description_id: 1, content: 'React 프로젝트 경험 확인' },
    });
    deleteChecklistMutateAsync.mockResolvedValue({
      error: false,
      message: '체크리스트를 삭제했습니다.',
      data: checklistData.items[0],
    });
    refreshChecklistFailureMutateAsync.mockResolvedValue({
      error: false,
      message: '체크리스트 실패 상태를 확인했습니다.',
      data: { id: 1, checklist_status: 'done' },
    });
  });

  it('API Key 모드에서는 생성 UI를 숨기고 기존 JD 편집·분석 UI는 유지한다', () => {
    render(
      <AuthSessionProvider
        value={{
          apiKey: 'api-key-secret',
          authMode: 'apiKey',
          authSessionKey: 'opaque-jd-session',
          capabilities: getAuthCapabilities('apiKey'),
        }}
      >
        <JdPage navigate={vi.fn()} showAlert={vi.fn()} />
      </AuthSessionProvider>,
    );

    expect(screen.queryByText('새 JD 작성')).not.toBeInTheDocument();
    expect(screen.queryByText('채팅으로 JD 작성')).not.toBeInTheDocument();
    expect(screen.queryByText('체크리스트 추가')).not.toBeInTheDocument();
    expect(screen.getByText('저장')).toBeInTheDocument();
    expect(screen.getByText('체크리스트 분석 요청')).toBeInTheDocument();
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

    expect(screen.getByLabelText('백엔드 개발자 JD 선택')).toBeInTheDocument();
    expect(screen.queryByLabelText('프론트엔드 개발자 JD 선택')).not.toBeInTheDocument();
  });

  it('선택된 JD의 체크리스트 생성을 요청한다', async () => {
    const user = userEvent.setup();
    generateChecklistMutateAsync.mockResolvedValue({
      error: false,
      message: '체크리스트를 생성했습니다.',
      data: checklistData.items,
    });

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /체크리스트 분석 요청/ }));

    expect(generateChecklistMutateAsync).toHaveBeenCalledWith({
      jdId: 1,
      query: '',
      cnt: 0,
    });
  });

  it('체크리스트 생성 실패 상태에서는 확인 후 상태 복구를 요청한다', async () => {
    jdPageData.selectedJd = makeJdItem({ checklistStatus: 'fail' });
    jdPageData.jdList = [jdPageData.selectedJd];
    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.getByRole('button', { name: /체크리스트 분석 요청/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '확인했습니다' }));

    expect(refreshChecklistFailureMutateAsync).toHaveBeenCalledWith(1);
    expect(generateChecklistMutateAsync).not.toHaveBeenCalled();
  });

  it('체크리스트 생성 처리 중인 JD는 삭제 모달을 열지 않는다', async () => {
    jdPageData.selectedJd = makeJdItem({ checklistStatus: 'processing' });
    jdPageData.jdList = [jdPageData.selectedJd];
    const showAlert = vi.fn();
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={showAlert} />);

    await user.click(screen.getByRole('button', { name: `${jdPageData.selectedJd.title} 삭제` }));

    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        message: '체크리스트 생성이 진행 중이라 JD 삭제가 잠겼습니다. 완료 후 다시 시도해주세요.',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('체크리스트가 없는 JD는 지원서 분석 요청을 막는다', () => {
    jdPageData.resumes = [
      {
        id: 9,
        job_description_id: 1,
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
        created_at: '',
        updated_at: '',
      },
    ];
    checklistData.items = [];

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    const analyzeButton = screen.getByRole('button', { name: /지원서 분석 요청/ });
    expect(analyzeButton).toBeDisabled();
    expect(analyzeButton).toHaveAttribute('title', '지원서 분석 전에 JD 체크리스트를 먼저 생성해주세요.');
  });

  it('새 체크리스트 항목을 추가한다', async () => {
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('체크리스트 항목 입력'), 'TypeScript 이해도 확인');
    await user.click(screen.getByRole('button', { name: '체크리스트 추가' }));

    expect(addChecklistMutateAsync).toHaveBeenCalledWith({
      job_description_id: 1,
      content: 'TypeScript 이해도 확인',
    });
  });

  it('빈 체크리스트 항목은 추가하지 않는다', async () => {
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '체크리스트 추가' }));

    expect(screen.getByText('체크리스트 내용을 입력하세요.')).toBeInTheDocument();
    expect(addChecklistMutateAsync).not.toHaveBeenCalled();
  });

  it('기존 체크리스트 항목을 수정 저장한다', async () => {
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'React 실무 경험 확인 수정' }));
    const editInput = screen.getByLabelText('React 실무 경험 확인 수정 내용');
    await user.clear(editInput);
    await user.type(editInput, 'React 프로젝트 경험 확인');
    await user.click(screen.getByRole('button', { name: 'React 실무 경험 확인 저장' }));

    expect(updateChecklistMutateAsync).toHaveBeenCalledWith({
      id: 1,
      job_description_id: 1,
      content: 'React 프로젝트 경험 확인',
    });
  });

  it('빈 체크리스트 수정은 저장하지 않는다', async () => {
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'React 실무 경험 확인 수정' }));
    await user.clear(screen.getByLabelText('React 실무 경험 확인 수정 내용'));
    await user.click(screen.getByRole('button', { name: 'React 실무 경험 확인 저장' }));

    expect(screen.getByText('체크리스트 내용을 입력하세요.')).toBeInTheDocument();
    expect(updateChecklistMutateAsync).not.toHaveBeenCalled();
  });

  it('체크리스트 항목 삭제는 중앙 확인 모달에서 확인한 뒤 실행한다', async () => {
    const user = userEvent.setup();

    render(<JdPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'React 실무 경험 확인 삭제' }));

    expect(screen.getByRole('dialog', { name: '체크리스트 항목을 삭제하시겠습니까?' })).toBeInTheDocument();
    expect(screen.getByText(/이 JD의 이후 지원서 분석 기준에서 제외됩니다/)).toBeInTheDocument();
    expect(screen.getByLabelText('삭제할 체크리스트 항목')).toHaveTextContent('React');

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(deleteChecklistMutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'React 실무 경험 확인 삭제' }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));

    expect(deleteChecklistMutateAsync).toHaveBeenCalledWith({ id: 1, job_description_id: 1 });
  });
});
