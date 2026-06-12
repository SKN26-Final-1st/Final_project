import { useCallback } from 'react';
import type { AppData } from '../api/appDataService';
import { useAppDataQuery } from './useAppDataQuery';

export type MockAppData = AppData;

export function useMockAppData() {
  const { data, error: queryError, isFetching, isPending, refetch } = useAppDataQuery();

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
    loading: isPending || isFetching,
    error,
    reload,
  };
}
