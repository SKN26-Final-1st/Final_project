import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthSession } from './useAuthSession';
import { markAuthRecoveryRequested } from '../utils/apiKeySession';

const getUserProfile = vi.hoisted(() => vi.fn());

vi.mock('../api/backendClient', () => ({
  apiClient: { getUserProfile },
}));

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    getUserProfile.mockReturnValue(new Promise(() => undefined));
  });

  it('uses a local auth policy and aborts the initial profile request on unmount', async () => {
    const { unmount } = renderHook(() => useAuthSession(false));

    await waitFor(() => {
      expect(getUserProfile).toHaveBeenCalledTimes(1);
    });
    const options = getUserProfile.mock.calls[0][0] as {
      authFailurePolicy?: string;
      signal?: AbortSignal;
    };

    expect(options.authFailurePolicy).toBe('local');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal?.aborted).toBe(false);

    unmount();

    expect(options.signal?.aborted).toBe(true);
  });

  it('does not let a stale profile failure overwrite a successful login session', async () => {
    let rejectProfile!: (error: unknown) => void;
    getUserProfile.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectProfile = reject;
      }),
    );
    const { result } = renderHook(() => useAuthSession(false));

    await waitFor(() => {
      expect(getUserProfile).toHaveBeenCalledTimes(1);
    });
    const options = getUserProfile.mock.calls[0][0] as { signal?: AbortSignal };

    act(() => {
      result.current.setIsAuthenticated(true);
    });
    await act(async () => {
      rejectProfile(new Error('stale profile failure'));
      await Promise.resolve();
    });

    expect(options.signal?.aborted).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authMode).toBe('account');
  });

  it('stays logged out after an Error Boundary recovery instead of probing the old account session', () => {
    markAuthRecoveryRequested();

    const firstSession = renderHook(() => useAuthSession(false));

    expect(getUserProfile).not.toHaveBeenCalled();
    expect(firstSession.result.current.authChecked).toBe(true);
    expect(firstSession.result.current.isAuthenticated).toBe(false);
    expect(firstSession.result.current.authMode).toBeNull();

    firstSession.unmount();
    const secondSession = renderHook(() => useAuthSession(false));

    expect(getUserProfile).not.toHaveBeenCalled();
    expect(secondSession.result.current.authChecked).toBe(true);
    expect(secondSession.result.current.isAuthenticated).toBe(false);
  });
});
