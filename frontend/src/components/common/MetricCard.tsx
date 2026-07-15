import { Card, Statistic } from 'antd';
import {
  AuditOutlined,
  BarChartOutlined,
  FileProtectOutlined,
  LineChartOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { MetricItem } from '../../api/adapters';

const metricIcons: Record<string, ReactNode> = {
  credits: <WalletOutlined />,
  applicants: <AuditOutlined />,
  reports: <FileProtectOutlined />,
  conversion: <LineChartOutlined />,
};

function getMetricIcon(label: string) {
  if (label.includes('크레딧')) {
    return metricIcons.credits;
  }

  if (label.includes('지원') || label.includes('후보')) {
    return metricIcons.applicants;
  }

  if (label.includes('리포트') || label.includes('분석')) {
    return metricIcons.reports;
  }

  return metricIcons.conversion ?? <BarChartOutlined />;
}

export function MetricCard({ item }: { item: MetricItem }) {
  return (
    <Card className="metric-card">
      <div className="metric-card-head">
        <span className="metric-icon" aria-hidden="true">
          {getMetricIcon(item.label)}
        </span>
        <span className="metric-change">{item.change}</span>
      </div>
      <Statistic title={item.label} value={item.value} suffix={item.suffix} />
    </Card>
  );
}
