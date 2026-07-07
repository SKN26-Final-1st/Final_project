import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JdChatDrawer } from './JdChatDrawer';
import type { JdItem } from '../../api/adapters';

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
});
