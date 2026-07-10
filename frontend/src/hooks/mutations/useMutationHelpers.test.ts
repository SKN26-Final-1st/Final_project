import { describe, expect, it } from 'vitest';
import { BackendRequestError } from '../../api/httpClient';
import { shouldSuppressMutationError } from './useMutationHelpers';

describe('shouldSuppressMutationError', () => {
  it('suppresses cancelled and centrally handled authentication errors', () => {
    const cancelled = new BackendRequestError('요청이 취소되었습니다.', {
      authFailurePolicy: 'session',
      backendError: false,
      cancelled: true,
      endpoint: 'jd/modify',
      isAuthError: false,
    });
    const authExpired = new BackendRequestError('403: Authentication is required.', {
      authFailurePolicy: 'session',
      backendError: true,
      cancelled: false,
      endpoint: 'resume/modify',
      isAuthError: true,
      status: 200,
    });

    expect(shouldSuppressMutationError(cancelled)).toBe(true);
    expect(shouldSuppressMutationError(authExpired)).toBe(true);
    expect(shouldSuppressMutationError(new Error('일반 저장 실패'))).toBe(false);
  });
});
