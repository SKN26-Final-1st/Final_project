import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/backendClient';
import type { ApiResponse } from '../../data/backendTypes';
import type { ShowAlert } from '../../types/app';
import { useAuthSessionContext } from '../authSessionContext';
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
  const { apiKey: sessionApiKey, capabilities } = useAuthSessionContext();
  const apiKey = sessionApiKey ?? undefined;

  const addResume = useMutation({
    mutationFn: (body: Parameters<typeof apiClient.addResume>[0]) => {
      if (!capabilities.resume.create) throw new Error('현재 인증 방식에서는 새 자소서를 등록할 수 없습니다.');
      return apiClient.addResume(body);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveResume = useMutation({
    mutationFn: (body: Parameters<typeof apiClient.saveResume>[0]) => {
      if (!capabilities.resume.edit) throw new Error('현재 인증 방식에서는 자소서를 수정할 수 없습니다.');
      return apiClient.saveResume(body, apiKey);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const analyzeResume = useMutation({
    mutationFn: (resumeId: number) => {
      if (!capabilities.resume.analyze) throw new Error('현재 인증 방식에서는 자소서를 분석할 수 없습니다.');
      return apiClient.requestResumeAnalysis(resumeId, apiKey);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteResume = useMutation({
    mutationFn: (id: number) => {
      if (!capabilities.resume.delete) throw new Error('현재 인증 방식에서는 자소서를 삭제할 수 없습니다.');
      return apiClient.deleteResume(id, apiKey);
    },
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
