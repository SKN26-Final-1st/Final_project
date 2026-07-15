import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { server } from '../test/server';

describe('httpClient API key handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_KEY', 'bundled-secret-key');
    document.cookie = 'csrftoken=test-csrf; path=/';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('does not attach bundled VITE_API_KEY to regular session requests', async () => {
    let observedApiKey: string | null = null;
    server.use(
      http.post('/api/account/get/', ({ request }) => {
        observedApiKey = request.headers.get('X-API-Key');
        return HttpResponse.json({ error: false, data: { id: 1 } });
      }),
    );

    const { requestBackend } = await import('./httpClient');
    await requestBackend('account/get');

    expect(observedApiKey).toBeNull();
  });

  test('attaches only the explicit per-request API key', async () => {
    let observedApiKey: string | null = null;
    server.use(
      http.post('/api/resume/get/', ({ request }) => {
        observedApiKey = request.headers.get('X-API-Key');
        return HttpResponse.json({ error: false, data: [] });
      }),
    );

    const { requestBackend } = await import('./httpClient');
    await requestBackend('resume/get', {}, { apiKey: 'shared-key' });

    expect(observedApiKey).toBe('shared-key');
  });
});

describe('httpClient production-safe error messages', () => {
  beforeEach(() => {
    vi.resetModules();
    document.cookie = 'csrftoken=test-csrf; path=/';
  });

  test('hides internal server details from an error envelope', async () => {
    server.use(
      http.post('/api/report/get/', () =>
        HttpResponse.json(
          { error: true, message: '500: Internal server error. detailed_message: private stack' },
          { status: 500 },
        ),
      ),
    );
    const { requestBackend } = await import('./httpClient');

    await expect(requestBackend('report/get')).rejects.toThrow(
      '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  test('hides a plain-text HTTP 500 response', async () => {
    server.use(http.post('/api/report/get/', () => new HttpResponse('private stack trace', { status: 500 })));
    const { requestBackend } = await import('./httpClient');

    await expect(requestBackend('report/get')).rejects.toThrow(
      '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  test('preserves credit shortage as an actionable message', async () => {
    server.use(
      http.post('/api/resume/analyze/', () =>
        HttpResponse.json({ error: true, message: 'Not enough credit.' }, { status: 400 }),
      ),
    );
    const { requestBackend } = await import('./httpClient');

    await expect(requestBackend('resume/analyze')).rejects.toThrow('Credit이 부족합니다.');
  });
});

describe('httpClient authentication expiry handling', () => {
  beforeEach(() => {
    vi.resetModules();
    document.cookie = 'csrftoken=test-csrf; path=/';
  });

  test('preserves HTTP auth error details and notifies the session handler', async () => {
    server.use(
      http.post('/api/account/get/', () =>
        HttpResponse.json(
          { error: true, message: 'Authentication is required.' },
          { status: 401 },
        ),
      ),
    );
    const onAuthExpired = vi.fn();
    const { requestBackend, setAuthExpiryHandler } = await import('./httpClient');
    const removeHandler = setAuthExpiryHandler(onAuthExpired);

    await expect(requestBackend('account/get')).rejects.toMatchObject({
      backendError: true,
      endpoint: 'account/get',
      isAuthError: true,
      status: 401,
    });
    expect(onAuthExpired).toHaveBeenCalledTimes(1);

    removeHandler();
  });

  test('handles an HTTP 200 authentication error envelope once for concurrent protected requests', async () => {
    server.use(
      http.post('/api/report/get/', () =>
        HttpResponse.json({ error: true, message: '403: Authentication is required for this request.' }),
      ),
    );
    const onAuthExpired = vi.fn();
    const { requestBackend, setAuthExpiryHandler } = await import('./httpClient');
    setAuthExpiryHandler(onAuthExpired);

    const results = await Promise.allSettled([
      requestBackend('report/get'),
      requestBackend('report/get'),
    ]);

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
    expect(results[0]).toMatchObject({
      reason: {
        backendError: true,
        endpoint: 'report/get',
        isAuthError: true,
        status: 200,
      },
    });
  });

  test('keeps shared and credential validation failures local when requested', async () => {
    server.use(
      http.post('/api/resume/get/', () =>
        HttpResponse.json({ error: true, message: '403: Authentication is required for this request.' }),
      ),
    );
    const onAuthExpired = vi.fn();
    const { requestBackend, setAuthExpiryHandler } = await import('./httpClient');
    setAuthExpiryHandler(onAuthExpired);

    await expect(
      requestBackend('resume/get', {}, { authFailurePolicy: 'local' }),
    ).rejects.toMatchObject({
      authFailurePolicy: 'local',
      isAuthError: true,
    });
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  test('passes AbortSignal to Axios and exposes cancellation without an auth notification', async () => {
    server.use(
      http.post('/api/chat/', async () => {
        await delay(1_000);
        return HttpResponse.json({ error: false, data: { response: { message: 'late' } } });
      }),
    );
    const onAuthExpired = vi.fn();
    const controller = new AbortController();
    const { requestAction, setAuthExpiryHandler } = await import('./httpClient');
    setAuthExpiryHandler(onAuthExpired);

    const request = requestAction('chat', {}, { signal: controller.signal });
    controller.abort();

    await expect(request).rejects.toMatchObject({ cancelled: true });
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  test('does not treat non-auth backend error codes in HTTP 200 envelopes as session expiry', async () => {
    server.use(
      http.post('/api/jd/modify/', () =>
        HttpResponse.json({ error: true, message: '401: Required field is missing.' }),
      ),
      http.post('/api/report/modify/', () =>
        HttpResponse.json({ error: true, message: '403: Permission denied for this report.' }),
      ),
    );
    const onAuthExpired = vi.fn();
    const { requestAction, setAuthExpiryHandler } = await import('./httpClient');
    setAuthExpiryHandler(onAuthExpired);

    await expect(requestAction('jd/modify')).rejects.toMatchObject({ isAuthError: false });
    await expect(requestAction('report/modify')).rejects.toMatchObject({ isAuthError: false });
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  test('ignores an auth failure from a request that belongs to an older authenticated session', async () => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    server.use(
      http.post('/api/account/get/', async () => {
        await responseGate;
        return HttpResponse.json({ error: true, message: '403: Authentication is required.' });
      }),
    );
    const onAuthExpired = vi.fn();
    const { requestBackend, resetAuthExpiryHandling, setAuthExpiryHandler } = await import('./httpClient');
    setAuthExpiryHandler(onAuthExpired);

    const oldSessionRequest = requestBackend('account/get');
    resetAuthExpiryHandling();
    releaseResponse();

    await expect(oldSessionRequest).rejects.toMatchObject({ isAuthError: true });
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  test('aborts all active protected requests during authenticated session teardown', async () => {
    server.use(
      http.post('/api/chat/', async () => {
        await delay(1_000);
        return HttpResponse.json({ error: false, data: {} });
      }),
    );
    const { abortAuthenticatedRequests, requestAction } = await import('./httpClient');
    const request = requestAction('chat');

    abortAuthenticatedRequests();

    await expect(request).rejects.toMatchObject({ cancelled: true });
  });
});
