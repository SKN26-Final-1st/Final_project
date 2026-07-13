import { expect, test, type Page, type Route } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const port = Number(process.env.E2E_SECURITY_PORT || 5182);
const baseUrl = `http://127.0.0.1:${port}`;
const rawApiKey = 'sk_live_e2e_security_secret_tail99';
let server: ChildProcess | null = null;
const observedRequests: string[] = [];

const account = {
  id: 1,
  username: 'security-user',
  name: 'Security User',
  verification_question: 'Question',
  account_hash: 'must-be-discarded',
  verification_answer: 'must-be-discarded',
  credit: 500,
  subscribe: false,
  subscribe_expiration: '',
};

const company = {
  id: 1,
  company_name: 'Security Company',
  employee_count: 10,
  team_composition: [],
  company_description: '',
  employ_style: [],
};

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Retry until Vite is ready.
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 400));
  }

  throw new Error('Vite server did not start for security e2e tests.');
}

function json(route: Route, body: unknown) {
  return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function installBackendRoutes(page: Page) {
  let accountAuthenticated = false;

  await page.route(`${baseUrl}/api/**`, async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    const hasApiKeyHeader = Boolean(route.request().headers()['x-api-key']);
    observedRequests.push(`${endpoint}:${hasApiKeyHeader ? 'api-key' : 'session'}`);

    if (endpoint === '/api/login/') {
      accountAuthenticated = true;
      return json(route, { error: false, data: {} });
    }

    if (endpoint === '/api/logout/') {
      accountAuthenticated = false;
      return json(route, { error: false, data: {} });
    }

    if (endpoint === '/api/account/get/') {
      return accountAuthenticated
        ? json(route, { error: false, data: account })
        : json(route, { error: true, message: '403: Authentication is required.' });
    }

    if (endpoint === '/api/compinfo/get/') return json(route, { error: false, data: company });
    if (endpoint === '/api/jd/get/') return json(route, { error: false, data: [] });
    if (endpoint === '/api/authkey/get/') return json(route, { error: false, data: [] });
    if (endpoint === '/api/authkey/credit/') return json(route, { error: false, data: { credit: 500 } });
    if (endpoint === '/api/csrf/') return json(route, { error: false, data: {} });

    return json(route, { error: false, data: [] });
  });
}

test.beforeAll(async () => {
  const viteBin = resolve('node_modules', 'vite', 'bin', 'vite.js');
  server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port)], {
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'ignore',
  });
  await waitForServer();
});

test.afterAll(() => {
  server?.kill();
  server = null;
});

test.beforeEach(async ({ context, page }) => {
  observedRequests.length = 0;
  await context.addCookies([{ name: 'csrftoken', value: 'e2e-csrf', url: baseUrl }]);
  await installBackendRoutes(page);
});

test('account sessions keep account-only routes available without rendering sensitive response fields', async ({ page }) => {
  await page.goto(`${baseUrl}/login`);
  await page.locator('.auth-screen').waitFor();
  await page.locator('#username').fill('security-user');
  await page.locator('#password').fill('password');
  await page.locator('form:has(#username) button[type="submit"]').click();

  await expect(page).toHaveURL(`${baseUrl}/dashboard`);
  await page.goto(`${baseUrl}/admin`);
  await expect(page).toHaveURL(`${baseUrl}/admin`);
  await expect(page.locator('.side-nav-item')).toHaveCount(6);
  await expect(page.locator('body')).not.toContainText('must-be-discarded');
});

test('API Key sessions use restricted routes and remove the persisted key on logout', async ({ page }) => {
  await page.addInitScript(
    ({ storageKey, value }) => window.sessionStorage.setItem(storageKey, value),
    { storageKey: 'humour.apiKey', value: rawApiKey },
  );
  await page.goto(`${baseUrl}/jd`);

  await page.locator('.jd-page').waitFor();
  expect(page.url()).not.toContain(rawApiKey);
  await expect(page.locator('body')).not.toContainText(rawApiKey);
  expect(
    await page.evaluate(() => window.sessionStorage.getItem('humour.apiKey')),
    observedRequests.join(', '),
  ).toBe(rawApiKey);
  await expect(page.locator('.side-nav-item')).toHaveCount(3);

  await page.goto(`${baseUrl}/admin`);
  await expect(page).toHaveURL(`${baseUrl}/jd`);

  await page.locator('.sidebar-account-button').click();
  await page.locator('.account-menu-item.danger').click();
  await expect(page).toHaveURL(`${baseUrl}/login`);
  expect(await page.evaluate(() => window.sessionStorage.getItem('humour.apiKey'))).toBeNull();
  expect(page.url()).not.toContain(rawApiKey);
});
