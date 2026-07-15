import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, Button, Form, Space } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { SharedLookupPanel } from '../components/shared-report/SharedLookupPanel';
import { SharedReportTabs } from '../components/shared-report/SharedReportTabs';
import type { SharedLookupValues } from '../components/shared-report/sharedReportTypes';
import { useSharedReportSession } from '../hooks/useSharedReportSession';
import type { AppRoute } from '../data/appConfig';
import type { Navigate, ThemeMode } from '../types/app';

type SharedReportPageProps = {
  mode: ThemeMode;
  navigate: Navigate;
  themeSwitch: ReactNode;
};

function getInitialResumeId(search: string) {
  const query = new URLSearchParams(search);
  const rawResumeId = query.get('resumeId') ?? query.get('resume_id') ?? '';
  const resumeId = Number(rawResumeId);
  return Number.isFinite(resumeId) && resumeId > 0 ? resumeId : undefined;
}

export function SharedReportPage({ mode, navigate, themeSwitch }: SharedReportPageProps) {
  const location = useLocation();
  const [form] = Form.useForm<SharedLookupValues>();
  const initialResumeId = useMemo(() => getInitialResumeId(location.search), [location.search]);
  const session = useSharedReportSession();

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

        <SharedLookupPanel
          form={form}
          initialResumeId={initialResumeId}
          loading={session.bundleLoading}
          onSubmit={(values) => void session.loadSharedBundle(values)}
        />

        {session.error && <Alert showIcon type="error" title="요청 실패" description={session.error} />}

        {session.bundle ? (
          <SharedReportTabs
            bundle={session.bundle}
            bundleLoading={session.bundleLoading}
            chatInput={session.chatInput}
            chatLoading={session.chatLoading}
            chatMessages={session.chatMessages}
            onChatInputChange={session.setChatInput}
            onSendChat={() => void session.sendSharedChat()}
          />
        ) : (
          <Alert showIcon type="warning" title="조회할 공유 결과를 입력하세요." />
        )}
      </main>
    </div>
  );
}
