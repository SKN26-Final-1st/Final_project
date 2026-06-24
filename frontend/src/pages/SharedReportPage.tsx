import { useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Input, InputNumber, List, Row, Space, Tabs, Tag, Typography } from 'antd';
import { KeyOutlined, LoginOutlined, MessageOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons';
import { apiClient } from '../api/backendClient';
import type { AnalysisReport, InterviewQuestion, JobDescription, Resume } from '../data/backendTypes';
import type { AppRoute, ChatMessage } from '../data/appConfig';
import type { Navigate, ThemeMode } from '../types/app';

type SharedReportPageProps = {
  mode: ThemeMode;
  navigate: Navigate;
  themeSwitch: ReactNode;
};

type SharedBundle = {
  resume: Resume;
  jobDescription: JobDescription | null;
  jobDescriptions: JobDescription[];
  reports: AnalysisReport[];
  questions: InterviewQuestion[];
};

type SharedLookupForm = {
  resumeId: number;
  apiKey: string;
};

const SHARED_REPORT_STATUS_LABEL: Record<AnalysisReport['status'], string> = {
  onqueue: '분석 대기',
  processing: '분석 중',
  done: '분석 완료',
};

function getInitialResumeId(search: string) {
  const query = new URLSearchParams(search);
  const rawResumeId = query.get('resumeId') ?? query.get('resume_id') ?? '';
  const resumeId = Number(rawResumeId);

  return Number.isFinite(resumeId) && resumeId > 0 ? resumeId : undefined;
}

function toSharedTextList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : item === null || item === undefined ? '' : String(item)))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function SharedTextList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ul className="shared-report-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function getSharedChecklist(report: AnalysisReport) {
  return Array.isArray(report.checklist)
    ? report.checklist
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return null;
          }

          const record = item as Record<string, unknown>;
          const content = typeof record.content === 'string' ? record.content : '';
          if (!content) {
            return null;
          }

          return { content, result: Boolean(record.result) };
        })
        .filter((item): item is { content: string; result: boolean } => Boolean(item))
    : [];
}

function getSharedReportStatus(report: AnalysisReport | undefined) {
  if (!report) {
    return { label: '분석 전', color: 'default' };
  }

  return {
    label: SHARED_REPORT_STATUS_LABEL[report.status],
    color: report.status === 'done' ? 'green' : 'gold',
  };
}

function formatReportContext(bundle: SharedBundle) {
  const report = bundle.reports[0];
  const questions = bundle.questions.map((item) => item.question).join(' / ');
  const jobDescription = bundle.jobDescription;
  const requiredSkills = jobDescription ? toSharedTextList(jobDescription.required_skill).join(', ') : '';

  return [
    jobDescription ? `JD: ${jobDescription.job_name}` : '',
    requiredSkills ? `JD 필수 역량: ${requiredSkills}` : '',
    `지원자: ${bundle.resume.name}`,
    report ? `리포트 요약: ${report.overall_summary}` : '',
    report ? `확인 포인트: ${report.check_point.join(', ')}` : '',
    questions ? `면접 질문: ${questions}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function SharedReportPage({ mode, navigate, themeSwitch }: SharedReportPageProps) {
  const location = useLocation();
  const [form] = Form.useForm<SharedLookupForm>();
  const [bundle, setBundle] = useState<SharedBundle | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: '공유 API key로 리포트와 면접 질문을 불러오면 이 화면에서 바로 질문할 수 있습니다.',
    },
  ]);
  const initialResumeId = useMemo(() => getInitialResumeId(location.search), [location.search]);

  const loadSharedBundle = async (values: SharedLookupForm) => {
    setBundleLoading(true);
    setError(null);

    try {
      const response = await apiClient.getSharedResumeBundle(values.resumeId, values.apiKey.trim());
      setBundle(response.data);
    } catch (nextError) {
      setBundle(null);
      setError(nextError instanceof Error ? nextError.message : '공유 결과를 불러오지 못했습니다.');
    } finally {
      setBundleLoading(false);
    }
  };

  const sendSharedChat = async () => {
    if (!bundle || chatLoading) {
      return;
    }

    const values = form.getFieldsValue();
    const apiKey = values.apiKey?.trim();
    const trimmed = chatInput.trim();

    if (!apiKey || !trimmed) {
      return;
    }

    const visibleUserMessage: ChatMessage = { role: 'user', text: trimmed };
    const contextMessage: ChatMessage = {
      role: 'user',
      text: `${trimmed}\n\n[공유 분석 맥락]\n${formatReportContext(bundle)}`,
    };
    const nextVisibleMessages = [...chatMessages, visibleUserMessage];

    setChatMessages(nextVisibleMessages);
    setChatInput('');
    setChatLoading(true);
    setError(null);

    try {
      const response = await apiClient.sendChatMessage(trimmed, [...chatMessages, contextMessage], apiKey);
      setChatMessages((current) => [...current, response.data]);
    } catch (nextError) {
      setChatMessages(chatMessages);
      setChatInput(trimmed);
      setError(nextError instanceof Error ? nextError.message : '채팅 응답을 불러오지 못했습니다.');
    } finally {
      setChatLoading(false);
    }
  };

  const report = bundle?.reports[0];
  const reportStatus = getSharedReportStatus(report);

  return (
    <div className="shared-report-page">
      <header className="shared-report-header">
        <button type="button" className="auth-logo-button" onClick={() => navigate('/login' as AppRoute)}>
          <img src={mode === 'dark' ? '/assets/humour-logo-dark.png' : '/assets/humour-logo-light.png'} alt="HumouR" />
        </button>
        <Space>
          {themeSwitch}
          <Button icon={<LoginOutlined />} onClick={() => navigate('/login' as AppRoute)}>
            로그인
          </Button>
        </Space>
      </header>

      <main className="shared-report-main">
        <section className="shared-report-hero">
          <span className="eyebrow">Shared Report</span>
          <h1>공유 분석 결과</h1>
          <p>발급받은 API key를 입력하면 로그인 없이 지원서 분석 리포트와 면접 질문을 조회할 수 있습니다.</p>
        </section>

        <Card className="shared-report-lookup">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ resumeId: initialResumeId }}
            onFinish={(values) => void loadSharedBundle(values)}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24} md={8}>
                <Form.Item label="Resume ID" name="resumeId" rules={[{ required: true, message: 'resume id를 입력하세요.' }]}>
                  <InputNumber min={1} precision={0} className="full-width-control" placeholder="예: 12" />
                </Form.Item>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item label="API Key" name="apiKey" rules={[{ required: true, message: 'API key를 입력하세요.' }]}>
                  <Input.Password prefix={<KeyOutlined />} placeholder="발급받은 key를 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Space wrap>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={bundleLoading}>
                결과 조회
              </Button>
              <Alert
                showIcon
                type="info"
                title="API key는 URL에 저장하지 않고 요청 헤더로만 전송됩니다."
                className="shared-inline-alert"
              />
            </Space>
          </Form>
        </Card>

        {error && <Alert showIcon type="error" title="요청 실패" description={error} />}

        {bundle ? (
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
                        <div className="shared-report-copy">
                          <Typography.Title level={4}>{report.overall_grade} 등급</Typography.Title>
                          <p>{report.overall_summary}</p>
                          <p>{report.candidate_summary}</p>
                          <Typography.Title level={5}>체크리스트</Typography.Title>
                          <div className="shared-report-checklist">
                            {getSharedChecklist(report).length ? (
                              getSharedChecklist(report).map((item) => (
                                <div className="shared-report-check-row" key={item.content}>
                                  <Tag color={item.result ? 'success' : 'warning'}>
                                    {item.result ? '충족' : '미충족'}
                                  </Tag>
                                  <span>{item.content}</span>
                                </div>
                              ))
                            ) : (
                              <p className="muted">체크리스트가 없습니다.</p>
                            )}
                          </div>
                          <Typography.Title level={5}>역량 분석</Typography.Title>
                          <SharedTextList items={toSharedTextList(report.competency_analysis)} emptyText="역량 분석이 없습니다." />
                          <Typography.Title level={5}>적합도 분석</Typography.Title>
                          <SharedTextList items={toSharedTextList(report.fit_analysis)} emptyText="적합도 분석이 없습니다." />
                          {toSharedTextList(report.motive).length ? (
                            <>
                              <Typography.Title level={5}>지원 동기</Typography.Title>
                              <SharedTextList items={toSharedTextList(report.motive)} emptyText="지원 동기 분석이 없습니다." />
                            </>
                          ) : null}
                          {toSharedTextList(report.collaboration).length ? (
                            <>
                              <Typography.Title level={5}>협업 역량</Typography.Title>
                              <SharedTextList
                                items={toSharedTextList(report.collaboration)}
                                emptyText="협업 분석이 없습니다."
                              />
                            </>
                          ) : null}
                          <Typography.Title level={5}>강점</Typography.Title>
                          <SharedTextList items={toSharedTextList(report.strength)} emptyText="강점 정보가 없습니다." />
                          <Typography.Title level={5}>우려/검증 필요</Typography.Title>
                          <SharedTextList items={toSharedTextList(report.concern)} emptyText="우려 사항이 없습니다." />
                          <Typography.Title level={5}>확인 포인트</Typography.Title>
                          <ul>
                            {report.check_point.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                          <Typography.Title level={5}>최종 코멘트</Typography.Title>
                          <p>{report.final_comment || '최종 코멘트가 없습니다.'}</p>
                        </div>
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
                        onChange={(event) => setChatInput(event.target.value)}
                        onPressEnter={() => void sendSharedChat()}
                        disabled={chatLoading}
                      />
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={chatLoading}
                        disabled={!bundle || !chatInput.trim()}
                        onClick={() => void sendSharedChat()}
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
        ) : (
          <Alert showIcon type="warning" title="조회할 공유 결과를 입력하세요." />
        )}
      </main>
    </div>
  );
}
