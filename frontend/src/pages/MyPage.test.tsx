import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MyPage } from './MyPage';
import type { CompanyProfile, UserProfile } from '../api/adapters';
import type { RunApiAction } from '../types/app';
import type { AuthMode } from '../utils/apiKeySession';

const deleteAccount = vi.hoisted(() => vi.fn());
const saveUserProfile = vi.hoisted(() => vi.fn());
const login = vi.hoisted(() => vi.fn());

vi.mock('../api/backendClient', () => ({
  apiClient: {
    deleteAccount,
    login,
    saveUserProfile,
  },
}));

const profile: UserProfile = {
  displayName: '홍길동',
  username: 'hong',
  roleName: '채용 담당자',
  companyName: '휴머',
  credit: 100,
  subscribe: false,
  subscribeExpirationIso: '',
  subscribeExpirationText: '미설정',
  verificationQuestion: '가장 좋아하는 색은?',
};

const company: CompanyProfile = {
  name: '휴머',
  employeeCount: 30,
  teamComposition: [],
  description: '채용 분석 서비스',
  employStyle: [],
  completion: 80,
};

vi.mock('../hooks/useAppDataQuery', () => ({
  useAppDataQuery: () => ({
    data: {
      company,
      userProfile: profile,
    },
  }),
}));

function renderMyPage(authMode: AuthMode = 'account') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const navigate = vi.fn();
  const setIsAuthenticated = vi.fn();
  const runApiAction = vi.fn(async (_key, action, afterComplete) => {
    const response = await action();
    afterComplete?.(response);
  }) as unknown as RunApiAction;

  render(
    <QueryClientProvider client={queryClient}>
      <MyPage
        authMode={authMode}
        loadingKey={null}
        navigate={navigate}
        runApiAction={runApiAction}
        setIsAuthenticated={setIsAuthenticated}
      />
    </QueryClientProvider>,
  );

  return { navigate, queryClient, runApiAction, setIsAuthenticated };
}

describe('MyPage', () => {
  it('계정 삭제를 destructive modal 확인 후 실행하고 세션을 정리한다', async () => {
    deleteAccount.mockResolvedValue({
      error: false,
      message: '계정이 삭제되었습니다.',
      data: { delete: true },
    });
    const user = userEvent.setup();
    const { navigate, queryClient, runApiAction, setIsAuthenticated } = renderMyPage();
    queryClient.setQueryData(['app-data', 'account', 'none'], { account: 'deleted-user' });

    await user.click(screen.getByRole('button', { name: '계정 삭제' }));

    expect(screen.getByRole('dialog', { name: '계정 삭제' })).toBeInTheDocument();
    expect(screen.getByText('hong')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '계정 삭제 확인' }));

    await waitFor(() => {
      expect(deleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(runApiAction).toHaveBeenCalledWith('account-delete', expect.any(Function), expect.any(Function));
    expect(queryClient.getQueriesData({ queryKey: ['app-data'] })).toEqual([]);
    expect(setIsAuthenticated).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('API Key 모드에서는 계정 삭제 액션을 노출하지 않는다', () => {
    renderMyPage('apiKey');

    expect(screen.queryByRole('button', { name: '계정 삭제' })).not.toBeInTheDocument();
  });
});
