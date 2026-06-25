import { useQuery } from '@tanstack/react-query';
import { appDataQueryOptions } from '../api/queryOptions';
import type { AuthMode } from '../utils/apiKeySession';

export function useAppDataQuery(enabled = true, authMode?: AuthMode, apiKey?: string | null) {
  return useQuery(appDataQueryOptions(enabled, authMode, apiKey));
}
