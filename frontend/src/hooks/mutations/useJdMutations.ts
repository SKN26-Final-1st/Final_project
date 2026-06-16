import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/backendClient';
import type { ApiResponse } from '../../data/backendTypes';
import type { ShowAlert } from '../../types/app';
import { useInvalidateAppData } from './useMutationHelpers';

function alertSuccess<T>(showAlert: ShowAlert, response: ApiResponse<T>) {
  showAlert({
    type: response.error ? 'error' : 'success',
    message: response.message ?? (response.error ? 'API 요청이 실패했습니다.' : '요청이 완료되었습니다.'),
  });
}

function alertError(showAlert: ShowAlert, error: unknown) {
  showAlert({
    type: 'error',
    message: error instanceof Error ? error.message : 'API 요청이 실패했습니다.',
  });
}

export function useJdMutations(showAlert: ShowAlert) {
  const invalidateAppData = useInvalidateAppData();

  const addJd = useMutation({
    mutationFn: apiClient.addJobDescription,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveJd = useMutation({
    mutationFn: apiClient.saveJobDescription,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteJd = useMutation({
    mutationFn: apiClient.deleteJobDescription,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const analyzeJd = useMutation<
    ApiResponse<{ report: { resume_id: number }; resume_id: number } & Record<string, unknown>>,
    unknown,
    number
  >({
    mutationFn: apiClient.requestResumeAnalysis,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  return {
    addJd,
    analyzeJd,
    deleteJd,
    saveJd,
  };
}
