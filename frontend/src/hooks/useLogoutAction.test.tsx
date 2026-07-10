import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../api/queryKeys';
import type { RunApiAction } from '../types/app';
import { useLogoutAction } from './useLogoutAction';

const logout = vi.hoisted(() => vi.fn());

vi.mock('../api/backendClient', () => ({
  apiClient: { logout },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useLogoutAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logout.mockResolvedValue({
      error: false,
      message: '로그아웃되었습니다.',
      data: { logout: true },
    });
  });

  it('계정 로그아웃이 완료되면 이전 계정의 app-data 캐시를 제거한다', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.appData('account', 'none'), { account: 'previous-user' });
    const navigate = vi.fn();
    const setIsAuthenticated = vi.fn();
    const runApiAction = vi.fn(async (_key, action, afterComplete) => {
      const response = await action();
      afterComplete?.(response);
    }) as unknown as RunApiAction;
    const { result } = renderHook(
      () =>
        useLogoutAction({
          authMode: 'account',
          clearAuthSession: vi.fn(),
          navigate,
          runApiAction,
          setIsAuthenticated,
        }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      result.current();
    });

    expect(queryClient.getQueriesData({ queryKey: queryKeys.appData() })).toEqual([]);
    expect(setIsAuthenticated).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('API Key 로그아웃도 제한 접근 캐시를 제거한다', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.appData('apiKey', '12:sample'), { account: 'api-key-user' });
    const clearAuthSession = vi.fn();
    const navigate = vi.fn();
    const { result } = renderHook(
      () =>
        useLogoutAction({
          authMode: 'apiKey',
          clearAuthSession,
          navigate,
          runApiAction: vi.fn() as unknown as RunApiAction,
          setIsAuthenticated: vi.fn(),
        }),
      { wrapper: createWrapper(queryClient) },
    );

    act(() => {
      result.current();
    });

    expect(queryClient.getQueriesData({ queryKey: queryKeys.appData() })).toEqual([]);
    expect(clearAuthSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
