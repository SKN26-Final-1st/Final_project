import { useQuery } from '@tanstack/react-query';
import { appDataQueryOptions } from '../api/queryOptions';
import type { AuthMode } from '../utils/apiKeySession';
import { useAuthSessionContext } from './authSessionContext';

export function useAppDataQuery(enabled = true, authMode?: AuthMode, apiKey?: string | null, authSessionKey?: string) {
  const session = useAuthSessionContext();

  return useQuery(appDataQueryOptions(
    enabled,
    authMode === undefined ? session.authMode : authMode,
    apiKey === undefined ? session.apiKey : apiKey,
    authSessionKey ?? session.authSessionKey,
  ));
}
