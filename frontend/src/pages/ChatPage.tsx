import type { Dispatch, SetStateAction } from 'react';
import { Button, Col, Row } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ChatWindowPanel } from '../components/chat/ChatWindowPanel';
import { DocumentSearchContextPanel } from '../components/chat/DocumentSearchContextPanel';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { AnalysisReportData } from '../api/adapters';
import type { ChatMessage } from '../data/mockData';

type ChatPageProps = {
  report: AnalysisReportData;
  chatMessages: ChatMessage[];
  chatInput: string;
  loadingKey: string | null;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
};

export function ChatPage({
  report,
  chatMessages,
  chatInput,
  loadingKey,
  setChatMessages,
  setChatInput,
  sendChatMessage,
}: ChatPageProps) {
  return (
    <>
      <PageTitle
        eyebrow="AI Document Search"
        title="AI 문서 검색"
        description="사내 정책, JD, 채용 운영 가이드, 분석 리포트를 출처 기반 답변으로 검색합니다."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => setChatMessages(report.chatMessages)}>
            대화 초기화
          </Button>
        }
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={9}>
          <SectionCard title="검색 컨텍스트">
            <DocumentSearchContextPanel setChatInput={setChatInput} />
          </SectionCard>
        </Col>
        <Col xs={24} xl={15}>
          <SectionCard title="문서 검색 채팅">
            <ChatWindowPanel
              chatMessages={chatMessages}
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
