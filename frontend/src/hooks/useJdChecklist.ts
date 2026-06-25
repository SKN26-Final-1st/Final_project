import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/backendClient';
import { queryKeys } from '../api/queryKeys';
import { getStoredApiKey } from '../utils/apiKeySession';

export function useJdChecklist(jobDescriptionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.checklist(jobDescriptionId ?? 'none'),
    enabled: Boolean(jobDescriptionId),
    queryFn: async () => {
      const response = await apiClient.getChecklist(Number(jobDescriptionId), getStoredApiKey() ?? undefined);
      return response.data;
    },
  });
}
