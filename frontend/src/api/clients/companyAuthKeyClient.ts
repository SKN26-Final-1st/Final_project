import type { AuthKey, CompanyInfo } from '../../data/backendTypes';
import { parseAuthKey, parseAuthKeys, parseCompanyInfo } from '../backendSchemas';
import { requestAction, requestBackend } from '../httpClient';
import { toApiResponse } from './clientCore';
import type {
  AuthKeyAddBody,
  AuthKeyModifyBody,
  CompanyInfoModifyBody,
  RequestControlOptions,
} from './clientContracts';

type ApiKeyCreditPayload = { credit: number };

export async function getCompanyInfoRaw(options: RequestControlOptions = {}) {
  return parseCompanyInfo(await requestBackend<CompanyInfo>('compinfo/get', {}, options));
}

export async function getApiKeyCreditRaw(apiKey: string, options: RequestControlOptions = {}) {
  return requestBackend<ApiKeyCreditPayload>('authkey/credit', {}, { ...options, apiKey });
}

export const companyAuthKeyClient = {
  getCompanyProfile: async () => toApiResponse('회사 정보를 불러왔습니다.', await getCompanyInfoRaw()),

  saveCompanyProfile: async (body: CompanyInfoModifyBody = {}) => {
    await requestAction('compinfo/modify', body);
    return toApiResponse('회사 정보가 저장되었습니다.', { updated_at: new Date().toISOString() });
  },

  getAuthKeys: async (options: RequestControlOptions = {}) =>
    toApiResponse(
      '인증 키 목록을 불러왔습니다.',
      parseAuthKeys(await requestBackend<AuthKey[]>('authkey/get', {}, options)),
    ),

  addAuthKey: async (body: AuthKeyAddBody) => {
    const data = parseAuthKey(await requestBackend<AuthKey>('authkey/add', body));
    return toApiResponse('인증 키를 생성했습니다.', data);
  },

  saveAuthKey: async (body: AuthKeyModifyBody) => {
    await requestAction('authkey/modify', body);
    return toApiResponse('인증 키를 저장했습니다.', { updated_at: new Date().toISOString() });
  },

  deleteAuthKey: async (id: number) => {
    await requestAction('authkey/modify', { id, delete: true });
    return toApiResponse('인증 키를 삭제했습니다.', { id });
  },
};
