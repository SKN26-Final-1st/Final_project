import { useEffect, useState } from 'react';
import { apiClient } from '../api/backendClient';

export function useAuthSession(isShared: boolean) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isShared) {
      return undefined;
    }

    let active = true;

    void apiClient
      .getUserProfile()
      .then(() => {
        if (active) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        if (active) {
          setIsAuthenticated(false);
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
  }, [isShared]);

  return {
    authChecked,
    isAuthenticated,
    setIsAuthenticated,
  };
}
