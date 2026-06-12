import { Col, Row, type RowProps } from 'antd';
import { AnalysisSummaryPanel } from '../components/dashboard/AnalysisSummaryPanel';
import { ApplicantReviewTable } from '../components/dashboard/ApplicantReviewTable';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { TaskListPanel } from '../components/dashboard/TaskListPanel';
import type { DashboardData } from '../api/adapters';
import type { Navigate, ShowAlert, ThemeMode } from '../types/app';

const dashboardGutter: RowProps['gutter'] = [
  { xs: 16, lg: 22, xl: 24 },
  { xs: 16, lg: 22, xl: 24 },
];

type DashboardPageProps = {
  dashboard: DashboardData;
  mode: ThemeMode;
  navigate: Navigate;
  showAlert: ShowAlert;
  reloadData: () => Promise<void>;
};

export function DashboardPage({ dashboard, mode, navigate, showAlert, reloadData }: DashboardPageProps) {
  return (
    <div className="dashboard-page">
      <DashboardHero dashboard={dashboard} navigate={navigate} showAlert={showAlert} reloadData={reloadData} />

      <DashboardMetrics metrics={dashboard.metrics} />

      <Row gutter={dashboardGutter} className="section-row">
        <Col xs={24} xl={15}>
          <ApplicantReviewTable applicants={dashboard.applicants} showAlert={showAlert} />
        </Col>
        <Col xs={24} xl={9}>
          <AnalysisSummaryPanel
            analysisSummary={dashboard.analysisSummary}
            insightCards={dashboard.insightCards}
            mode={mode}
          />
        </Col>
      </Row>

      <TaskListPanel tasks={dashboard.tasks} />
    </div>
  );
}
