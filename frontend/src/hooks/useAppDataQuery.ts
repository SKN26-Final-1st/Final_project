import { useQuery } from '@tanstack/react-query';
import { appDataQueryOptions } from '../api/queryOptions';

export function useAppDataQuery() {
  return useQuery(appDataQueryOptions());
}
