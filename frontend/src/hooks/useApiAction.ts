import { useCallback, useEffect, useRef, useState } from 'react';
import { isRequestCancelled, isSessionAuthExpiredError } from '../api/httpClient';
import type { ApiResponse } from '../data/backendTypes';
import type { AlertState } from '../types/app';

export function useApiAction() {
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const alertTimeoutRef = useRef<number | null>(null);

  const showAlert = useCallback((nextAlert: AlertState) => {
    if (alertTimeoutRef.current !== null) {
      window.clearTimeout(alertTimeoutRef.current);
    }

    setAlert(nextAlert);
    alertTimeoutRef.current = window.setTimeout(() => {
      setAlert(null);
      alertTimeoutRef.current = null;
    }, 3400);
  }, []);

  useEffect(
    () => () => {
      if (alertTimeoutRef.current !== null) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    },
    [],
  );

  const runApiAction = useCallback(
    async <T,>(
      key: string,
      action: () => Promise<ApiResponse<T>>,
      afterComplete?: (response: ApiResponse<T>) => void,
      onError?: (message: string, error: unknown) => void,
    ) => {
      if (inFlightKeysRef.current.has(key)) {
        return;
      }

      inFlightKeysRef.current.add(key);
      setLoadingKeys((currentKeys) =>
        currentKeys.includes(key) ? currentKeys : [...currentKeys, key],
      );
      try {
        const response = await action();
        showAlert({
          type: response.error ? 'error' : 'success',
          message: response.message ?? (response.error ? 'API 요청이 실패했습니다.' : '요청이 완료되었습니다.'),
        });
        afterComplete?.(response);
      } catch (nextError) {
        if (isRequestCancelled(nextError) || isSessionAuthExpiredError(nextError)) {
          return;
        }

        const errorMessage = nextError instanceof Error ? nextError.message : 'API 요청이 실패했습니다.';

        showAlert({
          type: 'error',
          message: errorMessage,
        });
        onError?.(errorMessage, nextError);
      } finally {
        inFlightKeysRef.current.delete(key);
        setLoadingKeys((currentKeys) => currentKeys.filter((currentKey) => currentKey !== key));
      }
    },
    [showAlert],
  );

  return {
    alert,
    loadingKey: loadingKeys.at(-1) ?? null,
    runApiAction,
    setAlert,
    showAlert,
  };
}
