import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestBackend, resetAuthExpiryHandling } from '../api/httpClient';
import { server } from '../test/server';
import { useAuthExpiryHandler } from './useAuthExpiryHandler';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useAuthExpiryHandler', () => {
  beforeEach(() => {
    resetAuthExpiryHandling();
    document.cookie = 'csrftoken=test-csrf; path=/';
  });

  it('clears all client state before ending the session and navigating once', async () => {
    server.use(
      http.post('/api/account/get/', () =>
        HttpResponse.json({ error: true, message: '403: Authentication is required.' }),
      ),
    );
    const queryClient = new QueryClient();
    queryClient.setQueryData(['checklist', '44'], { content: 'sensitive' });
    queryClient.getMutationCache().build(queryClient, {
      mutationKey: ['sensitive-mutation'],
      mutationFn: async () => ({ saved: true }),
    });
    const clear = vi.spyOn(queryClient, 'clear');
    const clearAuthSession = vi.fn();
    const navigate = vi.fn();

    const { unmount } = renderHook(
      () => useAuthExpiryHandler({ clearAuthSession, navigate }),
      { wrapper: createWrapper(queryClient) },
    );

    await expect(requestBackend('account/get')).rejects.toMatchObject({ isAuthError: true });

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/login');
    });
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
    expect(queryClient.getMutationCache().getAll()).toEqual([]);
    expect(clear.mock.invocationCallOrder[0]).toBeLessThan(clearAuthSession.mock.invocationCallOrder[0]);
    expect(clearAuthSession.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);

    unmount();
  });
});
