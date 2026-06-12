import { Button, Progress, Space } from 'antd';
import {
  AimOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import type { DashboardData } from '../../api/adapters';
import type { Navigate, ShowAlert } from '../../types/app';

type DashboardHeroProps = {
  dashboard: DashboardData;
  navigate: Navigate;
  showAlert: ShowAlert;
  reloadData: () => Promise<void>;
};

export function DashboardHero({ dashboard, navigate, showAlert, reloadData }: DashboardHeroProps) {
  const applicantCount = dashboard.applicants.length;
  const highFitCount = dashboard.applicants.filter((item) => item.fit >= 80).length;
  const analysisValue = dashboard.analysisSummary.centerValue;
  const primaryMetric = dashboard.metrics[0];
  const secondaryMetric = dashboard.metrics[1];
  const creditMetric = dashboard.metrics.find((item) => item.label.includes('크레딧'));

  const refreshDashboard = () => {
    void reloadData().then(() => showAlert({ type: 'info', message: '대시보드 데이터를 새로고침했습니다.' }));
  };

  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
      <div className="hero-main">
        <span className="eyebrow hero-eyebrow">Dashboard</span>
        <h1 id="dashboard-hero-title">채용 현황 대시보드</h1>
        <p>
          채용 공고, 지원자, AI 분석 리포트 흐름을 한 화면에서 확인하고 다음 액션으로 바로 이동합니다.
        </p>
        <Space className="hero-actions" wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/jd')}>
            새 채용 공고
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refreshDashboard}>
            새로고침
          </Button>
        </Space>

        <div className="hero-stat-grid" aria-label="채용 핵심 요약">
          <div className="hero-stat">
            <UserSwitchOutlined />
            <span>검토 지원자</span>
            <strong>{applicantCount}명</strong>
          </div>
          <div className="hero-stat">
            <AimOutlined />
            <span>고적합 후보</span>
            <strong>{highFitCount}명</strong>
          </div>
          <div className="hero-stat">
            <ThunderboltOutlined />
            <span>AI 분석률</span>
            <strong>{analysisValue}%</strong>
          </div>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="talent-card card-one">
          <span />
          <strong>Frontend Lead</strong>
          <em>92%</em>
        </div>
        <div className="talent-card card-two">
          <span />
          <strong>Data Analyst</strong>
          <em>86%</em>
        </div>
        <div className="analysis-board">
          <div className="board-line line-a" />
          <div className="board-line line-b" />
          <div className="board-line line-c" />
        </div>
        <div className="hero-person">
          <div className="person-head" />
          <div className="person-body" />
        </div>
      </div>

      <aside className="hero-summary" aria-label="운영 요약">
        <div className="summary-profile">
          <div className="summary-avatar">
            <BarChartOutlined />
          </div>
          <div>
            <strong>AI Recruiting Ops</strong>
            <span>실시간 분석 워크스페이스</span>
          </div>
        </div>

        <div className="summary-progress">
          <div>
            <span>분석 크레딧</span>
            <strong>
              {creditMetric?.value ?? 0}
              {creditMetric?.suffix ?? 'pt'}
            </strong>
          </div>
          <Progress percent={dashboard.creditPercent} showInfo={false} />
        </div>

        <div className="summary-metrics">
          <div>
            <span>{primaryMetric?.label ?? '핵심 지표'}</span>
            <strong>
              {primaryMetric?.value ?? applicantCount}
              {primaryMetric?.suffix}
            </strong>
          </div>
          <div>
            <span>{secondaryMetric?.label ?? '분석 완료'}</span>
            <strong>
              {secondaryMetric?.value ?? analysisValue}
              {secondaryMetric?.suffix}
            </strong>
          </div>
        </div>

        <Button block icon={<FileSearchOutlined />} onClick={() => navigate('/cover-letter')}>
          분석 리포트 확인
        </Button>
      </aside>
    </section>
  );
}
