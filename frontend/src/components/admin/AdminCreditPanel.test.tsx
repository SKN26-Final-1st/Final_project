import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminCreditPanel } from './AdminCreditPanel';
import type { AdminData } from '../../api/adapters';

const credit: AdminData['credit'] = {
  expiresAt: '2026. 08. 07. 오후 12:00',
  expiresAtIso: '2026-08-07T03:00:00.000Z',
  isSubscriptionActive: true,
  percent: 50,
  remaining: 1000,
  subscriptionStatus: '구독 중',
};

describe('AdminCreditPanel', () => {
  it('관리자 credit 충전 금액을 선택하면 선택한 금액을 전달한다', async () => {
    const user = userEvent.setup();
    const onRecharge = vi.fn();

    render(<AdminCreditPanel credit={credit} loading={false} onRecharge={onRecharge} onSubscribe={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '+1,000p' }));

    expect(onRecharge).toHaveBeenCalledWith(1000);
  });

  it('구독 중이면 1개월 연장 액션을 보여주고 호출한다', async () => {
    const user = userEvent.setup();
    const onSubscribe = vi.fn();

    render(<AdminCreditPanel credit={credit} loading={false} onRecharge={vi.fn()} onSubscribe={onSubscribe} />);

    await user.click(screen.getByRole('button', { name: '1개월 연장' }));

    expect(screen.getByText(/API Key 사용량/)).toBeInTheDocument();
    expect(onSubscribe).toHaveBeenCalledTimes(1);
  });
});
