import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Drawer, Input, Space, Tag } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { apiClient } from '../../api/backendClient';
import type { JdItem } from '../../api/adapters';
import type { ChatMessage } from '../../data/appConfig';

const { TextArea } = Input;

type JdChatState = Parameters<typeof apiClient.sendJdChatMessage>[0]['state'];

type JdChatDrawerProps = {
  open: boolean;
  selectedJd: JdItem | null;
  onClose: () => void;
  onRefresh: () => Promise<unknown>;
};

export function JdChatDrawer({ open, selectedJd, onClose, onRefresh }: JdChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<JdChatState>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const startedJdIdRef = useRef<string | null>(null);
  const isCompleted = Boolean(state?.end_chat);

  const sendMessages = useCallback(async (nextMessages: ChatMessage[]) => {
    if (!selectedJd) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await apiClient.sendJdChatMessage({
        jobDescriptionId: Number(selectedJd.id),
        messages: nextMessages,
        state,
      });
      setMessages([...nextMessages, response.data.response]);
      setState(response.data.state);
      await onRefresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'JD 채팅 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onRefresh, selectedJd, state]);

  useEffect(() => {
    if (!open || !selectedJd) {
      return;
    }

    if (startedJdIdRef.current === selectedJd.id) {
      return;
    }

    startedJdIdRef.current = selectedJd.id;
    setMessages([]);
    setState(undefined);
    setInput('');
    void sendMessages([]);
  }, [open, selectedJd, sendMessages]);

  const submitMessage = async () => {
    const text = input.trim();

    if (!text || loading || !selectedJd) {
      return;
    }

    const nextMessages = [...messages, { role: 'user', text } satisfies ChatMessage];
    setMessages(nextMessages);
    setInput('');
    await sendMessages(nextMessages);
  };

  const closeDrawer = () => {
    setErrorMessage('');
    onClose();
  };

  return (
    <Drawer
      className="jd-chat-drawer"
      destroyOnClose
      open={open}
      title="채팅으로 JD 작성"
      width={520}
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

          <div className="jd-chat-messages" aria-label="JD 채팅 메시지">
            {messages.map((message, index) => (
              <div className={`jd-chat-message jd-chat-message--${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === 'user' ? '나' : 'HumouR AI'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {!messages.length && loading ? <p className="muted">JD 작성 대화를 준비하고 있습니다.</p> : null}
          </div>

          <Space.Compact className="jd-chat-input-row">
            <TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={loading || isCompleted}
              placeholder="JD에 반영할 내용을 입력하세요."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              disabled={!input.trim() || isCompleted}
              loading={loading}
              onClick={() => void submitMessage()}
            >
              전송
            </Button>
          </Space.Compact>
        </div>
      ) : (
        <Alert showIcon type="warning" message="먼저 저장된 JD를 선택해주세요." />
      )}
    </Drawer>
  );
}
