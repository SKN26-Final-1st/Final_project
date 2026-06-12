import { Bubble, Sender, type BubbleItemType } from '@ant-design/x';
import { InlineLoading } from '../common/InlineLoading';
import type { ChatMessage } from '../../data/mockData';

type ChatWindowPanelProps = {
  chatMessages: ChatMessage[];
  chatInput: string;
  loadingKey: string | null;
  assistantLabel?: string;
  inputPlaceholder?: string;
  loadingLabel?: string;
  userLabel?: string;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
};

export function ChatWindowPanel({
  chatMessages,
  chatInput,
  loadingKey,
  assistantLabel = 'HumouR AI',
  inputPlaceholder = '리포트에 대해 질문하기',
  loadingLabel = '답변 생성 중',
  userLabel = '채용 담당자',
  setChatInput,
  sendChatMessage,
}: ChatWindowPanelProps) {
  const bubbleItems: BubbleItemType[] = chatMessages.map((message, index) => ({
    key: `${message.role}-${index}`,
    role: message.role === 'assistant' ? 'ai' : 'user',
    content: message.text,
    header: message.role === 'assistant' ? assistantLabel : userLabel,
  }));

  if (loadingKey === 'chat') {
    bubbleItems.push({
      key: 'chat-loading',
      role: 'ai',
      content: loadingLabel,
      header: assistantLabel,
      loading: true,
      loadingRender: () => <InlineLoading label={loadingLabel} />,
      status: 'loading',
    });
  }

  return (
    <>
      <div className="chat-window">
        <Bubble.List
          autoScroll
          items={bubbleItems}
          role={{
            ai: {
              className: 'chat-bubble-x assistant',
              placement: 'start',
              shape: 'round',
              typing: { effect: 'fade-in' },
              variant: 'shadow',
            },
            user: {
              className: 'chat-bubble-x user',
              placement: 'end',
              shape: 'round',
              variant: 'filled',
            },
          }}
        />
      </div>
      <div className="chat-input-row">
        <Sender
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loadingKey === 'chat'}
          loading={loadingKey === 'chat'}
          onChange={setChatInput}
          onSubmit={() => sendChatMessage()}
          placeholder={inputPlaceholder}
          submitType="enter"
          value={chatInput}
        />
      </div>
    </>
  );
}
