import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionProvider } from './AuthSessionProvider';
import { useAppDataQuery } from './useAppDataQuery';
import { getAuthCapabilities } from '../utils/authCapabilities';

const loadAppData = vi.hoisted(() => vi.fn());
const loadApiKeyAppData = vi.hoisted(() => vi.fn());

vi.mock('../api/appDataService', () => ({
  loadApiKeyAppData,
  loadAppData,
}));

describe('useAppDataQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAppData.mockResolvedValue({});
    loadApiKeyAppData.mockResolvedValue({});
  });

  it('uses the context API Key and opaque namespace when callers omit explicit session arguments', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider
          value={{
            apiKey: 'sk_live_context_secret_tail77',
            authMode: 'apiKey',
            authSessionKey: 'opaque-context-session',
            capabilities: getAuthCapabilities('apiKey'),
          }}
        >
          {children}
        </AuthSessionProvider>
      </QueryClientProvider>
    );

    renderHook(() => useAppDataQuery(), { wrapper });

    await waitFor(() => expect(loadApiKeyAppData).toHaveBeenCalledTimes(1));
    expect(loadApiKeyAppData).toHaveBeenCalledWith('sk_live_context_secret_tail77', expect.any(AbortSignal));
    expect(loadAppData).not.toHaveBeenCalled();
    expect(JSON.stringify(queryClient.getQueryCache().getAll().map((query) => query.queryKey))).toBe(
      '[["app-data","apiKey","opaque-context-session"]]',
    );
  });
});
