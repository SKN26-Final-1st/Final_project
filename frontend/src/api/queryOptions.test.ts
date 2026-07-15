import { beforeEach, describe, expect, test, vi } from 'vitest';
import { appDataQueryOptions } from './queryOptions';

const loadAppData = vi.hoisted(() => vi.fn());
const loadApiKeyAppData = vi.hoisted(() => vi.fn());

vi.mock('./appDataService', () => ({
  loadApiKeyAppData,
  loadAppData,
}));

function getRefetchInterval(options: ReturnType<typeof appDataQueryOptions>) {
  if (typeof options.refetchInterval !== 'function') {
    throw new Error('Expected app data refetchInterval to be a function.');
  }

  return options.refetchInterval;
}

function makeQuery(statuses: Array<'onqueue' | 'processing' | 'done' | 'fail'>) {
  return {
    state: {
      data: {
        analysisReports: statuses.map((status, index) => ({
          id: index + 1,
          status,
        })),
      },
    },
  } as Parameters<ReturnType<typeof getRefetchInterval>>[0];
}

function makePartialQuery(data: Record<string, unknown>) {
  return {
    state: {
      data,
    },
  } as Parameters<ReturnType<typeof getRefetchInterval>>[0];
}

describe('appDataQueryOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('polls while an analysis report is queued or processing', () => {
    const refetchInterval = getRefetchInterval(appDataQueryOptions());

    expect(refetchInterval(makeQuery(['onqueue']))).toBe(3000);
    expect(refetchInterval(makeQuery(['processing']))).toBe(3000);
  });

  test('does not poll when analysis reports are complete', () => {
    const refetchInterval = getRefetchInterval(appDataQueryOptions());

    expect(refetchInterval(makeQuery(['done']))).toBe(false);
    expect(refetchInterval(makeQuery([]))).toBe(false);
  });

  test('does not poll when analysis reports failed', () => {
    const refetchInterval = getRefetchInterval(appDataQueryOptions());

    expect(refetchInterval(makeQuery(['fail']))).toBe(false);
  });

  test('does not throw when app data omits polling collections', () => {
    const refetchInterval = getRefetchInterval(appDataQueryOptions());

    expect(refetchInterval(makePartialQuery({ jdList: [] }))).toBe(false);
    expect(refetchInterval(makePartialQuery({ analysisReports: [] }))).toBe(false);
  });

  test('forwards the TanStack Query abort signal to account and API Key loaders', async () => {
    const accountController = new AbortController();
    const apiKeyController = new AbortController();
    loadAppData.mockResolvedValue({});
    loadApiKeyAppData.mockResolvedValue({});
    const accountOptions = appDataQueryOptions(true, 'account', null, 'account-session');
    const apiKeyOptions = appDataQueryOptions(true, 'apiKey', 'shared-key-last6', 'opaque-session-id');

    await accountOptions.queryFn?.({ signal: accountController.signal } as never);
    await apiKeyOptions.queryFn?.({ signal: apiKeyController.signal } as never);

    expect(loadAppData).toHaveBeenCalledWith(accountController.signal);
    expect(loadApiKeyAppData).toHaveBeenCalledWith('shared-key-last6', apiKeyController.signal);
    expect(JSON.stringify(apiKeyOptions.queryKey)).toBe('["app-data","apiKey","opaque-session-id"]');
    expect(JSON.stringify(apiKeyOptions.queryKey)).not.toContain('last6');
  });
});
