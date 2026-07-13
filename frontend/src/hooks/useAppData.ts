import { useCallback } from 'react';
import { ZodError } from 'zod';
import { normalizeUserFacingErrorMessage } from '../api/httpClient';
import type { AppData } from '../api/appDataService';
import type { AuthMode } from '../utils/apiKeySession';
import { useAppDataQuery } from './useAppDataQuery';

export type UseAppData = AppData;

export function getAppDataErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return '서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.';
  }

  return normalizeUserFacingErrorMessage(
    error instanceof Error ? error.message : 'API 데이터를 불러오지 못했습니다.',
  );
}

export function useAppData(enabled = true, authMode?: AuthMode, apiKey?: string | null, authSessionKey?: string) {
  const { data, error: queryError, isFetching, isPending, refetch } = useAppDataQuery(
    enabled,
    authMode,
    apiKey,
    authSessionKey,
  );

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const error = queryError ? getAppDataErrorMessage(queryError) : null;

  return {
    data: data ?? null,
    loading: enabled && isPending,
    refreshing: enabled && isFetching && !isPending,
    error,
    reload,
  };
}
