import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/backendClient';
import { queryKeys } from '../../api/queryKeys';
import type { AnalysisReport, ApiResponse } from '../../data/backendTypes';
import type { ShowAlert } from '../../types/app';
import { getStoredApiKey } from '../../utils/apiKeySession';
import { getMutationErrorMessage, useInvalidateAppData } from './useMutationHelpers';

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

type GenerateChecklistPayload = {
  jdId: number | string;
  query?: string;
  cnt?: number;
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
    message: getMutationErrorMessage(error, 'API 요청에 실패했습니다.'),
  });
}

export function useJdMutations(showAlert: ShowAlert) {
  const invalidateAppData = useInvalidateAppData();
  const queryClient = useQueryClient();
  const apiKey = getStoredApiKey() ?? undefined;
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
    mutationFn: (body: Parameters<typeof apiClient.saveJobDescription>[0]) =>
      apiClient.saveJobDescription(body, apiKey),
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteJd = useMutation({
    mutationFn: (id: number) => apiClient.deleteJobDescription(id, apiKey),
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const analyzeJd = useMutation<ApiResponse<{ report: AnalysisReport; resume_id: number }>, unknown, number>({
    mutationFn: (resumeId) => apiClient.requestResumeAnalysis(resumeId, apiKey),
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const generateChecklist = useMutation({
    mutationFn: (payload: GenerateChecklistPayload) =>
      apiClient.generateJdChecklist(payload.jdId, apiKey, { query: payload.query, cnt: payload.cnt }),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
      await invalidateChecklist(payload.jdId);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const refreshChecklistFailure = useMutation({
    mutationFn: (id: number) => apiClient.refreshJdChecklistFailure(id, apiKey),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
      await invalidateChecklist(payload);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const addChecklist = useMutation({
    mutationFn: (payload: ChecklistAddPayload) => apiClient.addChecklist(payload, apiKey),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const updateChecklist = useMutation({
    mutationFn: (payload: ChecklistUpdatePayload) =>
      apiClient.updateChecklist({ id: payload.id, content: payload.content }, apiKey),
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteChecklist = useMutation({
    mutationFn: (payload: ChecklistDeletePayload) => apiClient.deleteChecklist(payload.id, apiKey),
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
    refreshChecklistFailure,
    saveJd,
    updateChecklist,
  };
}
