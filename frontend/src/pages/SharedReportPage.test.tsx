import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobDescription, Resume } from '../data/backendTypes';
import { SharedReportPage } from './SharedReportPage';

const getSharedResumeBundle = vi.hoisted(() => vi.fn());
const sendChatMessage = vi.hoisted(() => vi.fn());

vi.mock('../api/backendClient', () => ({
  apiClient: {
    getSharedResumeBundle,
    sendChatMessage,
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function createResume(id: number, name: string): Resume {
  return {
    id,
    job_description_id: id,
    name,
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
}

function createJobDescription(id: number): JobDescription {
  return {
    id,
    job_name: `JD ${id}`,
    education_level: '',
    major: '',
    career_level: '',
    required_skill: [],
    preferred_skill: [],
    main_task: '',
    hiring_reason: '',
    work_type: '',
    status: 'on_going',
    checklist_status: 'done',
    created_at: '',
    updated_at: '',
  };
}

function sharedResponse(id: number, name: string) {
  const jobDescription = createJobDescription(id);

  return {
    error: false,
    data: {
      resume: createResume(id, name),
      jobDescription,
      jobDescriptions: [jobDescription],
      reports: [],
      questions: [],
    },
  };
}

function renderSharedReport() {
  return render(
    <MemoryRouter initialEntries={['/shared']}>
      <SharedReportPage mode="light" navigate={vi.fn()} themeSwitch={<span>theme</span>} />
    </MemoryRouter>,
  );
}

async function fillSharedLookup(user: ReturnType<typeof userEvent.setup>, resumeId: string, apiKey: string) {
  const resumeInput = screen.getByRole('spinbutton', { name: 'Resume ID' });
  const apiKeyInput = screen.getByLabelText('API Key');
  await user.clear(resumeInput);
  await user.type(resumeInput, resumeId);
  await user.clear(apiKeyInput);
  await user.type(apiKeyInput, apiKey);
}

describe('SharedReportPage request cancellation', () => {
  beforeEach(() => {
    getSharedResumeBundle.mockReset();
    sendChatMessage.mockReset();
  });

  it('aborts an older lookup and ignores its late response', async () => {
    const first = createDeferred<ReturnType<typeof sharedResponse>>();
    const second = createDeferred<ReturnType<typeof sharedResponse>>();
    getSharedResumeBundle
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const user = userEvent.setup();
    const { container } = renderSharedReport();

    await fillSharedLookup(user, '1', 'first-key');
    await user.click(screen.getByRole('button', { name: /결과 조회/ }));
    await waitFor(() => {
      expect(getSharedResumeBundle).toHaveBeenCalledTimes(1);
    });
    const firstSignal = getSharedResumeBundle.mock.calls[0][2].signal as AbortSignal;

    await fillSharedLookup(user, '2', 'second-key');
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(getSharedResumeBundle).toHaveBeenCalledTimes(2);
    });
    expect(firstSignal.aborted).toBe(true);

    await act(async () => {
      second.resolve(sharedResponse(2, '두 번째 지원자'));
    });
    expect(await screen.findByText('두 번째 지원자')).toBeInTheDocument();

    await act(async () => {
      first.resolve(sharedResponse(1, '늦게 도착한 첫 번째 지원자'));
    });
    expect(screen.queryByText('늦게 도착한 첫 번째 지원자')).not.toBeInTheDocument();
  });

  it('aborts shared chat when the page unmounts', async () => {
    getSharedResumeBundle.mockResolvedValue(sharedResponse(1, '공유 지원자'));
    sendChatMessage.mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    const view = renderSharedReport();

    await fillSharedLookup(user, '1', 'shared-key');
    await user.click(screen.getByRole('button', { name: /결과 조회/ }));
    expect(await screen.findByText('공유 지원자')).toBeInTheDocument();
    const apiKeyInput = screen.getByLabelText('API Key');
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'unverified-edited-key');
    await user.click(screen.getByRole('tab', { name: 'AI 채팅' }));
    await user.type(screen.getByPlaceholderText('리포트나 질문지에 대해 물어보세요.'), '핵심 강점은?');
    await user.click(screen.getByRole('button', { name: /전송/ }));

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });
    expect(sendChatMessage.mock.calls[0][2]).toBe('shared-key');
    const signal = sendChatMessage.mock.calls[0][3].signal as AbortSignal;

    view.unmount();

    expect(signal.aborted).toBe(true);
  });

  it('clears the previous candidate chat when a new shared bundle is loaded', async () => {
    getSharedResumeBundle
      .mockResolvedValueOnce(sharedResponse(1, '첫 번째 공유 지원자'))
      .mockResolvedValueOnce(sharedResponse(2, '두 번째 공유 지원자'));
    sendChatMessage.mockResolvedValue({
      error: false,
      data: { role: 'assistant', text: '첫 번째 지원자 전용 답변' },
    });
    const user = userEvent.setup();
    renderSharedReport();

    await fillSharedLookup(user, '1', 'first-shared-key');
    await user.click(screen.getByRole('button', { name: /결과 조회/ }));
    expect(await screen.findByText('첫 번째 공유 지원자')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'AI 채팅' }));
    await user.type(screen.getByPlaceholderText('리포트나 질문지에 대해 물어보세요.'), '첫 번째 질문');
    await user.click(screen.getByRole('button', { name: /전송/ }));
    expect(await screen.findByText('첫 번째 지원자 전용 답변')).toBeInTheDocument();

    await fillSharedLookup(user, '2', 'second-shared-key');
    await user.click(screen.getByRole('button', { name: /결과 조회/ }));

    await waitFor(() => {
      expect(getSharedResumeBundle).toHaveBeenCalledTimes(2);
      expect(screen.queryByText('첫 번째 지원자 전용 답변')).not.toBeInTheDocument();
      expect(screen.queryByText('첫 번째 질문')).not.toBeInTheDocument();
    });
    expect(
      screen.getByText('공유 API key로 리포트와 면접 질문을 불러오면 이 화면에서 바로 질문할 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('blocks chat while a different shared bundle is loading', async () => {
    const second = createDeferred<ReturnType<typeof sharedResponse>>();
    getSharedResumeBundle
      .mockResolvedValueOnce(sharedResponse(1, '첫 번째 공유 지원자'))
      .mockImplementationOnce(() => second.promise);
    const user = userEvent.setup();
    renderSharedReport();

    await fillSharedLookup(user, '1', 'first-shared-key');
    await user.click(screen.getByRole('button', { name: /결과 조회/ }));
    expect(await screen.findByText('첫 번째 공유 지원자')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'AI 채팅' }));

    await fillSharedLookup(user, '2', 'second-shared-key');
    await user.click(screen.getByRole('button', { name: /결과 조회/ }));

    expect(screen.getByPlaceholderText('리포트나 질문지에 대해 물어보세요.')).toBeDisabled();
    expect(screen.getByRole('button', { name: /전송/ })).toBeDisabled();
    expect(sendChatMessage).not.toHaveBeenCalled();
  });
});
