import { useCallback } from 'react';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction } from '../types/app';
import type { AuthMode } from '../utils/apiKeySession';

type UseLogoutActionOptions = {
  authMode: AuthMode;
  clearAuthSession: () => void;
  navigate: Navigate;
  runApiAction: RunApiAction;
  setIsAuthenticated: (value: boolean) => void;
};

export function useLogoutAction({
  authMode,
  clearAuthSession,
  navigate,
  runApiAction,
  setIsAuthenticated,
}: UseLogoutActionOptions) {
  return useCallback(() => {
    if (authMode === 'apiKey') {
      clearAuthSession();
      navigate('/login');
      return;
    }

    void runApiAction('logout', () => apiClient.logout(), () => {
      setIsAuthenticated(false);
      navigate('/login');
    });
  }, [authMode, clearAuthSession, navigate, runApiAction, setIsAuthenticated]);
}
