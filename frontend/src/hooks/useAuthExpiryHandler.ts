import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthExpiryHandler } from '../api/httpClient';
import { clearAuthenticatedQueryState } from '../api/queryClient';
import type { Navigate } from '../types/app';

type UseAuthExpiryHandlerOptions = {
  clearAuthSession: () => void;
  navigate: Navigate;
};

export function useAuthExpiryHandler({ clearAuthSession, navigate }: UseAuthExpiryHandlerOptions) {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      setAuthExpiryHandler(() => {
        clearAuthenticatedQueryState(queryClient);
        clearAuthSession();
        navigate('/login');
      }),
    [clearAuthSession, navigate, queryClient],
  );
}
