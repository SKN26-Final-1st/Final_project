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

export function useResumeMutations(showAlert: ShowAlert) {
  const invalidateAppData = useInvalidateAppData();

  const addResume = useMutation({
    mutationFn: apiClient.addResume,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveResume = useMutation({
    mutationFn: apiClient.saveResume,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const analyzeResume = useMutation({
    mutationFn: apiClient.requestResumeAnalysis,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteResume = useMutation({
    mutationFn: apiClient.deleteResume,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  return {
    addResume,
    analyzeResume,
    deleteResume,
    saveResume,
  };
}
