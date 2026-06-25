import { useCallback } from 'react';
import type { AppData } from '../api/appDataService';
import type { AuthMode } from '../utils/apiKeySession';
import { useAppDataQuery } from './useAppDataQuery';

export type UseAppData = AppData;

export function useAppData(enabled = true, authMode?: AuthMode, apiKey?: string | null) {
  const { data, error: queryError, isFetching, isPending, refetch } = useAppDataQuery(enabled, authMode, apiKey);

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'API 데이터를 불러오지 못했습니다.'
    : null;

  return {
    data: data ?? null,
    loading: enabled && isPending,
    refreshing: enabled && isFetching && !isPending,
    error,
    reload,
  };
}
