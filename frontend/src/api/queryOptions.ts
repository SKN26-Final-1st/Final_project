import { queryOptions } from '@tanstack/react-query';
import { loadApiKeyAppData, loadAppData } from './appDataService';
import { queryKeys } from './queryKeys';
import { getApiKeyFingerprint, getCurrentAuthMode, getStoredApiKey, type AuthMode } from '../utils/apiKeySession';

export function appDataQueryOptions(
  enabled = true,
  authMode: AuthMode = getCurrentAuthMode(),
  apiKey: string | null = getStoredApiKey(),
) {
  const effectiveMode = authMode ?? 'account';

  return queryOptions({
    queryKey: queryKeys.appData(effectiveMode, getApiKeyFingerprint(apiKey)),
    queryFn: () => {
      if (effectiveMode === 'apiKey') {
        if (!apiKey) {
          throw new Error('API Key가 없습니다. 다시 로그인해 주세요.');
        }

        return loadApiKeyAppData(apiKey);
      }

      return loadAppData();
    },
    enabled,
  });
}
