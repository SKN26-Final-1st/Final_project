import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5208);
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

function fulfillJson(route, body) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Set-Cookie': 'csrftoken=test; Path=/' },
    body: JSON.stringify(body),
  });
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const account = {
    id: 1,
    username: 'new-company',
    account_hash: 'hash',
    name: '신규 담당자',
    verification_question: 'q',
    verification_answer: 'a',
    credit: 1000,
    subscribe: false,
    subscribe_expiration: '',
  };
  const company = {
    id: 1,
    company_name: 'HumouR',
    employee_count: 5,
    team_composition: [],
    company_description: '',
    employ_style: [],
  };
  const createdJd = {
    id: 77,
    job_name: 'Frontend Engineer',
    education_level: '',
    major: '',
    career_level: '3년 이상',
    required_skill: ['React'],
    preferred_skill: [],
    main_task: '',
    hiring_reason: '',
    work_type: '',
    status: 'prepare',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
  let added = false;
  let addCalls = 0;
  let addPayload = null;
  let deleteCalls = 0;
  let deletePayload = null;

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    const path = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');

    if (path === 'csrf') return fulfillJson(route, { error: false, message: 'CSRF cookie set' });
    if (path === 'account/get') return fulfillJson(route, { error: false, data: account });
    if (path === 'compinfo/get') return fulfillJson(route, { error: false, data: company });
    if (path === 'jd/get') return fulfillJson(route, { error: false, data: added ? [createdJd] : [] });
    if (path === 'resume/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'report/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'jd/add') {
      addCalls += 1;
      addPayload = route.request().postDataJSON();
      added = true;
      return fulfillJson(route, { error: false, data: createdJd });
    }
    if (path === 'jd/modify') {
      deleteCalls += 1;
      deletePayload = route.request().postDataJSON();
      if (deletePayload?.delete) {
        added = false;
      }
      return fulfillJson(route, { error: false, data: createdJd });
    }

    return fulfillJson(route, { error: false, data: [] });
  });

  await page.goto(`${baseUrl}/jd`, { waitUntil: 'networkidle' });
  await page.locator('.jd-editor-form').waitFor({ timeout: 10000 });
  await page.getByText('등록된 JD가 없습니다.').waitFor({ timeout: 10000 });
  const newJdButtons = await page.locator('button', { hasText: '새 JD 작성' }).count();
  if (newJdButtons !== 1) {
    throw new Error(`Expected exactly one 새 JD 작성 button in empty JD state, received ${newJdButtons}.`);
  }

  const pageActionButtons = await page.locator('.page-actions button').allInnerTexts();
  if (pageActionButtons.length !== 2) {
    throw new Error(`JD page title actions must only contain save and analysis buttons. Found: ${pageActionButtons.join(' / ')}`);
  }

  await page.getByRole('button', { name: /JD 등록/ }).click();
  await page.waitForTimeout(500);

  if (addCalls !== 0) {
    throw new Error('JD add request must not be sent when required fields are missing.');
  }

  await page.locator('#job_name').fill('Frontend Engineer');
  await page.locator('#career_level').fill('3년 이상');
  const requiredSkillField = page.locator('.jd-editor-form .collapsible-editable-list-field').first();
  await requiredSkillField.locator('.collapsible-editable-list-summary button').click();
  await requiredSkillField.locator('.editable-string-list button').last().click();
  await requiredSkillField.locator('input').first().fill('React');
  await page.getByRole('button', { name: /JD 등록/ }).click();
  await page.getByText('Frontend Engineer').waitFor({ timeout: 10000 });
  await page.locator('.jd-card-delete-button').waitFor({ timeout: 10000 });

  if (addCalls !== 1) {
    throw new Error(`Expected one jd/add request, received ${addCalls}.`);
  }

  if (
    addPayload?.job_name !== 'Frontend Engineer' ||
    addPayload?.career_level !== '3년 이상' ||
    !Array.isArray(addPayload?.required_skill) ||
    addPayload.required_skill[0] !== 'React'
  ) {
    throw new Error(`Invalid jd/add payload: ${JSON.stringify(addPayload)}`);
  }

  await page.locator('.jd-card-delete-button').first().click();
  await page.locator('.jd-delete-modal', { hasText: 'JD를 삭제하시겠습니까?' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '취소', exact: true }).click();

  if (deleteCalls !== 0) {
    throw new Error('JD delete request must not be sent when confirmation is cancelled.');
  }

  await page.locator('.jd-card-delete-button').first().click();
  await page.locator('.jd-delete-modal', { hasText: 'JD를 삭제하시겠습니까?' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.waitForTimeout(500);

  if (deleteCalls !== 1 || deletePayload?.id !== 77 || deletePayload?.delete !== true) {
    throw new Error(`Invalid JD delete flow. calls=${deleteCalls}, payload=${JSON.stringify(deletePayload)}`);
  }

  await browser.close();
  console.log('JD create flow checks passed.');
} finally {
  server.kill();
}
