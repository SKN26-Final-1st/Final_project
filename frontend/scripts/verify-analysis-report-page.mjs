import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5215);
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
  username: 'report-company',
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
  self_intoduction: [{ question: 'Motivation', answer: 'I want to use my frontend experience.' }],
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
  checklist: [{ content: 'React project experience', result: true }],
  competency_analysis: ['Component design is strong.'],
  fit_analysis: ['Matches startup frontend role.'],
  strength: ['Fast learner'],
  concern: ['Needs backend collaboration check'],
  check_point: ['Ask about API integration'],
  final_comment: 'Proceed to interview.',
  interview_question: [
    {
      question: 'How did you optimize React rendering?',
      answer: 'Use memoization and component boundaries.',
      purpose: 'Validate frontend performance experience.',
    },
  ],
  status: 'done',
  created_at: '2026-01-01',
};

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
    return fulfillJson(route, { error: false, data: [] });
  });

  await page.goto(`${baseUrl}/analysis-report`, { waitUntil: 'networkidle' });
  await page.locator('.page-title h1').waitFor({ timeout: 10000 });
  const reportList = page.locator('.analysis-report-tree');
  await reportList.getByText('Hong Gil Dong').waitFor({ timeout: 10000 });
  await reportList.getByText('Frontend Engineer').waitFor({ timeout: 10000 });
  if ((await reportList.getByText('Excellent frontend fit.').count()) > 0) {
    throw new Error('Report list should show only applicant name and JD title, not summaries.');
  }
  if ((await reportList.getByText('A 등급').count()) > 0 || (await reportList.getByText('1개 질문').count()) > 0) {
    throw new Error('Report list should remain limited to applicant name and JD title.');
  }

  await page.getByRole('tab').nth(0).waitFor({ timeout: 10000 });
  await page.getByRole('tab').nth(1).waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Excellent frontend fit.').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Candidate has strong React experience.').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('React project experience').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Component design is strong.').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Matches startup frontend role.').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Fast learner').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Needs backend collaboration check').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Ask about API integration').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Proceed to interview.').waitFor({ timeout: 10000 });
  if (await page.locator('.analysis-report-detail').getByText('How did you optimize React rendering?').isVisible()) {
    throw new Error('Interview questions should not be visible in the report tab.');
  }

  await page.getByRole('tab').nth(1).click();
  await page.locator('.analysis-report-detail').getByText('How did you optimize React rendering?').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('How did you optimize React rendering?').click();
  await page.locator('.analysis-report-detail').getByText('Use memoization and component boundaries.').waitFor({ timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Validate frontend performance experience.').waitFor({ timeout: 10000 });
  if (await page.locator('.analysis-report-detail').getByText('Excellent frontend fit.').isVisible()) {
    throw new Error('Report summary should not be visible in the question tab.');
  }

  await browser.close();
  console.log('Analysis report page checks passed.');
} finally {
  server.kill();
}
