import { Bubble, Sender, type BubbleItemType } from '@ant-design/x';
import { InlineLoading } from '../common/InlineLoading';
import type { ChatMessage } from '../../data/appConfig';

type ChatWindowPanelProps = {
  chatMessages: ChatMessage[];
  chatInput: string;
  loadingKey: string | null;
  assistantLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  inputPlaceholder?: string;
  loadingLabel?: string;
  suggestedQuestions?: string[];
  userLabel?: string;
  onSuggestionSelect?: (question: string) => void;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
};

export function ChatWindowPanel({
  chatMessages,
  chatInput,
  loadingKey,
  assistantLabel = 'HumouR AI',
  emptyDescription = '현재 계정에서 조회 가능한 JD와 사용 가이드를 기준으로 답변합니다.',
  emptyTitle = '추천 질문으로 대화를 시작해보세요.',
  inputPlaceholder = '문서에 대해 질문하기',
  loadingLabel = '답변 생성 중',
  suggestedQuestions = [],
  userLabel = '채용 담당자',
  onSuggestionSelect,
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
    <div className="chat-window-panel">
      <div className="chat-window">
        {bubbleItems.length ? (
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
        ) : (
          <div className="chat-empty-state">
            <strong>{emptyTitle}</strong>
            <p>{emptyDescription}</p>
            {suggestedQuestions.length > 0 && (
              <div className="chat-empty-suggestions" aria-label="추천 질문">
                {suggestedQuestions.slice(0, 3).map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="chat-empty-suggestion"
                    onClick={() => onSuggestionSelect?.(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
    </div>
  );
}
