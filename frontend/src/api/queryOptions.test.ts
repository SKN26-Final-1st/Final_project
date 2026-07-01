import { describe, expect, test } from 'vitest';
import { appDataQueryOptions } from './queryOptions';

function getRefetchInterval(options: ReturnType<typeof appDataQueryOptions>) {
  if (typeof options.refetchInterval !== 'function') {
    throw new Error('Expected app data refetchInterval to be a function.');
  }

  return options.refetchInterval;
}

function makeQuery(statuses: Array<'onqueue' | 'processing' | 'done'>) {
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

describe('appDataQueryOptions', () => {
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
});
