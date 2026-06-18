import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5214);
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
  const savedResume = {
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
    status: 'onqueue',
    reviewed: false,
    reviewed_at: '',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
  let resumeStored = false;
  let addCalls = 0;
  let modifyCalls = 0;
  let analysisCalls = 0;
  let addPayload = null;
  let modifyPayload = null;
  let analysisPayload = null;
  const generatedReport = {
    id: 91,
    resume_id: 501,
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
  };

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
    if (path === 'resume/get') return fulfillJson(route, { error: false, data: resumeStored ? [savedResume] : [] });
    if (path === 'report/get') return fulfillJson(route, { error: false, data: analysisCalls ? [generatedReport] : [] });
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'resume/add') {
      addCalls += 1;
      addPayload = route.request().postDataJSON();
      resumeStored = true;
      return fulfillJson(route, { error: false, data: savedResume });
    }
    if (path === 'resume/modify') {
      modifyCalls += 1;
      modifyPayload = route.request().postDataJSON();
      return fulfillJson(route, { error: false, data: { ...savedResume, name: modifyPayload.name } });
    }
    if (path === 'resume/analyze') {
      analysisCalls += 1;
      analysisPayload = route.request().postDataJSON();
      return fulfillJson(route, {
        error: false,
        data: generatedReport,
      });
    }

    return fulfillJson(route, { error: false, data: [] });
  });

  await page.goto(`${baseUrl}/cover-letter`, { waitUntil: 'networkidle' });
  const pageActions = page.locator('.page-actions');
  const saveButton = pageActions.locator('button').nth(0);
  const analysisButton = pageActions.locator('button').nth(1);
  await saveButton.waitFor({ timeout: 10000 });
  await analysisButton.waitFor({ timeout: 10000 });

  if (!(await analysisButton.isDisabled())) {
    throw new Error('Analysis should be disabled until a resume is saved.');
  }

  await page.locator('#name').fill('Hong Gil Dong');
  await page.locator('#skill').fill('React');
  await page.keyboard.press('Enter');
  await page.locator('#question').fill('Motivation');
  await page.locator('#answer').fill('I want to use my frontend experience.');
  await saveButton.click();
  await page.locator('.cover-letter-list').getByText('Hong Gil Dong').first().waitFor({ timeout: 10000 });

  if (addCalls !== 1) {
    throw new Error(`Expected one resume/add request, received ${addCalls}.`);
  }

  if (
    addPayload?.job_description_id !== 77 ||
    addPayload?.name !== 'Hong Gil Dong' ||
    !Array.isArray(addPayload?.skill) ||
    addPayload.skill[0] !== 'React' ||
    addPayload?.self_intoduction?.[0]?.question !== 'Motivation' ||
    addPayload?.self_intoduction?.[0]?.answer !== 'I want to use my frontend experience.'
  ) {
    throw new Error(`Invalid resume/add payload: ${JSON.stringify(addPayload)}`);
  }

  await page.locator('#name').fill('Hong Gil Dong Updated');
  await saveButton.click();
  await page.waitForTimeout(500);

  if (modifyCalls !== 1 || modifyPayload?.id !== 501 || modifyPayload?.job_description_id !== undefined) {
    throw new Error(`Invalid resume/modify flow. calls=${modifyCalls}, payload=${JSON.stringify(modifyPayload)}`);
  }

  await page.getByRole('button', { name: /새 자소서 작성/ }).click();
  if (!(await analysisButton.isDisabled())) {
    throw new Error('Analysis should be disabled while composing a new unsaved cover letter.');
  }

  await page.locator('#name').fill('New Applicant');
  await page.locator('#skill').fill('TypeScript');
  await page.keyboard.press('Enter');
  await page.locator('#question').fill('Growth');
  await page.locator('#answer').fill('I want to grow with the team.');
  await saveButton.click();
  await page.waitForTimeout(500);

  if (addCalls !== 2 || addPayload?.name !== 'New Applicant' || addPayload?.job_description_id !== 77) {
    throw new Error(`New cover letter creation must call resume/add. calls=${addCalls}, payload=${JSON.stringify(addPayload)}`);
  }

  await analysisButton.click();
  await page.waitForURL((url) => url.pathname === '/analysis-report', { timeout: 10000 });
  await page.locator('.analysis-report-detail').getByText('Good').waitFor({ timeout: 10000 });

  if (analysisCalls !== 1 || analysisPayload?.id !== 501) {
    throw new Error(`Analysis must use saved resume id. calls=${analysisCalls}, payload=${JSON.stringify(analysisPayload)}`);
  }

  await browser.close();
  console.log('Cover letter save flow checks passed.');
} finally {
  server.kill();
}
