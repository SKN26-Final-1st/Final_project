import { MetricCard } from '../common/MetricCard';
import type { MetricItem } from '../../api/adapters';

type DashboardMetricsProps = {
  metrics: MetricItem[];
};

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="dashboard-metric-row dashboard-metric-grid">
      {metrics.map((item) => (
        <MetricCard item={item} key={item.label} />
      ))}
    </div>
  );
}
