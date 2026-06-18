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

  const scan = await new AxeBuilder({ page }).include('.auth-screen').analyze();
  const criticalViolations = scan.violations.filter((violation) => violation.impact === 'critical');

  expect(criticalViolations).toEqual([]);
});
