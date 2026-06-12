import { queryOptions } from '@tanstack/react-query';
import { loadAppData } from './appDataService';
import { queryKeys } from './queryKeys';

export function appDataQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: queryKeys.appData(),
    queryFn: loadAppData,
    enabled,
  });
}
