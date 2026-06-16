import { useMemo } from 'react';
import { Button, Col, Row } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ChatWindowPanel } from '../components/chat/ChatWindowPanel';
import { DocumentSearchContextPanel } from '../components/chat/DocumentSearchContextPanel';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import { useChatPageData } from '../hooks/useChatPageData';
import { useDocumentChatState } from '../hooks/useDocumentChatState';
import { pageSectionGutter } from '../utils/layout';

export function ChatPage() {
  const { analysisReports, interviewQuestions, jdList, resumes } = useChatPageData();
  const { chatInput, chatMessages, loadingKey, resetChatMessages, sendChatMessage, setChatInput } =
    useDocumentChatState();
  const suggestedQuestions = useMemo(() => {
    const firstJdTitle = jdList[0]?.title;

    if (firstJdTitle) {
      return [
        `${firstJdTitle} JD에서 핵심 조건을 정리해줘`,
        `${firstJdTitle}에서 면접 때 확인해야 할 포인트를 알려줘`,
        `${firstJdTitle} JD를 기준으로 지원자에게 물어볼 질문을 추천해줘`,
      ];
    }

    return [
      'JD를 등록하면 어떤 질문을 할 수 있나요?',
      '채용 데이터 분석은 어떤 순서로 진행하나요?',
      '자소서와 JD를 연결해 분석하는 방법을 알려줘',
    ];
  }, [jdList]);

  return (
    <>
      <PageTitle
        eyebrow="AI Document Search"
        title="AI 채팅"
        description="현재 계정의 JD와 사용 가이드를 바탕으로 채용 업무 질문에 답변합니다."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => resetChatMessages()}>
            대화 초기화
          </Button>
        }
      />
      <Row className="section-row chat-page-layout-row" gutter={pageSectionGutter}>
        <Col xs={24} xl={9}>
          <SectionCard title="참조 데이터">
            <DocumentSearchContextPanel
              jdList={jdList}
              resumes={resumes}
              analysisReports={analysisReports}
              interviewQuestions={interviewQuestions}
              setChatInput={setChatInput}
            />
          </SectionCard>
        </Col>
        <Col xs={24} xl={15}>
          <SectionCard className="chat-workspace-card" title="문서 검색 채팅">
            <ChatWindowPanel
              chatMessages={chatMessages}
              chatInput={chatInput}
              loadingKey={loadingKey}
              inputPlaceholder="채용 데이터나 사용 방법에 대해 질문하기"
              loadingLabel="문서 검색 중"
              suggestedQuestions={suggestedQuestions}
              onSuggestionSelect={setChatInput}
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
            />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
