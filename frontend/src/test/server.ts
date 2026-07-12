import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  http.get('/api/csrf/', () => HttpResponse.json({
    error: false,
    message: 'CSRF cookie set',
    csrfToken: 'test-csrf',
  })),
  http.post('/api/checkuser/', async ({ request }) => {
    const body = (await request.json()) as { username?: string };

    return HttpResponse.json({
      error: false,
      valid: body.username !== 'taken-user',
    });
  }),
];

export const server = setupServer(...handlers);
