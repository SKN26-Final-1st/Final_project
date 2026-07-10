import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/backendClient';
import type { ApiResponse } from '../../data/backendTypes';
import type { ShowAlert } from '../../types/app';
import { getStoredApiKey } from '../../utils/apiKeySession';
import {
  getMutationErrorMessage,
  shouldSuppressMutationError,
  useInvalidateAppData,
} from './useMutationHelpers';

function alertSuccess<T>(showAlert: ShowAlert, response: ApiResponse<T>) {
  showAlert({
    type: response.error ? 'error' : 'success',
    message: response.message ?? (response.error ? 'API 요청이 실패했습니다.' : '요청이 완료되었습니다.'),
  });
}

function alertError(showAlert: ShowAlert, error: unknown) {
  if (shouldSuppressMutationError(error)) {
    return;
  }

  showAlert({
    type: 'error',
    message: getMutationErrorMessage(error, 'API 요청에 실패했습니다.'),
  });
}

export function useResumeMutations(showAlert: ShowAlert) {
  const invalidateAppData = useInvalidateAppData();
  const apiKey = getStoredApiKey() ?? undefined;

  const addResume = useMutation({
    mutationFn: apiClient.addResume,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveResume = useMutation({
    mutationFn: (body: Parameters<typeof apiClient.saveResume>[0]) => apiClient.saveResume(body, apiKey),
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const analyzeResume = useMutation({
    mutationFn: (resumeId: number) => apiClient.requestResumeAnalysis(resumeId, apiKey),
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteResume = useMutation({
    mutationFn: (id: number) => apiClient.deleteResume(id, apiKey),
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
