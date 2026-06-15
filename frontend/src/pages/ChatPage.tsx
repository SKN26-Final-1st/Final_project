import type { Dispatch, SetStateAction } from 'react';
import { Button, Col, Row } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ChatWindowPanel } from '../components/chat/ChatWindowPanel';
import { DocumentSearchContextPanel } from '../components/chat/DocumentSearchContextPanel';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { AnalysisReportData } from '../api/adapters';
import type { JdItem } from '../api/adapters';
import type { ChatMessage } from '../data/appConfig';
import type { AnalysisReport, InterviewQuestion, Resume } from '../data/backendTypes';
import { pageSectionGutter } from '../utils/layout';

type ChatPageProps = {
  report: AnalysisReportData;
  chatMessages: ChatMessage[];
  chatInput: string;
  loadingKey: string | null;
  jdList: JdItem[];
  resumes: Resume[];
  analysisReports: AnalysisReport[];
  interviewQuestions: InterviewQuestion[];
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setChatInput: (value: string) => void;
  sendChatMessage: () => void;
};

export function ChatPage({
  report,
  chatMessages,
  chatInput,
  loadingKey,
  jdList,
  resumes,
  analysisReports,
  interviewQuestions,
  setChatMessages,
  setChatInput,
  sendChatMessage,
}: ChatPageProps) {
  return (
    <>
      <PageTitle
        eyebrow="AI Document Search"
        title="AI 채팅"
        description="현재 계정의 JD, 분석 리포트, 면접 질문과 사용 가이드를 바탕으로 질문합니다."
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => setChatMessages(report.chatMessages)}>
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
