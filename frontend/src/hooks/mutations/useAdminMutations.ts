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

export function useAdminMutations(showAlert: ShowAlert) {
  const invalidateAppData = useInvalidateAppData();

  const createAuthKey = useMutation({
    mutationFn: apiClient.addAuthKey,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveAuthKey = useMutation({
    mutationFn: apiClient.saveAuthKey,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const deleteAuthKey = useMutation({
    mutationFn: apiClient.deleteAuthKey,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  const saveAccount = useMutation({
    mutationFn: apiClient.saveUserProfile,
    onSuccess: async (response) => {
      alertSuccess(showAlert, response);
      await invalidateAppData();
    },
    onError: (error) => alertError(showAlert, error),
  });

  return {
    createAuthKey,
    deleteAuthKey,
    saveAccount,
    saveAuthKey,
  };
}
