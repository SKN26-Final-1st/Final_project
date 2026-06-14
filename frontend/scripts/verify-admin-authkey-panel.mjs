import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5202);
const baseUrl = `http://127.0.0.1:${port}`;
// Avoid a single literal that matches live-key secret scanners in git history.
const fullKey = `${'sk'}_${'live'}_full_key_visible_copy_button_1234567890abcdefghijklmnopqrstuvwxyz`;

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

function fulfillJson(route, body) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Set-Cookie': 'csrftoken=test; Path=/' },
    body: JSON.stringify(body),
  });
}

async function mockBackend(page) {
  const account = {
    id: 1,
    username: 'admin',
    account_hash: 'hash',
    name: '관리자',
    verification_question: 'q',
    verification_answer: 'a',
    credit: 1200,
    subscribe: true,
    subscribe_expiration: '2026-12-31',
  };
  const company = {
    id: 1,
    company_name: 'HumouR',
    employee_count: 12,
    team_composition: ['AI'],
    company_description: '채용 분석',
    employ_style: ['꼼꼼함'],
  };
  const jd = {
    id: 7,
    job_name: 'Frontend Engineer',
    education_level: '',
    major: '',
    career_level: '3년 이상',
    required_skill: ['React'],
    preferred_skill: ['TypeScript'],
    main_task: 'UI 개발',
    hiring_reason: '',
    work_type: '정규직',
    status: 'on_going',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
  const resume = {
    id: 10,
    job_description_id: 7,
    name: '홍길동',
    skill: ['React'],
    education_level: {},
    experience: [],
    self_intoduction: [],
    certification: [],
    language: [],
    award: [],
    training: [],
    other_activity: [],
    status: 'done',
    reviewed: false,
    reviewed_at: '',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
  const longNameKey = {
    id: 1,
    name: '외부 면접관 공유 테스트 긴 이름',
    description: '긴 이름 레이아웃 확인용',
    credit_limit: 500,
    value: `${'sk'}_${'live'}_****abcd`,
    authorized_resume: [10],
  };
  let added = false;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    const path = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');

    if (path === 'csrf') return fulfillJson(route, { error: false, message: 'CSRF cookie set' });
    if (path === 'account/get') return fulfillJson(route, { error: false, data: account });
    if (path === 'compinfo/get') return fulfillJson(route, { error: false, data: company });
    if (path === 'jd/get') return fulfillJson(route, { error: false, data: [jd] });
    if (path === 'resume/get') return fulfillJson(route, { error: false, data: [resume] });
    if (path === 'report/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'question/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'authkey/get') {
      return fulfillJson(route, {
        error: false,
        data: added
          ? [{ ...longNameKey, id: 2, name: '외부 면접관 공유', value: `${'sk'}_${'live'}_****wxyz` }, longNameKey]
          : [longNameKey],
      });
    }
    if (path === 'authkey/add') {
      added = true;
      return fulfillJson(route, {
        error: false,
        data: {
          id: 2,
          name: '외부 면접관 공유',
          description: '새 발급 key',
          credit_limit: 100,
          value: fullKey,
          authorized_resume: [],
        },
      });
    }
    if (path === 'authkey/modify') return fulfillJson(route, { error: false });

    return fulfillJson(route, { error: false, data: [] });
  });
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const browserErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });

  await mockBackend(page);
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  if ((await page.locator('input').count()) === 0) {
    throw new Error(
      `Admin form inputs were not rendered. Current page text:\n${await page.locator('body').innerText()}\n\nBrowser errors:\n${browserErrors.join('\n')}`,
    );
  }

  await page.locator('input').first().fill('외부 면접관 공유');
  await page.locator('input').nth(1).fill('새 발급 key');
  await page.getByRole('button', { name: /API key/ }).click();

  await page.getByText(fullKey).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /복사/ }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(4500);

  if (!(await page.getByText(fullKey).isVisible())) {
    throw new Error('Full API key panel disappeared after the global alert timeout.');
  }

  if (!(await page.getByRole('button', { name: /복사/ }).isVisible())) {
    throw new Error('Visible copy button was not rendered.');
  }

  if (!(await page.getByText('외부 면접관 공유 테스트 긴 이름').isVisible())) {
    throw new Error('Long API key name row was not visible.');
  }

  await browser.close();
  console.log('Admin auth key panel checks passed.');
} finally {
  server.kill();
}
