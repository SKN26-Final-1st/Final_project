import type { Account } from '../../data/backendTypes';
import { parseAccount } from '../backendSchemas';
import {
  getRequestErrorMessage,
  httpClient,
  normalizePayload,
  requestAction,
  requestBackend,
  type BackendEnvelope,
} from '../httpClient';
import { toApiResponse } from './clientCore';
import type { AccountModifyBody, RequestControlOptions, SignupBody } from './clientContracts';

type PingPayload = { ok: true };

const INVALID_LOGIN_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다.';

function getLoginErrorMessage(error: unknown) {
  const message = getRequestErrorMessage(error, '로그인에 실패했습니다.');
  return /invalid credentials/i.test(message) ? INVALID_LOGIN_MESSAGE : message;
}

async function loginRequest(username: string, password: string) {
  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>('/login/', { username, password });
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) throw new Error(payload.message || '로그인에 실패했습니다.');
    return payload;
  } catch (error) {
    throw new Error(getLoginErrorMessage(error));
  }
}

async function signinRequest(body: SignupBody) {
  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>('/signin/', body);
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) throw new Error(payload.message || '회원가입에 실패했습니다.');
    return payload;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error, '회원가입에 실패했습니다.'));
  }
}

async function pingRequest(): Promise<PingPayload> {
  const response = await httpClient.get<unknown>('/ping/');
  const payload = response.data;

  if (!payload || typeof payload !== 'object' || (payload as Partial<PingPayload>).ok !== true) {
    throw new Error('백엔드 healthcheck 응답이 올바르지 않습니다.');
  }
  return { ok: true };
}

async function checkUserRequest(username: string) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) throw new Error('아이디를 입력하세요.');
  const payload = await requestAction('checkuser', { username: trimmedUsername });
  if (typeof payload.valid !== 'boolean') throw new Error('아이디 중복 확인 응답이 올바르지 않습니다.');
  return payload.valid;
}

async function passwordQuestionRequest(username: string) {
  const payload = await requestAction('passqestion', { username });
  if (typeof payload.verification_question !== 'string') throw new Error('본인확인 질문을 불러오지 못했습니다.');
  return payload.verification_question;
}

async function passwordResetRequest(username: string, verificationAnswer: string) {
  const payload = await requestAction('passreset', { username, verification_answer: verificationAnswer });
  if (typeof payload.password !== 'string') throw new Error('재설정된 비밀번호를 불러오지 못했습니다.');
  return payload.password;
}

function sanitizeAccountModifyBody(body: AccountModifyBody): Record<string, unknown> {
  const allowedBody: Record<string, unknown> = { ...body };
  delete allowedBody.id;
  delete allowedBody.username;
  delete allowedBody.account_hash;
  return allowedBody;
}

export async function getAccountRaw(options: RequestControlOptions = {}) {
  return parseAccount(await requestBackend<Account>('account/get', {}, options));
}

export const authAccountClient = {
  ping: async () => toApiResponse('백엔드 연결을 확인했습니다.', await pingRequest()),

  getUserProfile: async (options: RequestControlOptions = {}) =>
    toApiResponse('계정 정보를 불러왔습니다.', await getAccountRaw(options)),

  login: async (username: string, password: string) => {
    await loginRequest(username, password);
    const account = await getAccountRaw({ authFailurePolicy: 'local' });
    return toApiResponse('로그인되었습니다.', { authenticated: true, account });
  },

  logout: async (options: RequestControlOptions = {}) => {
    await requestAction('logout', {}, options);
    return toApiResponse('로그아웃되었습니다.', { logout: true });
  },

  deleteAccount: async () => {
    await requestAction('account/modify', { delete: true });
    return toApiResponse('계정이 삭제되었습니다.', { delete: true });
  },

  saveUserProfile: async (body: AccountModifyBody = {}) => {
    await requestAction('account/modify', sanitizeAccountModifyBody(body));
    return toApiResponse('계정 수정사항을 저장했습니다.', { updated_at: new Date().toISOString() });
  },

  checkSignupId: async (username: string) => {
    const available = await checkUserRequest(username);
    return toApiResponse(available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.', { available });
  },

  completeSignup: async (body: SignupBody) => {
    await signinRequest(body);
    return toApiResponse('가입이 완료되었습니다.', { created: true });
  },

  getPasswordQuestion: async (username: string) => {
    const verificationQuestion = await passwordQuestionRequest(username);
    return toApiResponse('본인확인 질문을 불러왔습니다.', { verification_question: verificationQuestion });
  },

  resetPassword: async (username: string, verificationAnswer: string) => {
    const password = await passwordResetRequest(username, verificationAnswer);
    return toApiResponse('비밀번호 재설정을 완료했습니다.', { password });
  },
};
