import { Col, Row } from 'antd';
import { AnalysisSummaryPanel } from '../components/dashboard/AnalysisSummaryPanel';
import { ApplicantReviewTable } from '../components/dashboard/ApplicantReviewTable';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { TaskListPanel } from '../components/dashboard/TaskListPanel';
import { EmptyState } from '../components/common/PageState';
import type { Navigate, ShowAlert, ThemeMode } from '../types/app';
import { useAppDataQuery } from '../hooks/useAppDataQuery';
import { pageSectionGutter } from '../utils/layout';

type DashboardPageProps = {
  mode: ThemeMode;
  navigate: Navigate;
  showAlert: ShowAlert;
};

export function DashboardPage({ mode, navigate, showAlert }: DashboardPageProps) {
  const { data, refetch } = useAppDataQuery();
  const dashboard = data?.dashboard;
  const reloadData = async () => {
    await refetch();
  };

  if (!dashboard) {
    return <EmptyState description="대시보드 데이터를 불러오지 못했습니다." />;
  }

  return (
    <div className="dashboard-page">
      <DashboardHero dashboard={dashboard} navigate={navigate} showAlert={showAlert} reloadData={reloadData} />

      <DashboardMetrics metrics={dashboard.metrics} />

      <Row gutter={pageSectionGutter} className="section-row">
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
