import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { DashboardData } from '../../api/adapters';
import { DashboardHero } from './DashboardHero';

const dashboard: DashboardData = {
  metrics: [
    { label: '진행 중 JD', value: 1, suffix: '건', change: '전체 1건' },
    { label: '등록 지원서', value: 1, suffix: '명', change: '미검토 1명' },
    { label: '분석 리포트', value: 1, suffix: '개', change: '평균 90점' },
    { label: '분석 크레딧', value: 100, suffix: 'pt', change: '구독 만료' },
  ],
  applicants: [],
  insightCards: [],
  analysisSummary: {
    centerValue: 90,
    centerLabel: '평균 등급 점수',
    segments: [],
  },
  tasks: [],
  creditPercent: 50,
};

describe('DashboardHero', () => {
  it('분석 리포트 CTA가 리포트 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();

    render(
      <DashboardHero
        dashboard={dashboard}
        navigate={navigate}
        reloadData={vi.fn().mockResolvedValue(undefined)}
        showAlert={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '새 채용 공고' }));
    expect(navigate).toHaveBeenLastCalledWith('/jd');

    await user.click(screen.getByRole('button', { name: '분석 리포트 확인' }));
    expect(navigate).toHaveBeenLastCalledWith('/analysis-report');
  });
});
