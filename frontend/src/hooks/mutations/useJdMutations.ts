import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/backendClient';
import { queryKeys } from '../../api/queryKeys';
import type { AnalysisReport, ApiResponse } from '../../data/backendTypes';
import type { ShowAlert } from '../../types/app';
import { useAuthSessionContext } from '../authSessionContext';
import {
  getMutationErrorMessage,
  shouldSuppressMutationError,
  useInvalidateAppData,
} from './useMutationHelpers';

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
  if (shouldSuppressMutationError(error)) {
    return;
  }

  showAlert({
    type: 'error',
    message: getMutationErrorMessage(error, 'API 요청에 실패했습니다.'),
  });
}

export function useJdMutations(showAlert: ShowAlert) {
  const invalidateAppData = useInvalidateAppData();
  const queryClient = useQueryClient();
  const { apiKey: sessionApiKey, capabilities } = useAuthSessionContext();
  const apiKey = sessionApiKey ?? undefined;
  const invalidateChecklist = (jobDescriptionId: number | string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.checklist(jobDescriptionId) });

  const addJd = useMutation({
    mutationFn: (body: Parameters<typeof apiClient.addJobDescription>[0]) => {
      if (!capabilities.jd.create) throw new Error('현재 인증 방식에서는 새 JD를 등록할 수 없습니다.');
      return apiClient.addJobDescription(body);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveJd = useMutation({
    mutationFn: (body: Parameters<typeof apiClient.saveJobDescription>[0]) => {
      if (!capabilities.jd.edit) throw new Error('현재 인증 방식에서는 JD를 수정할 수 없습니다.');
      return apiClient.saveJobDescription(body, apiKey);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteJd = useMutation({
    mutationFn: (id: number) => {
      if (!capabilities.jd.delete) throw new Error('현재 인증 방식에서는 JD를 삭제할 수 없습니다.');
      return apiClient.deleteJobDescription(id, apiKey);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const analyzeJd = useMutation<ApiResponse<{ report: AnalysisReport; resume_id: number }>, unknown, number>({
    mutationFn: (resumeId) => {
      if (!capabilities.jd.analyze) throw new Error('현재 인증 방식에서는 지원서를 분석할 수 없습니다.');
      return apiClient.requestResumeAnalysis(resumeId, apiKey);
    },
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const generateChecklist = useMutation({
    mutationFn: (payload: GenerateChecklistPayload) => {
      if (!capabilities.jd.analyze) throw new Error('현재 인증 방식에서는 체크리스트를 분석할 수 없습니다.');
      return apiClient.generateJdChecklist(payload.jdId, apiKey, { query: payload.query, cnt: payload.cnt });
    },
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
      await invalidateChecklist(payload.jdId);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const refreshChecklistFailure = useMutation({
    mutationFn: (id: number) => {
      if (!capabilities.jd.edit) throw new Error('현재 인증 방식에서는 JD 상태를 수정할 수 없습니다.');
      return apiClient.refreshJdChecklistFailure(id, apiKey);
    },
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
      await invalidateChecklist(payload);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const addChecklist = useMutation({
    mutationFn: (payload: ChecklistAddPayload) => {
      if (!capabilities.checklist.create) throw new Error('현재 인증 방식에서는 체크리스트를 추가할 수 없습니다.');
      return apiClient.addChecklist(payload, apiKey);
    },
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const updateChecklist = useMutation({
    mutationFn: (payload: ChecklistUpdatePayload) => {
      if (!capabilities.checklist.edit) throw new Error('현재 인증 방식에서는 체크리스트를 수정할 수 없습니다.');
      return apiClient.updateChecklist({ id: payload.id, content: payload.content }, apiKey);
    },
    onSuccess: async (response, payload) => {
      alertSuccess(showAlert, response);
      await invalidateChecklist(payload.job_description_id);
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteChecklist = useMutation({
    mutationFn: (payload: ChecklistDeletePayload) => {
      if (!capabilities.checklist.delete) throw new Error('현재 인증 방식에서는 체크리스트를 삭제할 수 없습니다.');
      return apiClient.deleteChecklist(payload.id, apiKey);
    },
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
