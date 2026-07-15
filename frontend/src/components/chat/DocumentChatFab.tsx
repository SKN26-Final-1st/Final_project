import { useMemo, useState } from 'react';
import { Bubble, Prompts, Sender, Sources, type BubbleItemType } from '@ant-design/x';
import { Button } from 'antd';
import {
  BookOutlined,
  CloseOutlined,
  FileSearchOutlined,
  FullscreenOutlined,
  MinusOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { InlineLoading } from '../common/InlineLoading';
import { useChatPageData } from '../../hooks/useChatPageData';
import { useDocumentChatState } from '../../hooks/useDocumentChatState';
import type { Navigate } from '../../types/app';
import {
  buildChatContextData,
  chatScopeOptions,
  filterChatContextItems,
  type ChatContextScope,
} from './chatContextData';

type DocumentChatFabProps = {
  navigate: Navigate;
};

export function DocumentChatFab({ navigate }: DocumentChatFabProps) {
  const { analysisReports, interviewQuestions, jdList, resumes } = useChatPageData();
  const { chatInput, chatMessages, loadingKey, sendChatMessage, setChatInput } = useDocumentChatState();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ChatContextScope>('all');
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const contextData = useMemo(
    () => buildChatContextData({ jdList, resumes, analysisReports, interviewQuestions }),
    [analysisReports, interviewQuestions, jdList, resumes],
  );
  const visibleSources = filterChatContextItems(contextData.sources, scope);
  const visiblePrompts = filterChatContextItems(contextData.prompts, scope);
  const scopeLabel = chatScopeOptions.find((option) => option.key === scope)?.label ?? '전체';

  const openWidget = () => {
    setOpen(true);
  };

  const openWorkspace = () => {
    setRecommendationsOpen(false);
    setOpen(false);
    navigate('/chat');
  };

  const closeWidget = () => {
    setRecommendationsOpen(false);
    setOpen(false);
  };

  const selectSuggestion = (value: string) => {
    setChatInput(value);
    setRecommendationsOpen(false);
  };

  const selectSource = (payload: unknown) => {
    const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
    const key = String(data.key ?? record.key ?? '');
    const source = visibleSources.find((item) => item.key === key);

    if (source) {
      selectSuggestion(source.title);
    }
  };

  const handleSubmit = () => {
    sendChatMessage();
  };

  const bubbleItems: BubbleItemType[] = [
    {
      key: 'document-intro',
      role: 'ai',
      content: '현재 계정의 JD와 사용 가이드를 기준으로 답변합니다. 리포트와 면접 질문은 리포트 화면에서 확인해주세요.',
      header: 'HumouR AI',
    },
    ...chatMessages.map((message, index) => ({
      key: `${message.role}-${index}`,
      role: message.role === 'assistant' ? 'ai' : 'user',
      content: message.text,
      header: message.role === 'assistant' ? 'HumouR AI' : '채용 담당자',
    })),
  ];

  if (loadingKey === 'chat') {
    bubbleItems.push({
      key: 'document-chat-loading',
      role: 'ai',
      content: '답변을 준비하는 중',
      header: 'HumouR AI',
      loading: true,
      loadingRender: () => <InlineLoading label="답변 준비 중" />,
      status: 'loading',
    });
  }

  return (
    <>
      {!open && (
        <Button
          className="document-chat-fab"
          type="primary"
          onClick={openWidget}
          aria-expanded={open}
          aria-label="AI 채팅 위젯 열기"
        >
          <span className="document-chat-fab-icon">
            <ThunderboltOutlined />
          </span>
          <span className="document-chat-fab-text">AI 채팅</span>
        </Button>
      )}

      {open && (
        <section
          className={`document-chat-widget ${recommendationsOpen ? 'recommendations-open' : ''}`}
          role="dialog"
          aria-modal="false"
          aria-labelledby="document-chat-widget-title"
        >
          <button
            className="document-chat-recommendation-toggle"
            type="button"
            aria-controls="document-chat-recommendation-panel"
            aria-expanded={recommendationsOpen}
            onClick={() => setRecommendationsOpen((current) => !current)}
          >
            <FileSearchOutlined />
            <span>추천</span>
          </button>

          <aside
            id="document-chat-recommendation-panel"
            className="document-chat-recommendation-panel"
            aria-hidden={!recommendationsOpen}
          >
            <div className="document-recommendation-panel-head">
              <div>
                <strong>추천 자료</strong>
                <span>AI 답변에 참조할 수 있는 JD만 표시합니다.</span>
              </div>
              <Button
                aria-label="추천 자료 닫기"
                shape="circle"
                icon={<CloseOutlined />}
                onClick={() => setRecommendationsOpen(false)}
              />
            </div>

            <div className="document-recommendation-section">
              <span>추천 분류</span>
              <strong>{scopeLabel}</strong>
              <p>선택한 분류에 맞춰 아래 추천 자료와 빠른 질문만 정리합니다.</p>
            </div>

            <Sources
              className="document-source-stack"
              items={visibleSources}
              onClick={selectSource}
              title={
                <span className="document-source-title">
                  <FileSearchOutlined />
                  <strong>추천 참조 데이터</strong>
                </span>
              }
            />
            {!visibleSources.length && <p className="document-empty-note">해당 분류에 표시할 데이터가 없습니다.</p>}

            <Prompts
              className="document-quick-actions"
              items={visiblePrompts.map((prompt) => ({
                key: prompt.key,
                label: prompt.label,
              }))}
              onItemClick={({ data }) => selectSuggestion(String(data.label ?? data.key))}
              title="빠른 질문"
              wrap
            />
            {!visiblePrompts.length && <p className="document-empty-note">추천 질문으로 만들 실제 데이터가 없습니다.</p>}
          </aside>

          <div className="document-chat-widget-main">
            <div className="document-chat-widget-header">
              <span className="document-chat-avatar">
                <BookOutlined />
              </span>
              <div className="document-chat-widget-title">
                <strong id="document-chat-widget-title">AI 채팅</strong>
                <span>JD와 사용 가이드 기반 질의응답</span>
              </div>
              <div className="document-chat-widget-actions">
                <Button aria-label="전체 화면에서 열기" shape="circle" icon={<FullscreenOutlined />} onClick={openWorkspace} />
                <Button aria-label="위젯 최소화" shape="circle" icon={<MinusOutlined />} onClick={closeWidget} />
                <Button aria-label="위젯 닫기" shape="circle" icon={<CloseOutlined />} onClick={closeWidget} />
              </div>
            </div>

            <div className="document-chat-widget-body">
              <div className="document-scope-row" role="tablist" aria-label="추천 분류">
                {chatScopeOptions.map((option) => (
                  <button
                    key={option.key}
                    className={`document-scope-chip ${scope === option.key ? 'active' : ''}`}
                    onClick={() => setScope(option.key)}
                    type="button"
                    role="tab"
                    aria-selected={scope === option.key}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="document-chat-window">
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
            </div>

            <div className="document-chat-input-row">
              <Sender
                autoSize={{ minRows: 1, maxRows: 3 }}
                disabled={loadingKey === 'chat'}
                loading={loadingKey === 'chat'}
                onChange={setChatInput}
                onSubmit={handleSubmit}
                placeholder="JD와 사용 가이드에 대해 질문하기"
                submitType="enter"
                value={chatInput}
              />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
