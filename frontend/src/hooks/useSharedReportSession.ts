import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/backendClient';
import { isRequestCancelled } from '../api/httpClient';
import { formatReportContext } from '../components/shared-report/sharedReportPresentation';
import type { SharedBundle, SharedLookupValues } from '../components/shared-report/sharedReportTypes';
import type { ChatMessage } from '../data/appConfig';

const SHARED_CHAT_INTRO_MESSAGE: ChatMessage = {
  role: 'assistant',
  text: '공유 API key로 리포트와 면접 질문을 불러오면 이 화면에서 바로 질문할 수 있습니다.',
};

export function useSharedReportSession() {
  const [bundle, setBundle] = useState<SharedBundle | null>(null);
  const [bundleApiKey, setBundleApiKey] = useState('');
  const [bundleLoading, setBundleLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([SHARED_CHAT_INTRO_MESSAGE]);
  const bundleControllerRef = useRef<AbortController | null>(null);
  const bundleRequestIdRef = useRef(0);
  const chatControllerRef = useRef<AbortController | null>(null);
  const chatRequestIdRef = useRef(0);

  const cancelBundleRequest = useCallback(() => {
    bundleRequestIdRef.current += 1;
    bundleControllerRef.current?.abort();
    bundleControllerRef.current = null;
  }, []);

  const cancelChatRequest = useCallback(() => {
    chatRequestIdRef.current += 1;
    chatControllerRef.current?.abort();
    chatControllerRef.current = null;
  }, []);

  useEffect(() => () => {
    cancelBundleRequest();
    cancelChatRequest();
  }, [cancelBundleRequest, cancelChatRequest]);

  const loadSharedBundle = async (values: SharedLookupValues) => {
    cancelBundleRequest();
    cancelChatRequest();
    const controller = new AbortController();
    const requestId = bundleRequestIdRef.current + 1;
    bundleRequestIdRef.current = requestId;
    bundleControllerRef.current = controller;
    setBundleLoading(true);
    setChatLoading(false);
    setError(null);

    try {
      const response = await apiClient.getSharedResumeBundle(
        values.resumeId,
        values.apiKey.trim(),
        { signal: controller.signal },
      );
      if (requestId !== bundleRequestIdRef.current) return;

      cancelChatRequest();
      setBundle(response.data);
      setBundleApiKey(values.apiKey.trim());
      setChatMessages([SHARED_CHAT_INTRO_MESSAGE]);
      setChatInput('');
    } catch (nextError) {
      if (requestId === bundleRequestIdRef.current && !isRequestCancelled(nextError)) {
        setBundle(null);
        setBundleApiKey('');
        setError(nextError instanceof Error ? nextError.message : '공유 결과를 불러오지 못했습니다.');
      }
    } finally {
      if (requestId === bundleRequestIdRef.current) {
        bundleControllerRef.current = null;
        setBundleLoading(false);
      }
    }
  };

  const sendSharedChat = async () => {
    if (!bundle || bundleLoading || chatLoading) return;
    const trimmed = chatInput.trim();
    if (!bundleApiKey || !trimmed) return;

    const visibleUserMessage: ChatMessage = { role: 'user', text: trimmed };
    const contextMessage: ChatMessage = {
      role: 'user',
      text: `${trimmed}\n\n[공유 분석 맥락]\n${formatReportContext(bundle)}`,
    };
    const nextVisibleMessages = [...chatMessages, visibleUserMessage];
    cancelChatRequest();
    const controller = new AbortController();
    const requestId = chatRequestIdRef.current + 1;
    chatRequestIdRef.current = requestId;
    chatControllerRef.current = controller;
    setChatMessages(nextVisibleMessages);
    setChatInput('');
    setChatLoading(true);
    setError(null);

    try {
      const response = await apiClient.sendChatMessage(
        trimmed,
        [...chatMessages, contextMessage],
        bundleApiKey,
        { authFailurePolicy: 'local', signal: controller.signal },
      );
      if (requestId !== chatRequestIdRef.current) return;
      setChatMessages((current) => [...current, response.data]);
    } catch (nextError) {
      if (requestId === chatRequestIdRef.current && !isRequestCancelled(nextError)) {
        setChatMessages(chatMessages);
        setChatInput(trimmed);
        setError(nextError instanceof Error ? nextError.message : '채팅 응답을 불러오지 못했습니다.');
      }
    } finally {
      if (requestId === chatRequestIdRef.current) {
        chatControllerRef.current = null;
        setChatLoading(false);
      }
    }
  };

  return {
    bundle,
    bundleLoading,
    chatInput,
    chatLoading,
    chatMessages,
    error,
    loadSharedBundle,
    sendSharedChat,
    setChatInput,
  };
}
