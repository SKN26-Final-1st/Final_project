import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../api/backendClient';
import {
  clearAuthRecoveryRequested,
  clearStoredApiKey,
  createAuthSessionKey,
  getAuthRecoveryRequested,
  getStoredApiKey,
  setStoredApiKey,
  type AuthMode,
} from '../utils/apiKeySession';
import { getAuthCapabilities } from '../utils/authCapabilities';

type AuthSessionState = {
  apiKey: string | null;
  authChecked: boolean;
  authMode: AuthMode;
  authSessionKey: string;
  isAuthenticated: boolean;
};

export function useAuthSession(isShared: boolean) {
  const [authRecoveryRequested] = useState(getAuthRecoveryRequested);
  const [session, setSession] = useState<AuthSessionState>(() => {
    const storedApiKey = authRecoveryRequested ? null : getStoredApiKey();
    const hasApiKey = Boolean(storedApiKey);

    return {
      apiKey: storedApiKey,
      authChecked: authRecoveryRequested || hasApiKey,
      authMode: hasApiKey ? 'apiKey' : null,
      authSessionKey: hasApiKey ? createAuthSessionKey() : 'account',
      isAuthenticated: !authRecoveryRequested && hasApiKey,
    };
  });
  const sessionRef = useRef(session);
  const profileControllerRef = useRef<AbortController | null>(null);

  const commitSession = useCallback((nextSession: AuthSessionState) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  useEffect(() => {
    if (isShared || session.apiKey || authRecoveryRequested) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    profileControllerRef.current = controller;
    const canApplyResponse = () =>
      active && profileControllerRef.current === controller && !controller.signal.aborted;

    void apiClient
      .getUserProfile({
        authFailurePolicy: 'local',
        signal: controller.signal,
      })
      .then(() => {
        if (canApplyResponse() && sessionRef.current.authMode !== 'apiKey') {
          commitSession({
            apiKey: null,
            authChecked: true,
            authMode: 'account',
            authSessionKey: 'account',
            isAuthenticated: true,
          });
        }
      })
      .catch(() => {
        if (canApplyResponse() && sessionRef.current.authMode !== 'apiKey') {
          commitSession({
            apiKey: null,
            authChecked: true,
            authMode: null,
            authSessionKey: 'anonymous',
            isAuthenticated: false,
          });
        }
      })
      .finally(() => {
        if (canApplyResponse()) {
          profileControllerRef.current = null;
        }
      });

    return () => {
      active = false;
      controller.abort();

      if (profileControllerRef.current === controller) {
        profileControllerRef.current = null;
      }
    };
  }, [authRecoveryRequested, commitSession, isShared, session.apiKey]);

  const cancelProfileRequest = () => {
    profileControllerRef.current?.abort();
    profileControllerRef.current = null;
  };

  const setAccountAuthenticated = (value: boolean) => {
    if (sessionRef.current.authMode === 'apiKey') {
      return;
    }

    cancelProfileRequest();

    if (value) {
      clearAuthRecoveryRequested();
      clearStoredApiKey();
      commitSession({
        apiKey: null,
        authChecked: true,
        authMode: 'account',
        authSessionKey: 'account',
        isAuthenticated: true,
      });
      return;
    }

    clearStoredApiKey();
    commitSession({
      apiKey: null,
      authChecked: true,
      authMode: null,
      authSessionKey: 'anonymous',
      isAuthenticated: false,
    });
  };

  const setApiKeySession = (nextApiKey: string) => {
    cancelProfileRequest();
    clearAuthRecoveryRequested();
    setStoredApiKey(nextApiKey);
    commitSession({
      apiKey: nextApiKey,
      authChecked: true,
      authMode: 'apiKey',
      authSessionKey: createAuthSessionKey(),
      isAuthenticated: true,
    });
  };

  const clearAuthSession = () => {
    cancelProfileRequest();
    clearStoredApiKey();
    commitSession({
      apiKey: null,
      authChecked: true,
      authMode: null,
      authSessionKey: 'anonymous',
      isAuthenticated: false,
    });
  };

  const capabilities = useMemo(() => getAuthCapabilities(session.authMode), [session.authMode]);

  return {
    apiKey: session.apiKey,
    authChecked: session.authChecked,
    authMode: session.authMode,
    authSessionKey: session.authSessionKey,
    capabilities,
    clearAuthSession,
    isAuthenticated: session.isAuthenticated,
    setApiKeySession,
    setIsAuthenticated: setAccountAuthenticated,
  };
}
