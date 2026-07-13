import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Input, List, Space, Tabs, Tag, Typography } from 'antd';
import { ReportReadOnlyContent } from '../analysis-report/ReportReadOnlyContent';
import type { ChatMessage } from '../../data/appConfig';
import type { InterviewQuestion } from '../../data/backendTypes';
import { getSharedReportStatus, toSharedTextList } from './sharedReportPresentation';
import type { SharedBundle } from './sharedReportTypes';

type SharedReportTabsProps = {
  bundle: SharedBundle;
  bundleLoading: boolean;
  chatInput: string;
  chatLoading: boolean;
  chatMessages: ChatMessage[];
  onChatInputChange: (value: string) => void;
  onSendChat: () => void;
};

export function SharedReportTabs({
  bundle,
  bundleLoading,
  chatInput,
  chatLoading,
  chatMessages,
  onChatInputChange,
  onSendChat,
}: SharedReportTabsProps) {
  const report = bundle.reports[0];
  const reportStatus = getSharedReportStatus(report);

  return (
    <Tabs
      className="shared-report-tabs"
      items={[
        {
          key: 'report',
          label: '분석 리포트',
          children: (
            <Card>
              <Space direction="vertical" size={16} className="shared-section-stack">
                <div>
                  <Space wrap>
                    <Tag color="blue">Resume #{bundle.resume.id}</Tag>
                    <Tag color={reportStatus.color}>{reportStatus.label}</Tag>
                    {report?.version !== undefined && report.version !== null ? (
                      <Tag color="geekblue">v{report.version}</Tag>
                    ) : null}
                  </Space>
                  <Typography.Title level={3}>{bundle.resume.name || '이름 없음'}</Typography.Title>
                </div>
                {bundle.jobDescription ? (
                  <div className="shared-jd-summary">
                    <Space wrap>
                      <Tag color="geekblue">JD #{bundle.jobDescription.id}</Tag>
                      <Tag color={bundle.jobDescription.status === 'closed' ? 'red' : 'cyan'}>
                        {bundle.jobDescription.status}
                      </Tag>
                    </Space>
                    <Typography.Title level={4}>{bundle.jobDescription.job_name}</Typography.Title>
                    <p>{bundle.jobDescription.main_task || '주요 업무 정보 없음'}</p>
                    <Space wrap>
                      {(toSharedTextList(bundle.jobDescription.required_skill).length
                        ? toSharedTextList(bundle.jobDescription.required_skill)
                        : ['필수 역량 없음']
                      ).map((skill, index) => (
                        <Tag key={`${skill}-${index}`}>{skill}</Tag>
                      ))}
                    </Space>
                  </div>
                ) : (
                  <Alert showIcon type="warning" title="API key로 접근 가능한 JD를 찾지 못했습니다." />
                )}
                {report ? (
                  <ReportReadOnlyContent report={report} variant="shared" />
                ) : (
                  <Alert showIcon type="warning" title="아직 분석 리포트가 없습니다." />
                )}
              </Space>
            </Card>
          ),
        },
        {
          key: 'questions',
          label: '면접 질문',
          children: (
            <Card>
              <List
                dataSource={bundle.questions}
                locale={{ emptyText: '생성된 면접 질문이 없습니다.' }}
                renderItem={(question: InterviewQuestion) => (
                  <List.Item>
                    <List.Item.Meta
                      title={question.question}
                      description={
                        <Space direction="vertical" size={6}>
                          <span>{question.purpose || '질문 의도 없음'}</span>
                          {question.answer && <span>예상 답변: {question.answer}</span>}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          ),
        },
        {
          key: 'chat',
          label: 'AI 채팅',
          children: (
            <Card>
              <div className="shared-chat-log">
                {chatMessages.map((message, index) => (
                  <div className={`shared-chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
                    {message.text}
                  </div>
                ))}
              </div>
              <Space.Compact className="shared-chat-input">
                <Input
                  value={chatInput}
                  placeholder="리포트나 질문지에 대해 물어보세요."
                  onChange={(event) => onChatInputChange(event.target.value)}
                  onPressEnter={onSendChat}
                  disabled={bundleLoading || chatLoading}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={chatLoading}
                  disabled={bundleLoading || !chatInput.trim()}
                  onClick={onSendChat}
                >
                  전송
                </Button>
              </Space.Compact>
              <Alert
                showIcon
                type="info"
                icon={<MessageOutlined />}
                title="채팅 API는 특정 report id를 직접 받지 않아 현재 화면의 리포트 요약을 대화 맥락에 함께 포함합니다."
              />
            </Card>
          ),
        },
      ]}
    />
  );
}
