import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentChatProvider, useDocumentChatState } from './useDocumentChatState';
import type { RunApiAction } from '../types/app';

function ChatHarness() {
  const { chatInput, chatMessages, sendChatMessage, setChatInput } = useDocumentChatState();

  return (
    <div>
      <input aria-label="chat-input" value={chatInput} onChange={(event) => setChatInput(event.target.value)} />
      <button type="button" onClick={sendChatMessage}>
        send
      </button>
      <output aria-label="messages">{chatMessages.map((message) => message.text).join('|')}</output>
    </div>
  );
}

describe('useDocumentChatState', () => {
  it('채팅 API 실패 시 optimistic user message를 제거하고 입력값을 복구한다', async () => {
    const user = userEvent.setup();
    const runApiAction: RunApiAction = async (_key, _action, _afterComplete, onError) => {
      onError?.('fail', new Error('fail'));
    };

    render(
      <DocumentChatProvider loadingKey={null} runApiAction={runApiAction} showAlert={vi.fn()}>
        <ChatHarness />
      </DocumentChatProvider>,
    );

    await user.type(screen.getByLabelText('chat-input'), '분석 결과 알려줘');
    await user.click(screen.getByRole('button', { name: 'send' }));

    expect(screen.getByLabelText('messages')).toHaveTextContent('');
    expect(screen.getByLabelText('chat-input')).toHaveValue('분석 결과 알려줘');
  });
});
