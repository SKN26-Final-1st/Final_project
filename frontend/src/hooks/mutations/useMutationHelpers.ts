import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';

export function useInvalidateAppData() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: queryKeys.appData() });
}

export function getMutationErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('비교할 체크리스트가 필요합니다')) {
    return '분석 기준이 없습니다. 연결된 JD의 체크리스트를 먼저 생성해주세요.';
  }

  return message || fallback;
}
