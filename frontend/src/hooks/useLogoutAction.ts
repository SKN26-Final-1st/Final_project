import { useCallback } from 'react';
import { apiClient } from '../api/backendClient';
import type { Navigate, RunApiAction } from '../types/app';

type UseLogoutActionOptions = {
  navigate: Navigate;
  runApiAction: RunApiAction;
  setIsAuthenticated: (value: boolean) => void;
};

export function useLogoutAction({ navigate, runApiAction, setIsAuthenticated }: UseLogoutActionOptions) {
  return useCallback(() => {
    void runApiAction('logout', () => apiClient.logout(), () => {
      setIsAuthenticated(false);
      navigate('/login');
    });
  }, [navigate, runApiAction, setIsAuthenticated]);
}
