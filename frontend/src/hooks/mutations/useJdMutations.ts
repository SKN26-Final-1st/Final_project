import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/backendClient';
import { queryKeys } from '../../api/queryKeys';
import type { ApiResponse } from '../../data/backendTypes';
import type { ShowAlert } from '../../types/app';
import { useInvalidateAppData } from './useMutationHelpers';

type ChecklistAddPayload = {
  job_description_id: number;
  content: string;
};

type ChecklistUpdatePayload = ChecklistAddPayload & {
  id: number;
};

type ChecklistDeletePayload = {
  id: number;
  job_description_id: number;
};

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
  const queryClient = useQueryClient();
  const invalidateChecklist = (jobDescriptionId: number | string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.checklist(jobDescriptionId) });

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

  const generateChecklist = useMutation({
    mutationFn: apiClient.generateJdChecklist,
    onSuccess: async (response, jdId) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(jdId);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const addChecklist = useMutation({
    mutationFn: (payload: ChecklistAddPayload) => apiClient.addChecklist(payload),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const updateChecklist = useMutation({
    mutationFn: (payload: ChecklistUpdatePayload) =>
      apiClient.updateChecklist({ id: payload.id, content: payload.content }),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteChecklist = useMutation({
    mutationFn: (payload: ChecklistDeletePayload) => apiClient.deleteChecklist(payload.id),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  return {
    addJd,
    addChecklist,
    analyzeJd,
    deleteChecklist,
    deleteJd,
    generateChecklist,
    saveJd,
    updateChecklist,
  };
}
