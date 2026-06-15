import { Progress } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { SectionCard } from '../common/SectionCard';
import type { AdminData } from '../../api/adapters';

type AdminCreditPanelProps = {
  credit: AdminData['credit'];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export function AdminCreditPanel({ credit }: AdminCreditPanelProps) {
  return (
    <SectionCard title="포인트 / 구독">
      <div className="admin-credit-panel">
        <CreditCardOutlined />
        <div>
          <strong>{formatNumber(credit.remaining)}pt</strong>
          <span>{credit.subscriptionStatus}</span>
        </div>
      </div>
      <Progress percent={credit.percent} />
      <p className="muted">구독 만료일: {credit.expiresAt}</p>
    </SectionCard>
  );
}
