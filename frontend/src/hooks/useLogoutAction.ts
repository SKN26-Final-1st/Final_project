import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/backendClient';
import { queryKeys } from '../api/queryKeys';
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
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (authMode === 'apiKey') {
      queryClient.removeQueries({ queryKey: queryKeys.appData() });
      clearAuthSession();
      navigate('/login');
      return;
    }

    void runApiAction('logout', () => apiClient.logout(), () => {
      queryClient.removeQueries({ queryKey: queryKeys.appData() });
      setIsAuthenticated(false);
      navigate('/login');
    });
  }, [authMode, clearAuthSession, navigate, queryClient, runApiAction, setIsAuthenticated]);
}
