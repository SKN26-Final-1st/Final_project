import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';

export function useInvalidateAppData() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.appData() });
}
