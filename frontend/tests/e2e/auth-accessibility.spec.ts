import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const port = Number(process.env.E2E_PORT || 5181);
const baseUrl = `http://127.0.0.1:${port}`;
let server: ChildProcess | null = null;

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(baseUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // Retry until Vite is ready.
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 400));
  }

  throw new Error('Vite server did not start for e2e tests.');
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

test('login page has no critical accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await page.locator('.auth-screen').waitFor();

  const desktopColumns = await page.locator('.auth-main').evaluate(
    (element) => window.getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
  );
  expect(desktopColumns).toBe(2);

  const scan = await new AxeBuilder({ page }).include('.auth-screen').analyze();
  const criticalViolations = scan.violations.filter((violation) => violation.impact === 'critical');

  expect(criticalViolations).toEqual([]);
});

test.describe('short mobile login layout', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('keeps account login actions in the first viewport without horizontal overflow', async ({ page }) => {
    await page.goto('/login');
    await page.locator('.auth-login-tabs').waitFor();

    const loginTabs = page.locator('.auth-login-tabs');
    await expect(loginTabs.getByRole('button', { name: /로그인/ })).toBeInViewport({ ratio: 1 });
    await expect(loginTabs.getByRole('button', { name: '회원가입' })).toBeInViewport({ ratio: 1 });
    await expect(loginTabs.getByRole('button', { name: '비밀번호 찾기' })).toBeInViewport({ ratio: 1 });

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow).toEqual({ body: 0, document: 0 });

    const scan = await new AxeBuilder({ page }).include('.auth-screen').analyze();
    expect(scan.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
  });

  test('keeps the API Key login submit action in the first viewport', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'API Key 로그인' }).click();

    await expect(
      page.locator('.auth-login-tabs').getByRole('button', { name: /API Key로 로그인/ }),
    ).toBeInViewport({ ratio: 1 });
  });
});

test.describe('standard mobile login layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps account login actions accessible without horizontal overflow', async ({ page }) => {
    await page.goto('/login');
    await page.locator('.auth-login-tabs').waitFor();

    const loginTabs = page.locator('.auth-login-tabs');
    await expect(loginTabs.getByRole('button', { name: /로그인/ })).toBeInViewport({ ratio: 1 });
    await expect(loginTabs.getByRole('button', { name: '회원가입' })).toBeInViewport({ ratio: 1 });
    await expect(loginTabs.getByRole('button', { name: '비밀번호 찾기' })).toBeInViewport({ ratio: 1 });

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow).toEqual({ body: 0, document: 0 });
  });
});
