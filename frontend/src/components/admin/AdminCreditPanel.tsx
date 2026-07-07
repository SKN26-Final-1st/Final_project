import { Button, Progress, Space, Tag } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { SectionCard } from '../common/SectionCard';
import type { AdminData } from '../../api/adapters';

type AdminCreditPanelProps = {
  credit: AdminData['credit'];
  loading?: boolean;
  onRecharge?: (amount: number) => void;
  onSubscribe?: () => void;
};

const RECHARGE_AMOUNTS = [1000, 2000, 5000, 10000] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export function AdminCreditPanel({ credit, loading = false, onRecharge, onSubscribe }: AdminCreditPanelProps) {
  const subscribeActionLabel = credit.isSubscriptionActive ? '1개월 연장' : '1개월 구독 시작';

  return (
    <SectionCard className="admin-credit-card" title="포인트 / 구독">
      <div className="admin-credit-panel">
        <CreditCardOutlined />
        <div>
          <strong>{formatNumber(credit.remaining)}pt</strong>
          <span>{credit.subscriptionStatus}</span>
        </div>
      </div>
      <Progress percent={credit.percent} size="small" />
      <p className="muted">구독 만료일: {credit.expiresAt}</p>

      <div className="admin-credit-control">
        <div className="admin-credit-control-header">
          <strong>Credit 충전</strong>
          <span>테스트용 Credit을 바로 반영합니다.</span>
        </div>
        <Space wrap size={[6, 6]}>
          {RECHARGE_AMOUNTS.map((amount) => (
            <Button key={amount} disabled={loading} size="small" onClick={() => onRecharge?.(amount)}>
              +{formatNumber(amount)}p
            </Button>
          ))}
        </Space>
      </div>

      <div className="admin-credit-control admin-credit-control--subscription">
        <div className="admin-credit-control-header">
          <strong>구독 상태</strong>
          <Tag color={credit.isSubscriptionActive ? 'green' : 'default'}>{credit.subscriptionStatus}</Tag>
        </div>
        <p className="muted">구독 중에는 관리자 분석 비용이 0p입니다.</p>
        <p className="muted">API Key 사용량은 별도 차감됩니다.</p>
        <Button block type="primary" ghost={credit.isSubscriptionActive} loading={loading} onClick={onSubscribe}>
          {subscribeActionLabel}
        </Button>
      </div>
    </SectionCard>
  );
}
