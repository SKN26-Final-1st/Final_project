import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JdChatDrawer } from './JdChatDrawer';
import type { JdItem } from '../../api/adapters';
import { BackendRequestError } from '../../api/httpClient';

const sendJdChatMessageMock = vi.hoisted(() => vi.fn());

type MockBubbleItem = {
  className?: string;
  content?: string;
  header?: string;
  key: string;
  loadingRender?: () => ReactNode;
  role?: string;
};

vi.mock('@ant-design/x', () => ({
  Bubble: {
    List: ({ items }: { items: MockBubbleItem[] }) => (
      <div data-testid="bubble-list">
        {items.map((item) => (
          <div className={`chat-bubble-x ${item.role === 'ai' ? 'assistant' : 'user'}`} key={item.key}>
            <span>{item.header}</span>
            <p>{item.loadingRender ? item.loadingRender() : item.content}</p>
          </div>
        ))}
      </div>
    ),
  },
  Sender: ({
    disabled,
    onChange,
    onSubmit,
    placeholder,
    value,
  }: {
    disabled?: boolean;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    value?: string;
  }) => (
    <textarea
      className="ant-sender"
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSubmit?.();
        }
      }}
    />
  ),
}));

vi.mock('../../api/backendClient', () => ({
  apiClient: {
    sendJdChatMessage: sendJdChatMessageMock,
  },
}));

const selectedJd: JdItem = {
  id: '1',
  title: '프론트엔드 개발자',
  team: '',
  status: '진행 중',
  statusCode: 'on_going',
  checklistStatus: 'done',
  fit: 0,
  stack: ['React'],
  preferredStack: [],
  summary: '',
  requiredExperience: '',
  employmentType: '',
  educationLevel: '',
  major: '',
  hiringReason: '',
};

const secondSelectedJd: JdItem = {
  ...selectedJd,
  id: '2',
  title: '백엔드 개발자',
  stack: ['Django'],
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function chatResponse(text: string) {
  return {
    error: false,
    data: {
      response: { role: 'assistant', text },
      state: { focus_field: 'main_task', end_chat: false },
    },
  };
}

describe('JdChatDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendJdChatMessageMock.mockResolvedValue({
      error: false,
      data: {
        response: { role: 'assistant', text: '어떤 JD 항목부터 보완할까요?' },
        state: { focus_field: 'main_task', end_chat: false },
      },
    });
  });

  it('uses the shared chat sender placeholder and Ant Design X bubble labels', async () => {
    render(
      <JdChatDrawer
        open
        selectedJd={selectedJd}
        onClose={vi.fn()}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByPlaceholderText(/JD에 반영할 내용을 입력하세요/)).toBeInTheDocument();
    expect(document.querySelector('.jd-chat-drawer .document-chat-input-row .ant-sender')).toBeInTheDocument();
    expect(document.querySelector('.jd-chat-drawer-title .document-chat-avatar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('HumouR AI')).toBeInTheDocument();
    });
    expect(screen.getByText('어떤 JD 항목부터 보완할까요?')).toBeInTheDocument();
  });

  it('aborts the previous JD request and ignores its stale response after selection changes', async () => {
    const first = createDeferred<ReturnType<typeof chatResponse>>();
    const second = createDeferred<ReturnType<typeof chatResponse>>();
    sendJdChatMessageMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <JdChatDrawer open selectedJd={selectedJd} onClose={vi.fn()} onRefresh={onRefresh} />,
    );

    await waitFor(() => {
      expect(sendJdChatMessageMock).toHaveBeenCalledTimes(1);
    });
    const firstSignal = sendJdChatMessageMock.mock.calls[0][0].signal as AbortSignal;

    rerender(
      <JdChatDrawer open selectedJd={secondSelectedJd} onClose={vi.fn()} onRefresh={onRefresh} />,
    );

    await waitFor(() => {
      expect(sendJdChatMessageMock).toHaveBeenCalledTimes(2);
    });
    expect(firstSignal.aborted).toBe(true);

    await act(async () => {
      second.resolve(chatResponse('두 번째 JD 응답'));
    });
    expect(await screen.findByText('두 번째 JD 응답')).toBeInTheDocument();

    await act(async () => {
      first.resolve(chatResponse('늦게 도착한 첫 번째 JD 응답'));
    });
    expect(screen.queryByText('늦게 도착한 첫 번째 JD 응답')).not.toBeInTheDocument();
  });

  it('aborts an in-flight request when the drawer closes without showing a cancellation error', async () => {
    sendJdChatMessageMock.mockImplementationOnce(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new BackendRequestError('요청이 취소되었습니다.', {
              authFailurePolicy: 'session',
              backendError: false,
              cancelled: true,
              endpoint: 'jd_chat',
              isAuthError: false,
            }));
          });
        }),
    );
    const { rerender } = render(
      <JdChatDrawer open selectedJd={selectedJd} onClose={vi.fn()} onRefresh={vi.fn()} />,
    );

    await waitFor(() => {
      expect(sendJdChatMessageMock).toHaveBeenCalledTimes(1);
    });
    const signal = sendJdChatMessageMock.mock.calls[0][0].signal as AbortSignal;

    rerender(
      <JdChatDrawer open={false} selectedJd={selectedJd} onClose={vi.fn()} onRefresh={vi.fn()} />,
    );

    await waitFor(() => {
      expect(signal.aborted).toBe(true);
    });
    expect(screen.queryByText('요청이 취소되었습니다.')).not.toBeInTheDocument();
  });

  it('starts a changed JD without the previous state and keeps the API Key request context', async () => {
    const second = createDeferred<ReturnType<typeof chatResponse>>();
    sendJdChatMessageMock
      .mockResolvedValueOnce(chatResponse('첫 번째 JD 준비 완료'))
      .mockImplementationOnce(() => second.promise);
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <JdChatDrawer
        apiKey="workspace-api-key"
        open
        selectedJd={selectedJd}
        onClose={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    expect(await screen.findByText('첫 번째 JD 준비 완료')).toBeInTheDocument();

    rerender(
      <JdChatDrawer
        apiKey="workspace-api-key"
        open
        selectedJd={secondSelectedJd}
        onClose={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    await waitFor(() => {
      expect(sendJdChatMessageMock).toHaveBeenCalledTimes(2);
    });
    expect(sendJdChatMessageMock.mock.calls[1][0]).toMatchObject({
      apiKey: 'workspace-api-key',
      jobDescriptionId: 2,
      state: undefined,
    });
  });
});
