import { useCallback, useState } from 'react';
import type { ApiResponse } from '../data/backendTypes';
import type { AlertState } from '../types/app';

export function useApiAction() {
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const showAlert = useCallback((nextAlert: AlertState) => {
    setAlert(nextAlert);
    window.setTimeout(() => setAlert(null), 3400);
  }, []);

  const runApiAction = useCallback(
    async <T,>(
      key: string,
      action: () => Promise<ApiResponse<T>>,
      afterComplete?: (response: ApiResponse<T>) => void,
      onError?: (message: string, error: unknown) => void,
    ) => {
      if (loadingKey === key) {
        return;
      }

      setLoadingKey(key);
      try {
        const response = await action();
        showAlert({
          type: response.error ? 'error' : 'success',
          message: response.message ?? (response.error ? 'API 요청이 실패했습니다.' : '요청이 완료되었습니다.'),
        });
        afterComplete?.(response);
      } catch (nextError) {
        const errorMessage = nextError instanceof Error ? nextError.message : 'API 요청이 실패했습니다.';

        showAlert({
          type: 'error',
          message: errorMessage,
        });
        onError?.(errorMessage, nextError);
      } finally {
        setLoadingKey(null);
      }
    },
    [loadingKey, showAlert],
  );

  return {
    alert,
    loadingKey,
    runApiAction,
    setAlert,
    showAlert,
  };
}
