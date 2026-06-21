import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5224);
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
  throw new Error('Chrome or Edge executable was not found.');
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
      throw new Error(`Vite server exited early. exit=${server.exitCode}`);
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

  throw new Error(`Timed out waiting for Vite server. ${lastError?.message || ''}`.trim());
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
    username: 'cover-company',
    account_hash: 'hash',
    name: 'Hiring Manager',
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
  const jd = {
    id: 77,
    job_name: 'Frontend Engineer',
    education_level: '',
    major: '',
    career_level: '3+ years',
    required_skill: ['React'],
    preferred_skill: [],
    main_task: '',
    hiring_reason: '',
    work_type: '',
    status: 'prepare',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
  const resumes = [
    {
      id: 501,
      job_description_id: 77,
      name: 'Hong Gil Dong',
      skill: ['React'],
      education_level: {},
      experience: [],
      self_intoduction: [{ question: 'Motivation', answer: 'First applicant answer.' }],
      certification: [],
      language: [],
      award: [],
      training: [],
      other_activity: [],
      status: 'onqueue',
      reviewed: false,
      reviewed_at: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 502,
      job_description_id: 77,
      name: 'Kim Second',
      skill: ['TypeScript'],
      education_level: {},
      experience: ['Frontend intern'],
      self_intoduction: [{ question: 'Growth', answer: 'Second applicant answer.' }],
      certification: [],
      language: [],
      award: [],
      training: [],
      other_activity: [],
      status: 'onqueue',
      reviewed: false,
      reviewed_at: '',
      created_at: '2026-01-02',
      updated_at: '2026-01-02',
    },
  ];
  let analysisPayload = null;
  let deletePayload = null;
  let deleteCalls = 0;
  const deletedResumeIds = new Set();

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
    if (path === 'resume/get') {
      return fulfillJson(route, { error: false, data: resumes.filter((resume) => !deletedResumeIds.has(resume.id)) });
    }
    if (path === 'report/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'resume/analyze') {
      analysisPayload = route.request().postDataJSON();
      return fulfillJson(route, {
        error: false,
        data: {
          id: 91,
          resume_id: analysisPayload.id,
          overall_grade: 'A',
          overall_summary: 'Good',
          candidate_summary: 'Summary',
          checklist: [],
          competency_analysis: [],
          fit_analysis: [],
          strength: [],
          concern: [],
          check_point: [],
          final_comment: 'Done',
          interview_question: [],
        },
      });
    }
    if (path === 'resume/modify') {
      const payload = route.request().postDataJSON();
      if (payload.delete) {
        deleteCalls += 1;
        deletePayload = payload;
        deletedResumeIds.add(payload.id);
        return fulfillJson(route, {
          error: false,
          data: resumes.find((resume) => resume.id === payload.id) ?? { id: payload.id },
        });
      }

      return fulfillJson(route, {
        error: false,
        data: { ...resumes.find((resume) => resume.id === payload.id), ...payload },
      });
    }

    return fulfillJson(route, { error: false, data: [] });
  });

  await page.goto(`${baseUrl}/cover-letter`, { waitUntil: 'networkidle' });
  await page.locator('.cover-letter-list').getByText('Hong Gil Dong').waitFor({ timeout: 10000 });
  await page.locator('#name').waitFor({ timeout: 10000 });

  if ((await page.locator('#name').inputValue()) !== 'Hong Gil Dong') {
    throw new Error('First resume should be selected by default.');
  }

  await page.locator('.cover-letter-list').getByText('Kim Second').click();

  if ((await page.locator('#name').inputValue()) !== 'Kim Second') {
    const activeCardText = await page.locator('.cover-letter-list-card.active').textContent().catch(() => '');
    throw new Error(
      `Selecting a cover letter card must load that resume into the form. active=${activeCardText}, name=${await page
        .locator('#name')
        .inputValue()}`,
    );
  }

  if ((await page.locator('#answer').inputValue()) !== 'Second applicant answer.') {
    throw new Error('Selected resume self introduction answer was not loaded.');
  }

  await page.getByRole('button', { name: 'Hong Gil Dong 자소서 삭제', exact: true }).click();
  await page.getByRole('button', { name: '취소' }).click();

  if (deleteCalls !== 0) {
    throw new Error('Canceling the delete modal must not call resume/modify.');
  }

  await page.getByRole('button', { name: 'Hong Gil Dong 자소서 삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.waitForTimeout(500);

  if (deleteCalls !== 1 || deletePayload?.id !== 501 || deletePayload?.delete !== true) {
    throw new Error(`Delete must call resume/modify once with delete=true. payload=${JSON.stringify(deletePayload)}`);
  }

  if ((await page.locator('#name').inputValue()) !== 'Kim Second') {
    throw new Error('Deleting a non-selected resume must keep the current selection.');
  }

  await page.locator('.page-actions').locator('button').nth(1).click();
  await page.waitForURL((url) => url.pathname === '/analysis-report', { timeout: 10000 });

  if (analysisPayload?.id !== 502) {
    throw new Error(`Analysis must use selected resume id 502. payload=${JSON.stringify(analysisPayload)}`);
  }

  await browser.close();
  console.log('Cover letter selection flow checks passed.');
} finally {
  server.kill();
}
