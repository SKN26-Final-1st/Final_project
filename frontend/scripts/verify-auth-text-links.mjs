import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5207);
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
  const viteBin = resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
  const env = Object.fromEntries(
    Object.entries({ ...process.env, BROWSER: 'none' }).filter(([, value]) => value !== undefined),
  );

  return spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port)], {
    cwd: rootDir,
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

async function assertTextLink(page, selector, label) {
  const link = page.locator(selector);
  await link.waitFor({ timeout: 10000 });

  const styles = await link.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
    };
  });

  if ((await page.locator(`${selector}.ant-btn`).count()) !== 0) {
    throw new Error(`${label} must not render as an Ant Design button.`);
  }

  if (styles.borderWidth !== '0px' || styles.boxShadow !== 'none') {
    throw new Error(`${label} must look like text only. Styles: ${JSON.stringify(styles)}`);
  }
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const screenshotPaths = [];

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await assertTextLink(page, '.auth-links .auth-text-link:first-child', 'Signup link');
  await assertTextLink(page, '.auth-links .auth-text-link:last-child', 'Password reset link');
  screenshotPaths.push(resolve(tmpdir(), 'auth-login-text-links.png'));
  await page.screenshot({ path: screenshotPaths.at(-1), fullPage: true });

  await page.goto(`${baseUrl}/signup`, { waitUntil: 'networkidle' });
  await assertTextLink(page, '.auth-card .auth-card-return-link', 'Signup return link');
  screenshotPaths.push(resolve(tmpdir(), 'auth-signup-text-links.png'));
  await page.screenshot({ path: screenshotPaths.at(-1), fullPage: true });

  await page.goto(`${baseUrl}/password-reset`, { waitUntil: 'networkidle' });
  await assertTextLink(page, '.auth-card .auth-card-return-link', 'Password reset return link');
  screenshotPaths.push(resolve(tmpdir(), 'auth-password-reset-text-links.png'));
  await page.screenshot({ path: screenshotPaths.at(-1), fullPage: true });

  await browser.close();
  console.log(`Auth text link checks passed.\nScreenshots:\n${screenshotPaths.join('\n')}`);
} finally {
  server.kill();
}
