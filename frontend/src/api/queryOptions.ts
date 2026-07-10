import { queryOptions } from '@tanstack/react-query';
import { loadApiKeyAppData, loadAppData, type AppData } from './appDataService';
import { queryKeys } from './queryKeys';
import { getApiKeyFingerprint, getCurrentAuthMode, getStoredApiKey, type AuthMode } from '../utils/apiKeySession';

const ACTIVE_ANALYSIS_REFETCH_INTERVAL_MS = 3000;

function hasActiveAnalysisReport(data: AppData | undefined) {
  return Boolean(
    data?.analysisReports?.some((report) => report.status === 'onqueue' || report.status === 'processing'),
  );
}

function hasActiveChecklistGeneration(data: AppData | undefined) {
  return Boolean(
    data?.jdList?.some((job) => job.checklistStatus === 'onqueue' || job.checklistStatus === 'processing'),
  );
}

export function appDataQueryOptions(
  enabled = true,
  authMode: AuthMode = getCurrentAuthMode(),
  apiKey: string | null = getStoredApiKey(),
) {
  const effectiveMode = authMode ?? 'account';

  return queryOptions({
    queryKey: queryKeys.appData(effectiveMode, getApiKeyFingerprint(apiKey)),
    queryFn: ({ signal }) => {
      if (effectiveMode === 'apiKey') {
        if (!apiKey) {
          throw new Error('API Key가 없습니다. 다시 로그인해 주세요.');
        }

        return loadApiKeyAppData(apiKey, signal);
      }

      return loadAppData(signal);
    },
    enabled,
    refetchInterval: (query) =>
      hasActiveAnalysisReport(query.state.data) || hasActiveChecklistGeneration(query.state.data)
        ? ACTIVE_ANALYSIS_REFETCH_INTERVAL_MS
        : false,
  });
}
