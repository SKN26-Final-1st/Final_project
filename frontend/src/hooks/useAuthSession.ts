import { useEffect, useState } from 'react';
import { apiClient } from '../api/backendClient';
import {
  clearStoredApiKey,
  getStoredApiKey,
  setStoredApiKey,
  type AuthMode,
} from '../utils/apiKeySession';

export function useAuthSession(isShared: boolean) {
  const [apiKey, setApiKey] = useState<string | null>(() => getStoredApiKey());
  const [authChecked, setAuthChecked] = useState(() => Boolean(apiKey));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(apiKey));
  const [authMode, setAuthMode] = useState<AuthMode>(() => (apiKey ? 'apiKey' : null));

  useEffect(() => {
    if (isShared || apiKey) {
      return undefined;
    }

    let active = true;

    void apiClient
      .getUserProfile()
      .then(() => {
        if (active) {
          setIsAuthenticated(true);
          setAuthMode('account');
        }
      })
      .catch(() => {
        if (active) {
          setIsAuthenticated(false);
          setAuthMode(null);
        }
      })
      .finally(() => {
        if (active) {
          setAuthChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, [apiKey, isShared]);

  const setAccountAuthenticated = (value: boolean) => {
    if (value) {
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
    setStoredApiKey(nextApiKey);
    setApiKey(nextApiKey);
    setAuthMode('apiKey');
    setIsAuthenticated(true);
    setAuthChecked(true);
  };

  const clearAuthSession = () => {
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
