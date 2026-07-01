import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5216);
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
      if (response.ok) return;
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

const account = {
  id: 1,
  username: 'chat-company',
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
const resume = {
  id: 501,
  job_description_id: 77,
  name: 'Hong Gil Dong',
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
const report = {
  id: 91,
  resume_id: 501,
  overall_grade: 'A',
  overall_summary: 'Excellent frontend fit.',
  candidate_summary: 'Candidate has strong React experience.',
  checklist: [],
  competency_analysis: [],
  fit_analysis: [],
  strength: [],
  concern: [],
  check_point: [],
  final_comment: 'Proceed to interview.',
  status: 'done',
  created_at: '2026-01-01',
};
const question = {
  id: 701,
  resume_id: 501,
  question: 'How did you optimize React rendering?',
  answer: 'Use memoization and component boundaries.',
  purpose: 'Validate frontend performance experience.',
};
report.interview_question = [question];

const forbiddenTexts = ['회사 정책', '채용 운영', '42개', '68개', '면접 평가 기준', '채용 운영 가이드'];
const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();

    const path = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
    if (path === 'csrf') return fulfillJson(route, { error: false, message: 'CSRF cookie set' });
    if (path === 'account/get') return fulfillJson(route, { error: false, data: account });
    if (path === 'compinfo/get') return fulfillJson(route, { error: false, data: company });
    if (path === 'jd/get') return fulfillJson(route, { error: false, data: [jd] });
    if (path === 'resume/get') return fulfillJson(route, { error: false, data: [resume] });
    if (path === 'report/get') return fulfillJson(route, { error: false, data: [report] });
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'chat') return fulfillJson(route, { error: false, response: { role: 'agent', message: 'Checked.' } });
    return fulfillJson(route, { error: false, data: [] });
  });

  await page.goto(`${baseUrl}/chat`, { waitUntil: 'networkidle' });
  await page.getByText('Frontend Engineer').first().waitFor({ timeout: 10000 });
  await page.getByText('Hong Gil Dong').first().waitFor({ timeout: 10000 });
  await page.getByText('How did you optimize React rendering?').first().waitFor({ timeout: 10000 });
  if ((await page.getByText('최근 참조 소스').count()) > 0) {
    throw new Error('Recent reference source section should not be rendered on /chat.');
  }
  if ((await page.getByText('undefined 참고해서 알려줘').count()) > 0) {
    throw new Error('Undefined source prompt should never be rendered.');
  }

  await page.getByText('추천 질문으로 대화를 시작해보세요.').waitFor({ timeout: 10000 });
  if ((await page.locator('.chat-window .ant-bubble').count()) > 0) {
    throw new Error('Initial empty chat state must not render conversation bubbles.');
  }

  const suggestedQuestion = 'Frontend Engineer JD에서 핵심 조건을 정리해줘';
  await page.getByRole('button', { name: suggestedQuestion }).click();
  const chatTextarea = page.locator('.chat-input-row textarea');
  if ((await chatTextarea.inputValue()) !== suggestedQuestion) {
    throw new Error('Suggested question should fill the chat input without immediate send.');
  }
  await chatTextarea.press('Enter');
  await page.getByText('Checked.').waitFor({ timeout: 10000 });
  if ((await page.getByText('추천 질문으로 대화를 시작해보세요.').count()) > 0) {
    throw new Error('Empty state should disappear after the first real message.');
  }

  for (const text of forbiddenTexts) {
    if ((await page.getByText(text).count()) > 0) {
      throw new Error(`Fake or unsupported context text should not be rendered: ${text}`);
    }
  }

  await browser.close();
  console.log('Chat context real data checks passed.');
} finally {
  server.kill();
}
