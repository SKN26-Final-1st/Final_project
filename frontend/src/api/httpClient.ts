import axios, { AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

export type BackendEnvelope<T> = {
  error: boolean;
  data?: T;
  message?: string;
} & Record<string, unknown>;

export type AuthFailurePolicy = 'session' | 'local';

export type RequestOptions = {
  apiKey?: string;
  authFailurePolicy?: AuthFailurePolicy;
  signal?: AbortSignal;
};

type ApiKeyAxiosConfig = AxiosRequestConfig & {
  apiKey?: string;
};

const API_PROXY_TARGET = import.meta.env.VITE_API_PROXY_TARGET?.replace(/\/+$/, '');
const API_ROOT = API_PROXY_TARGET ? `${API_PROXY_TARGET}/api` : '/api';
const CSRF_RESPONSE_FIELD = 'csrfToken';
const CREDIT_SHORTAGE_MESSAGE = 'Credit이 부족합니다.';
const LOCAL_AUTH_FAILURE_ENDPOINTS = new Set([
  'checkuser',
  'login',
  'passqestion',
  'passreset',
  'signin',
]);
const AUTH_FAILURE_MESSAGE_PATTERN =
  /authentication\s+(?:is\s+)?required|not\s+authenticated|login\s+required|인증이?\s*필요|로그인이?\s*필요/i;

type BackendRequestErrorDetails = {
  authGeneration?: number;
  authFailurePolicy: AuthFailurePolicy;
  backendError: boolean;
  cancelled: boolean;
  endpoint: string;
  isAuthError: boolean;
  status?: number;
};

export class BackendRequestError extends Error {
  readonly authGeneration: number;
  readonly authFailurePolicy: AuthFailurePolicy;
  readonly backendError: boolean;
  readonly cancelled: boolean;
  readonly endpoint: string;
  readonly isAuthError: boolean;
  readonly status?: number;

  constructor(message: string, details: BackendRequestErrorDetails) {
    super(message);
    this.name = 'BackendRequestError';
    this.authGeneration = details.authGeneration ?? authGeneration;
    this.authFailurePolicy = details.authFailurePolicy;
    this.backendError = details.backendError;
    this.cancelled = details.cancelled;
    this.endpoint = details.endpoint;
    this.isAuthError = details.isAuthError;
    this.status = details.status;
  }
}

type AuthExpiryHandler = (error: BackendRequestError) => void | Promise<void>;

let authExpiryHandler: AuthExpiryHandler | null = null;
let authExpiryHandled = false;
let authGeneration = 0;
let cachedCsrfToken = '';
const authenticatedRequestControllers = new Set<AbortController>();

export function setAuthExpiryHandler(handler: AuthExpiryHandler) {
  authExpiryHandler = handler;

  return () => {
    if (authExpiryHandler === handler) {
      authExpiryHandler = null;
    }
  };
}

export function resetAuthExpiryHandling() {
  authExpiryHandled = false;
  authGeneration += 1;
}

export function abortAuthenticatedRequests() {
  authenticatedRequestControllers.forEach((controller) => controller.abort());
  authenticatedRequestControllers.clear();
}

export const httpClient = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getCookie(name: string) {
  const cookies = document.cookie ? document.cookie.split('; ') : [];

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=');

    if (key === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return '';
}

function getCsrfTokenFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const record = payload as Record<string, unknown>;

  const value = record[CSRF_RESPONSE_FIELD];
  return typeof value === 'string' ? value : '';
}

async function fetchCsrfToken() {
  const response = await axios.get(`${API_ROOT}/csrf/`, {
    withCredentials: true,
  });

  cachedCsrfToken = getCsrfTokenFromPayload(response.data) || cachedCsrfToken;
  return response;
}

async function getCsrfToken() {
  let csrfToken = getCookie('csrftoken') || cachedCsrfToken;

  if (!csrfToken) {
    await fetchCsrfToken();
    csrfToken = getCookie('csrftoken') || cachedCsrfToken;
  }

  if (!csrfToken) {
    throw new Error('CSRF 토큰을 발급받지 못했습니다. frontend dev server가 5173 포트로 실행 중인지 확인하세요.');
  }

  return csrfToken;
}

function normalizeEndpoint(endpoint: string) {
  return `/${endpoint.replace(/^\/+|\/+$/g, '')}/`;
}

export function normalizePayload<T>(payload: unknown, status: number, statusText: string): BackendEnvelope<T> {
  if (payload && typeof payload === 'object') {
    const envelope = payload as BackendEnvelope<T>;

    if ('error' in envelope || 'data' in envelope) {
      return envelope;
    }

    return {
      error: false,
      data: payload as T,
      message: statusText,
    };
  }

  return {
    error: status >= 400,
    data: payload as T,
    message: typeof payload === 'string' ? payload : statusText,
  };
}

export function getRequestErrorMessage(error: unknown, fallback: string) {
  const toFriendlyMessage = (message: string) => {
    if (/not enough credit|credit이 부족|credit 부족|크레딧.*부족|부족.*크레딧/i.test(message)) {
      return CREDIT_SHORTAGE_MESSAGE;
    }

    return message;
  };

  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
      const message = responseData.message;

      if (typeof message === 'string' && message) {
        return toFriendlyMessage(message);
      }
    }

    if (typeof responseData === 'string' && responseData) {
      return toFriendlyMessage(responseData);
    }

    return toFriendlyMessage(error.message || fallback);
  }

  return toFriendlyMessage(error instanceof Error ? error.message : fallback);
}

export function isRequestCancelled(error: unknown) {
  return error instanceof BackendRequestError
    ? error.cancelled
    : axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED');
}

export function isSessionAuthExpiredError(error: unknown) {
  return error instanceof BackendRequestError
    && error.authFailurePolicy === 'session'
    && error.isAuthError;
}

function getAuthFailurePolicy(endpoint: string, options: RequestOptions) {
  if (options.authFailurePolicy) {
    return options.authFailurePolicy;
  }

  return LOCAL_AUTH_FAILURE_ENDPOINTS.has(endpoint.replace(/^\/+|\/+$/g, '')) ? 'local' : 'session';
}

function isAuthenticationFailure(message: string, status?: number) {
  return status === 401 || status === 403 || AUTH_FAILURE_MESSAGE_PATTERN.test(message);
}

function createBackendRequestError(
  message: string,
  endpoint: string,
  authFailurePolicy: AuthFailurePolicy,
  options: Partial<
    Pick<BackendRequestErrorDetails, 'authGeneration' | 'backendError' | 'cancelled' | 'status'>
  > = {},
) {
  const cancelled = options.cancelled ?? false;

  return new BackendRequestError(message, {
    authGeneration: options.authGeneration,
    authFailurePolicy,
    backendError: options.backendError ?? false,
    cancelled,
    endpoint,
    isAuthError: !cancelled && isAuthenticationFailure(message, options.status),
    status: options.status,
  });
}

function toBackendRequestError(
  error: unknown,
  endpoint: string,
  authFailurePolicy: AuthFailurePolicy,
  requestGeneration: number,
  fallback: string,
) {
  if (error instanceof BackendRequestError) {
    return error;
  }

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const responseData = axios.isAxiosError(error) ? error.response?.data : undefined;
  const backendError = Boolean(status && status >= 400) || Boolean(
    responseData
      && typeof responseData === 'object'
      && 'error' in responseData
      && responseData.error,
  );
  const cancelled = isRequestCancelled(error);
  const message = cancelled ? '요청이 취소되었습니다.' : getRequestErrorMessage(error, fallback);

  return createBackendRequestError(message, endpoint, authFailurePolicy, {
    authGeneration: requestGeneration,
    backendError,
    cancelled,
    status,
  });
}

function notifyAuthExpiry(error: BackendRequestError) {
  if (
    error.authFailurePolicy !== 'session'
    || !error.isAuthError
    || error.cancelled
    || error.authGeneration !== authGeneration
    || authExpiryHandled
    || !authExpiryHandler
  ) {
    return;
  }

  authExpiryHandled = true;
  void Promise.resolve(authExpiryHandler(error)).catch(() => undefined);
}

function createRequestLifecycle(options: RequestOptions, authFailurePolicy: AuthFailurePolicy) {
  if (authFailurePolicy === 'local') {
    return {
      dispose: () => undefined,
      signal: options.signal,
    };
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  authenticatedRequestControllers.add(controller);

  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  return {
    dispose: () => {
      options.signal?.removeEventListener('abort', abortFromCaller);
      authenticatedRequestControllers.delete(controller);
    },
    signal: controller.signal,
  };
}

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers);
  const apiKey = (config as InternalAxiosRequestConfig & RequestOptions).apiKey;

  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  if ((config.method ?? 'get').toLowerCase() === 'get') {
    config.headers = headers;
    return config;
  }

  const csrfToken = await getCsrfToken();

  if (csrfToken) {
    headers.set('X-CSRFToken', csrfToken);
  }

  config.headers = headers;
  return config;
});

function requestConfig(options: RequestOptions = {}) {
  const config: ApiKeyAxiosConfig = {};

  if (options.apiKey) {
    config.apiKey = options.apiKey;
  }

  if (options.signal) {
    config.signal = options.signal;
  }

  return config;
}

export async function requestBackend<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: RequestOptions = {},
): Promise<T> {
  const authFailurePolicy = getAuthFailurePolicy(endpoint, options);
  const requestGeneration = authGeneration;
  const requestLifecycle = createRequestLifecycle(options, authFailurePolicy);

  try {
    const response = await httpClient.post<BackendEnvelope<T> | T | string>(
      normalizeEndpoint(endpoint),
      body,
      requestConfig({ ...options, signal: requestLifecycle.signal }),
    );
    const payload = normalizePayload<T>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw createBackendRequestError(
        payload.message || `API 요청 실패: ${endpoint}`,
        endpoint,
        authFailurePolicy,
        { authGeneration: requestGeneration, backendError: true, status: response.status },
      );
    }

    return payload.data as T;
  } catch (error) {
    const requestError = toBackendRequestError(
      error,
      endpoint,
      authFailurePolicy,
      requestGeneration,
      `API 요청 실패: ${endpoint}`,
    );
    notifyAuthExpiry(requestError);
    throw requestError;
  } finally {
    requestLifecycle.dispose();
  }
}

export async function requestAction(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: RequestOptions = {},
) {
  const authFailurePolicy = getAuthFailurePolicy(endpoint, options);
  const requestGeneration = authGeneration;
  const requestLifecycle = createRequestLifecycle(options, authFailurePolicy);

  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>(
      normalizeEndpoint(endpoint),
      body,
      requestConfig({ ...options, signal: requestLifecycle.signal }),
    );
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw createBackendRequestError(
        payload.message || `API 요청 실패: ${endpoint}`,
        endpoint,
        authFailurePolicy,
        { authGeneration: requestGeneration, backendError: true, status: response.status },
      );
    }

    return payload;
  } catch (error) {
    const requestError = toBackendRequestError(
      error,
      endpoint,
      authFailurePolicy,
      requestGeneration,
      `API 요청 실패: ${endpoint}`,
    );
    notifyAuthExpiry(requestError);
    throw requestError;
  } finally {
    requestLifecycle.dispose();
  }
}
