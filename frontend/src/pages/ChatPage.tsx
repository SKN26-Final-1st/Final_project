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
  const { analysisReport, analysisReports, interviewQuestions, jdList, resumes } = useChatPageData();
  const { chatInput, chatMessages, loadingKey, resetChatMessages, sendChatMessage, setChatInput } =
    useDocumentChatState();

  return (
    <>
      <PageTitle
        eyebrow="AI Document Search"
        title="AI 채팅"
        description="현재 계정의 JD, 분석 리포트, 면접 질문과 사용 가이드를 바탕으로 질문합니다."
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
              chatMessages={chatMessages.length ? chatMessages : analysisReport?.chatMessages ?? []}
              chatInput={chatInput}
              loadingKey={loadingKey}
              inputPlaceholder="사내 문서에 대해 질문하기"
              loadingLabel="문서 검색 중"
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
            />
          </SectionCard>
        </Col>
      </Row>
    </>
  );
}
