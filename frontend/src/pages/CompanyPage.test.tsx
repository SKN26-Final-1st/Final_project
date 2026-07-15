import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompanyPage } from './CompanyPage';
import type { CompanyProfile } from '../api/adapters';
import type { RunApiAction } from '../types/app';

const saveCompanyProfile = vi.hoisted(() => vi.fn());

vi.mock('../api/backendClient', () => ({
  apiClient: {
    saveCompanyProfile,
  },
}));

const company: CompanyProfile = {
  name: '휴머',
  employeeCount: 42,
  teamComposition: [' 플랫폼팀 ', '', '채용팀'],
  description: '채용 분석 서비스',
  employStyle: [' 꼼꼼한 사람 ', '', '협업형'],
  completion: 80,
};

vi.mock('../hooks/useAppDataQuery', () => ({
  useAppDataQuery: () => ({
    data: { company },
  }),
}));

function renderCompanyPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const runApiAction: RunApiAction = async (_key, action, afterComplete) => {
    const response = await action();
    afterComplete?.(response);
  };

  render(
    <QueryClientProvider client={queryClient}>
      <CompanyPage loadingKey={null} runApiAction={runApiAction} showAlert={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('CompanyPage', () => {
  it('저장할 때 팀 구성과 선호 인재상 배열의 빈 항목을 제거하고 공백을 정리한다', async () => {
    saveCompanyProfile.mockResolvedValue({
      error: false,
      message: '저장되었습니다.',
      data: null,
    });
    const user = userEvent.setup();

    renderCompanyPage();

    await user.click(screen.getByRole('button', { name: /저장/ }));

    await waitFor(() => {
      expect(saveCompanyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          team_composition: ['플랫폼팀', '채용팀'],
          employ_style: ['꼼꼼한 사람', '협업형'],
        }),
      );
    });
  });
});
