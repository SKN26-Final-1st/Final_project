import { http, HttpResponse } from 'msw';
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
