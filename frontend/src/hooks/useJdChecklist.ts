import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/backendClient';
import { queryKeys } from '../api/queryKeys';
import { useAuthSessionContext } from './authSessionContext';

export function useJdChecklist(jobDescriptionId: string | null | undefined) {
  const { apiKey, authSessionKey } = useAuthSessionContext();

  // The opaque session key partitions caches without exposing the API key itself.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return useQuery({
    queryKey: queryKeys.checklist(jobDescriptionId ?? 'none', authSessionKey),
    enabled: Boolean(jobDescriptionId),
    queryFn: async () => {
      const response = await apiClient.getChecklist(Number(jobDescriptionId), apiKey ?? undefined);
      return response.data;
    },
  });
}
