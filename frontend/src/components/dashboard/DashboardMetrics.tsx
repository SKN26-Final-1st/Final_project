import { Col, Row, type RowProps } from 'antd';
import { MetricCard } from '../common/MetricCard';
import type { MetricItem } from '../../api/adapters';

type DashboardMetricsProps = {
  metrics: MetricItem[];
};

const dashboardGutter: RowProps['gutter'] = [
  { xs: 16, lg: 22, xl: 24 },
  { xs: 16, lg: 22, xl: 24 },
];

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <Row gutter={dashboardGutter}>
      {metrics.map((item) => (
        <Col xs={24} sm={12} xl={6} key={item.label}>
          <MetricCard item={item} />
        </Col>
      ))}
    </Row>
  );
}
