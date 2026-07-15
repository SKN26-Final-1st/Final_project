import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Drawer, Tag } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { Bubble, Sender, type BubbleItemType } from '@ant-design/x';
import { apiClient } from '../../api/backendClient';
import { isRequestCancelled } from '../../api/httpClient';
import type { JdItem } from '../../api/adapters';
import type { ChatMessage } from '../../data/appConfig';
import { InlineLoading } from '../common/InlineLoading';

type JdChatState = Parameters<typeof apiClient.sendJdChatMessage>[0]['state'];

type JdChatDrawerProps = {
  apiKey?: string;
  open: boolean;
  selectedJd: JdItem | null;
  onClose: () => void;
  onRefresh: () => Promise<unknown>;
};

export function JdChatDrawer({ apiKey, open, selectedJd, onClose, onRefresh }: JdChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<JdChatState>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const startedJdIdRef = useRef<string | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const isCompleted = Boolean(state?.end_chat);

  const cancelActiveRequest = useCallback(() => {
    requestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
  }, []);

  const sendMessages = useCallback(async (
    nextMessages: ChatMessage[],
    requestState: JdChatState | undefined,
  ) => {
    if (!selectedJd) {
      return;
    }

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    requestControllerRef.current = controller;
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.sendJdChatMessage({
        apiKey,
        jobDescriptionId: Number(selectedJd.id),
        messages: nextMessages,
        signal: controller.signal,
        state: requestState,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      await onRefresh();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setMessages([...nextMessages, response.data.response]);
      setState(response.data.state);
    } catch (error) {
      if (requestId === requestIdRef.current && !isRequestCancelled(error)) {
        setErrorMessage(error instanceof Error ? error.message : 'JD 채팅 요청에 실패했습니다.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [apiKey, onRefresh, selectedJd]);

  useEffect(() => {
    if (!open || !selectedJd) {
      cancelActiveRequest();

      if (!open) {
        startedJdIdRef.current = null;
      }

      return;
    }

    if (startedJdIdRef.current === selectedJd.id) {
      return;
    }

    startedJdIdRef.current = selectedJd.id;
    setMessages([]);
    setState(undefined);
    setInput('');
    void sendMessages([], undefined);
  }, [cancelActiveRequest, open, selectedJd, sendMessages]);

  useEffect(() => () => cancelActiveRequest(), [cancelActiveRequest]);

  const submitMessage = async () => {
    const text = input.trim();

    if (!text || loading || isCompleted || !selectedJd) {
      return;
    }

    const nextMessages = [...messages, { role: 'user', text } satisfies ChatMessage];
    setMessages(nextMessages);
    setInput('');
    await sendMessages(nextMessages, state);
  };

  const closeDrawer = () => {
    cancelActiveRequest();
    startedJdIdRef.current = null;
    setLoading(false);
    setErrorMessage('');
    onClose();
  };

  const bubbleItems: BubbleItemType[] = messages.map((message, index) => ({
    key: `${message.role}-${index}`,
    role: message.role === 'assistant' ? 'ai' : 'user',
    content: message.text,
    header: message.role === 'assistant' ? 'HumouR AI' : '채용 담당자',
  }));

  if (loading) {
    bubbleItems.push({
      key: 'jd-chat-loading',
      role: 'ai',
      content: 'JD 내용을 정리하는 중',
      header: 'HumouR AI',
      loading: true,
      loadingRender: () => <InlineLoading label="JD 내용을 정리하는 중" />,
      status: 'loading',
    });
  }

  return (
    <Drawer
      className="jd-chat-drawer"
      destroyOnClose
      open={open}
      rootClassName="jd-chat-drawer-root"
      size="large"
      title={(
        <span className="jd-chat-drawer-title">
          <span className="document-chat-avatar jd-chat-title-icon">
            <BookOutlined />
          </span>
          <span className="jd-chat-drawer-title-copy">
            <strong>채팅으로 JD 작성</strong>
            <span>JD 항목을 대화로 정리합니다.</span>
          </span>
        </span>
      )}
      onClose={closeDrawer}
    >
      {selectedJd ? (
        <div className="jd-chat-panel">
          <div className="jd-chat-context">
            <strong>{selectedJd.title}</strong>
            <span>비어 있거나 보완이 필요한 JD 항목을 대화로 정리합니다.</span>
            {state?.focus_field ? <Tag color="blue">현재 항목 {String(state.focus_field)}</Tag> : null}
          </div>

          {errorMessage ? <Alert showIcon type="error" message={errorMessage} /> : null}
          {isCompleted ? <Alert showIcon type="success" message="JD 입력이 완료되었습니다. 변경된 내용은 JD 폼에서 확인할 수 있습니다." /> : null}

          <div className="jd-chat-window-panel chat-window-panel">
            <div className="jd-chat-window chat-window" aria-label="JD 채팅 메시지">
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
                  <strong>JD 작성 대화를 준비하고 있습니다.</strong>
                  <p>저장된 JD를 기준으로 비어 있거나 보완할 항목을 함께 정리합니다.</p>
                </div>
              )}
            </div>
            <div className="document-chat-input-row jd-chat-input-row">
              <Sender
                autoSize={{ minRows: 1, maxRows: 3 }}
                disabled={loading || isCompleted}
                loading={loading}
                onChange={setInput}
                onSubmit={() => void submitMessage()}
                placeholder={isCompleted ? 'JD 입력이 완료되었습니다.' : 'JD에 반영할 내용을 입력하세요'}
                submitType="enter"
                value={input}
              />
            </div>
          </div>
        </div>
      ) : (
        <Alert showIcon type="warning" message="먼저 저장된 JD를 선택해주세요." />
      )}
    </Drawer>
  );
}
