import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const port = Number(process.env.VERIFY_PORT || 5177);
const baseUrl = `http://127.0.0.1:${port}`;

const browserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA || ''}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error('Chrome 또는 Edge 실행 파일을 찾을 수 없습니다.');
}

function startDevServer() {
  const viteBin = resolve('node_modules', 'vite', 'bin', 'vite.js');
  const env = Object.fromEntries(
    Object.entries({ ...process.env, BROWSER: 'none' }).filter(([, value]) => value !== undefined),
  );

  return spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port)], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForServer(server) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 30000) {
    if (server.exitCode !== null) {
      throw new Error(`Vite 서버가 먼저 종료되었습니다. exit=${server.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 400));
  }

  throw new Error(`Vite 서버 대기 시간이 초과되었습니다. ${lastError?.message || ''}`.trim());
}

async function waitForPath(page, pathname) {
  await page.waitForFunction((expectedPath) => window.location.pathname === expectedPath, pathname, { timeout: 10000 });
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  await page.goto(`${baseUrl}/login`);
  await waitForPath(page, '/login');

  if ((await page.locator('.auth-header .auth-card-return-link').count()) !== 0) {
    throw new Error('Login page header must not render a duplicated login/return action.');
  }

  if ((await page.locator('.auth-card .auth-card-return-link').count()) !== 0) {
    throw new Error('Login card must not render a return link.');
  }

  if ((await page.locator('.auth-links .ant-btn').count()) !== 0) {
    throw new Error('Login auxiliary links must render as text links, not Ant Design buttons.');
  }

  await page.locator('.auth-logo-button').click();
  await waitForPath(page, '/login');

  await page.goto(`${baseUrl}/dashboard`);
  await waitForPath(page, '/login');

  let checkUserRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/checkuser/')) {
      checkUserRequests += 1;
    }
  });

  await page.goto(`${baseUrl}/signup`);
  await waitForPath(page, '/signup');
  if ((await page.locator('.auth-header .auth-card-return-link').count()) !== 0) {
    throw new Error('Signup page must not render return action in the outer header.');
  }
  const signupReturnButton = page.locator('.auth-card .auth-card-return-link');
  await signupReturnButton.waitFor({ timeout: 10000 });
  if ((await page.locator('.auth-card .auth-card-return-link.ant-btn').count()) !== 0) {
    throw new Error('Signup return link must render as text, not an Ant Design button.');
  }
  await signupReturnButton.click();
  await waitForPath(page, '/login');

  await page.goto(`${baseUrl}/password-reset`);
  await waitForPath(page, '/password-reset');
  if ((await page.locator('.auth-header .auth-card-return-link').count()) !== 0) {
    throw new Error('Password reset page must not render return action in the outer header.');
  }
  const resetReturnButton = page.locator('.auth-card .auth-card-return-link');
  await resetReturnButton.waitFor({ timeout: 10000 });
  if ((await page.locator('.auth-card .auth-card-return-link.ant-btn').count()) !== 0) {
    throw new Error('Password reset return link must render as text, not an Ant Design button.');
  }
  await resetReturnButton.click();
  await waitForPath(page, '/login');

  await page.goto(`${baseUrl}/signup`);
  await waitForPath(page, '/signup');
  await page.getByLabel('아이디').fill('   ');
  await page.getByRole('button', { name: '중복 확인' }).click();
  await page.getByText('아이디를 입력하세요.').waitFor({ timeout: 10000 });

  if (checkUserRequests !== 0) {
    throw new Error('Whitespace-only signup username must not call /api/checkuser/.');
  }

  await browser.close();
  console.log('Auth flow checks passed.');
} finally {
  server.kill();
}
