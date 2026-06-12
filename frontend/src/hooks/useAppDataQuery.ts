import { useQuery } from '@tanstack/react-query';
import { appDataQueryOptions } from '../api/queryOptions';

export function useAppDataQuery(enabled = true) {
  return useQuery(appDataQueryOptions(enabled));
}
