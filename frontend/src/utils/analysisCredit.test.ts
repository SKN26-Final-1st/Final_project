import { describe, expect, it } from 'vitest';
import { ANALYSIS_CREDIT_COST, getAnalysisCreditCost } from './analysisCredit';
import type { UserProfile } from '../api/adapters';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    displayName: '민',
    username: 'min',
    roleName: '구독 만료',
    companyName: 'HumouR',
    credit: 100,
    subscribe: false,
    subscribeExpirationIso: '',
    subscribeExpirationText: '미설정',
    verificationQuestion: '',
    ...overrides,
  };
}

describe('analysis credit cost', () => {
  it('is free for account mode only when subscribe expiration is in the future', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(getAnalysisCreditCost(makeProfile({ subscribe: false, subscribeExpirationIso: future }), false)).toBe(0);
  });

  it('costs credit when account subscription expiration is past, empty, or invalid', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    expect(getAnalysisCreditCost(makeProfile({ subscribe: true, subscribeExpirationIso: past }), false)).toBe(
      ANALYSIS_CREDIT_COST,
    );
    expect(getAnalysisCreditCost(makeProfile({ subscribe: true, subscribeExpirationIso: '' }), false)).toBe(
      ANALYSIS_CREDIT_COST,
    );
    expect(getAnalysisCreditCost(makeProfile({ subscribe: true, subscribeExpirationIso: 'not-a-date' }), false)).toBe(
      ANALYSIS_CREDIT_COST,
    );
  });

  it('always costs API key credit in API key mode even with future account expiration', () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(getAnalysisCreditCost(makeProfile({ subscribe: true, subscribeExpirationIso: future }), true)).toBe(
      ANALYSIS_CREDIT_COST,
    );
  });
});
