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

  it('assigns a new opaque namespace whenever an API Key session is created', () => {
    const randomUUID = vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000002');
    const { result } = renderHook(() => useAuthSession(false));

    act(() => result.current.setApiKeySession('sk_live_first_secret_tail01'));
    const firstSessionKey = result.current.authSessionKey;
    act(() => result.current.setApiKeySession('sk_live_second_secret_tail02'));

    expect(firstSessionKey).toBe('00000000-0000-4000-8000-000000000001');
    expect(result.current.authSessionKey).toBe('00000000-0000-4000-8000-000000000002');
    expect(result.current.authSessionKey).not.toContain('tail02');
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });

  it('removes the persisted API Key and resets the namespace when the session is cleared', () => {
    const { result } = renderHook(() => useAuthSession(false));

    act(() => result.current.setApiKeySession('sk_live_logout_secret_tail03'));
    expect(window.sessionStorage.getItem('humour.apiKey')).toBe('sk_live_logout_secret_tail03');

    act(() => result.current.clearAuthSession());

    expect(window.sessionStorage.getItem('humour.apiKey')).toBeNull();
    expect(result.current.apiKey).toBeNull();
    expect(result.current.authMode).toBeNull();
    expect(result.current.authSessionKey).toBe('anonymous');
  });

  it('does not let a late account success overwrite an active API Key session', () => {
    const { result } = renderHook(() => useAuthSession(false));

    act(() => result.current.setApiKeySession('sk_live_active_api_session'));
    act(() => result.current.setIsAuthenticated(true));

    expect(result.current.authMode).toBe('apiKey');
    expect(result.current.apiKey).toBe('sk_live_active_api_session');
    expect(window.sessionStorage.getItem('humour.apiKey')).toBe('sk_live_active_api_session');
  });

  it('preserves an API Key session restored from storage when an account signal arrives', () => {
    window.sessionStorage.setItem('humour.apiKey', 'sk_live_restored_api_session');

    const { result } = renderHook(() => useAuthSession(false));
    act(() => result.current.setIsAuthenticated(true));

    expect(getUserProfile).not.toHaveBeenCalled();
    expect(result.current.authMode).toBe('apiKey');
    expect(result.current.apiKey).toBe('sk_live_restored_api_session');
    expect(window.sessionStorage.getItem('humour.apiKey')).toBe('sk_live_restored_api_session');
  });
});
