import axios, { AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

export type BackendEnvelope<T> = {
  error: boolean;
  data?: T;
  message?: string;
} & Record<string, unknown>;

export type RequestOptions = {
  apiKey?: string;
};

type ApiKeyAxiosConfig = AxiosRequestConfig & {
  apiKey?: string;
};

const API_ROOT = '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

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

async function fetchCsrfToken() {
  return axios.get(`${API_ROOT}/csrf/`, {
    withCredentials: true,
  });
}

async function getCsrfToken() {
  let csrfToken = getCookie('csrftoken');

  if (!csrfToken) {
    await fetchCsrfToken();
    csrfToken = getCookie('csrftoken');
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
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
      const message = responseData.message;

      if (typeof message === 'string' && message) {
        return message;
      }
    }

    if (typeof responseData === 'string' && responseData) {
      return responseData;
    }

    return error.message || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const headers = AxiosHeaders.from(config.headers);
  const apiKey = (config as InternalAxiosRequestConfig & RequestOptions).apiKey;

  if (apiKey ?? API_KEY) {
    headers.set('X-API-Key', apiKey ?? API_KEY);
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

  return config;
}

export async function requestBackend<T>(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: RequestOptions = {},
): Promise<T> {
  try {
    const response = await httpClient.post<BackendEnvelope<T> | T | string>(
      normalizeEndpoint(endpoint),
      body,
      requestConfig(options),
    );
    const payload = normalizePayload<T>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw new Error(payload.message || `API 요청 실패: ${endpoint}`);
    }

    return payload.data as T;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error, `API 요청 실패: ${endpoint}`));
  }
}

export async function requestAction(
  endpoint: string,
  body: Record<string, unknown> = {},
  options: RequestOptions = {},
) {
  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>(
      normalizeEndpoint(endpoint),
      body,
      requestConfig(options),
    );
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw new Error(payload.message || `API 요청 실패: ${endpoint}`);
    }

    return payload;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error, `API 요청 실패: ${endpoint}`));
  }
}
