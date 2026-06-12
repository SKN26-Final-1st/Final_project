import { Avatar, Button, Divider, Space, Tabs } from 'antd';
import type { AnalysisReportData } from '../../api/adapters';

type ReportContextPanelProps = {
  report: AnalysisReportData;
  setChatInput: (value: string) => void;
};

export function ReportContextPanel({ report, setChatInput }: ReportContextPanelProps) {
  return (
    <>
      <div className="context-card">
        <Avatar size={56} src="/assets/humour-app-icon.png" />
        <div>
          <strong>
            {report.applicantName} · {report.jobTitle}
          </strong>
          <span>분석 리포트 #{report.reportId}</span>
        </div>
      </div>
      <Tabs
        items={report.tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: (
            <div className="report-panel">
              <strong>{tab.title}</strong>
              <p>{tab.content}</p>
            </div>
          ),
        }))}
      />
      <Divider />
      <Space wrap>
        {report.exampleQuestions.map((question) => (
          <Button key={question} size="small" onClick={() => setChatInput(question)}>
            {question}
          </Button>
        ))}
      </Space>
    </>
  );
}
