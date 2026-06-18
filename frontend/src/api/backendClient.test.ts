import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { server } from '../test/server';

describe('backendClient login error handling', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=test-csrf; path=/';
  });

  test('shows a Korean message when login credentials are invalid', async () => {
    server.use(
      http.post('/api/login/', () =>
        HttpResponse.json({
          error: true,
          message: '403: Authentication is required.\ndetailed_message: Invalid credentials',
        }),
      ),
    );

    const { apiClient } = await import('./backendClient');

    await expect(apiClient.login('unknown-user', 'wrong-password')).rejects.toThrow(
      '아이디 또는 비밀번호가 올바르지 않습니다.',
    );
  });
});
