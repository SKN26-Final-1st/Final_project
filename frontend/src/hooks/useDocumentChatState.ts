import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { apiClient } from '../api/backendClient';
import type { ChatMessage } from '../data/appConfig';
import type { RunApiAction, ShowAlert } from '../types/app';

type DocumentChatState = {
  chatInput: string;
  chatMessages: ChatMessage[];
  loadingKey: string | null;
  resetChatMessages: () => void;
  sendChatMessage: () => void;
  setChatInput: (value: string) => void;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
};

type DocumentChatProviderProps = {
  children: ReactNode;
  defaultMessages?: ChatMessage[];
  loadingKey: string | null;
  runApiAction: RunApiAction;
  showAlert: ShowAlert;
};

const DocumentChatContext = createContext<DocumentChatState | null>(null);

function useDocumentChatController({
  defaultMessages = [],
  loadingKey,
  runApiAction,
  showAlert,
}: Omit<DocumentChatProviderProps, 'children'>): DocumentChatState {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const activeChatMessages = useMemo(
    () => (chatMessages.length ? chatMessages : defaultMessages),
    [chatMessages, defaultMessages],
  );

  const resetChatMessages = useCallback(() => {
    setChatMessages(defaultMessages);
  }, [defaultMessages]);

  const sendChatMessage = useCallback(() => {
    if (loadingKey === 'chat') {
      return;
    }

    const trimmed = chatInput.trim();
    if (!trimmed) {
      showAlert({ type: 'warning', message: '빈 메시지는 전송할 수 없습니다.' });
      return;
    }

    const nextChatMessages: ChatMessage[] = [...activeChatMessages, { role: 'user', text: trimmed }];
    setChatMessages(nextChatMessages);
    setChatInput('');
    void runApiAction(
      'chat',
      () => apiClient.sendChatMessage(trimmed, nextChatMessages),
      (response) => setChatMessages((prev) => [...prev, response.data]),
      () => {
        setChatMessages((prev) => prev.slice(0, -1));
        setChatInput(trimmed);
      },
    );
  }, [activeChatMessages, chatInput, loadingKey, runApiAction, showAlert]);

  return {
    chatInput,
    chatMessages: activeChatMessages,
    loadingKey,
    resetChatMessages,
    sendChatMessage,
    setChatInput,
    setChatMessages,
  };
}

export function DocumentChatProvider({
  children,
  defaultMessages,
  loadingKey,
  runApiAction,
  showAlert,
}: DocumentChatProviderProps) {
  const value = useDocumentChatController({ defaultMessages, loadingKey, runApiAction, showAlert });

  return createElement(DocumentChatContext.Provider, { value }, children);
}

export function useDocumentChatState() {
  const context = useContext(DocumentChatContext);

  if (!context) {
    throw new Error('useDocumentChatState must be used inside DocumentChatProvider.');
  }

  return context;
}
