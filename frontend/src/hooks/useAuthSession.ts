import { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/backendClient';
import {
  clearAuthRecoveryRequested,
  clearStoredApiKey,
  getAuthRecoveryRequested,
  getStoredApiKey,
  setStoredApiKey,
  type AuthMode,
} from '../utils/apiKeySession';

export function useAuthSession(isShared: boolean) {
  const [authRecoveryRequested] = useState(getAuthRecoveryRequested);
  const [apiKey, setApiKey] = useState<string | null>(() =>
    authRecoveryRequested ? null : getStoredApiKey(),
  );
  const [authChecked, setAuthChecked] = useState(() => authRecoveryRequested || Boolean(apiKey));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !authRecoveryRequested && Boolean(apiKey));
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    !authRecoveryRequested && apiKey ? 'apiKey' : null,
  );
  const profileControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isShared || apiKey || authRecoveryRequested) {
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
        if (canApplyResponse()) {
          setIsAuthenticated(true);
          setAuthMode('account');
        }
      })
      .catch(() => {
        if (canApplyResponse()) {
          setIsAuthenticated(false);
          setAuthMode(null);
        }
      })
      .finally(() => {
        if (canApplyResponse()) {
          setAuthChecked(true);
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
  }, [apiKey, authRecoveryRequested, isShared]);

  const cancelProfileRequest = () => {
    profileControllerRef.current?.abort();
    profileControllerRef.current = null;
  };

  const setAccountAuthenticated = (value: boolean) => {
    cancelProfileRequest();

    if (value) {
      clearAuthRecoveryRequested();
      clearStoredApiKey();
      setApiKey(null);
      setAuthMode('account');
      setIsAuthenticated(true);
      setAuthChecked(true);
      return;
    }

    clearStoredApiKey();
    setApiKey(null);
    setAuthMode(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
  };

  const setApiKeySession = (nextApiKey: string) => {
    cancelProfileRequest();
    clearAuthRecoveryRequested();
    setStoredApiKey(nextApiKey);
    setApiKey(nextApiKey);
    setAuthMode('apiKey');
    setIsAuthenticated(true);
    setAuthChecked(true);
  };

  const clearAuthSession = () => {
    cancelProfileRequest();
    clearStoredApiKey();
    setApiKey(null);
    setAuthMode(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
  };

  return {
    apiKey,
    authChecked,
    authMode,
    clearAuthSession,
    isAuthenticated,
    setApiKeySession,
    setIsAuthenticated: setAccountAuthenticated,
  };
}
