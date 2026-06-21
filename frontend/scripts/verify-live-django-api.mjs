import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

const repoRoot = resolve('..');
const backendDir = join(repoRoot, 'backend');
const tempDir = join(tmpdir(), `humour-live-api-${process.pid}-${Date.now()}`);
const dbPath = join(tempDir, 'db.sqlite3').replaceAll('\\', '\\\\');
const settingsPath = join(tempDir, 'live_e2e_settings.py');
const host = '127.0.0.1';
const port = Number(process.env.LIVE_API_PORT || 8017);
const baseUrl = `http://${host}:${port}`;
const frontendOrigin = 'http://127.0.0.1:5173';
const python = process.env.PYTHON || 'python';

const cookieJar = new Map();

function makeEnv() {
  return {
    ...process.env,
    PYTHONPATH: [tempDir, backendDir, process.env.PYTHONPATH].filter(Boolean).join(delimiter),
    DJANGO_SETTINGS_MODULE: 'live_e2e_settings',
  };
}

function createTempSettings() {
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(
    settingsPath,
    [
      'from config.settings import *',
      `DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": r"${dbPath}"}}`,
      'PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]',
      `CSRF_TRUSTED_ORIGINS = ["${frontendOrigin}"]`,
      `CORS_ALLOWED_ORIGINS = ["${frontendOrigin}"]`,
      'CORS_ALLOW_CREDENTIALS = True',
      'USE_TZ = True',
      '',
    ].join('\n'),
  );
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? backendDir,
      env: options.env ?? makeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit ${code}\n${stdout}\n${stderr}`));
    });
  });
}

function startServer() {
  return spawn(
    python,
    ['manage.py', 'runserver', `${host}:${port}`, '--noreload', '--settings', 'live_e2e_settings'],
    {
      cwd: backendDir,
      env: makeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

async function waitForServer(server) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 30000) {
    if (server.exitCode !== null) {
      throw new Error(`Django server exited before it was ready. exit=${server.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/csrf/`, {
        headers: { Origin: frontendOrigin, Referer: `${frontendOrigin}/` },
      });
      updateCookies(response.headers);

      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 400));
  }

  throw new Error(`Timed out waiting for Django server. ${lastError?.message || ''}`.trim());
}

function readSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const setCookie = headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

function updateCookies(headers) {
  for (const rawCookie of readSetCookies(headers)) {
    const [nameValue] = rawCookie.split(';');
    const separatorIndex = nameValue.indexOf('=');

    if (separatorIndex > 0) {
      cookieJar.set(nameValue.slice(0, separatorIndex), nameValue.slice(separatorIndex + 1));
    }
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function request(endpoint, body = {}, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Origin: frontendOrigin,
    Referer: `${frontendOrigin}/`,
  };
  const cookies = cookieHeader();

  if (cookies) {
    headers.Cookie = cookies;
  }

  if (!options.get && cookieJar.has('csrftoken')) {
    headers['X-CSRFToken'] = cookieJar.get('csrftoken');
  }

  if (options.apiKey) {
    headers['X-API-Key'] = options.apiKey;
  }

  const response = await fetch(`${baseUrl}/api/${endpoint.replace(/^\/+|\/+$/g, '')}/`, {
    method: options.get ? 'GET' : 'POST',
    headers,
    body: options.get ? undefined : JSON.stringify(body),
  });
  updateCookies(response.headers);

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (payload.error && !options.allowError) {
    throw new Error(`${endpoint} returned error: ${payload.message || text}`);
  }

  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runScenario() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const username = `live_user_${suffix}`;
  const password = `LivePass${suffix}!`;
  const changedPassword = `NextPass${suffix}!`;

  await request('csrf', {}, { get: true });

  const checkUser = await request('checkuser', { username });
  assert(checkUser.valid === true, 'checkuser must return valid=true for a unique username');

  const signin = await request('signin', {
    username,
    password,
    name: 'Live Tester',
    verification_question: 'favorite color?',
    verification_answer: 'blue',
  });
  assert(signin.signin === true, 'signin must return signin=true');

  const login = await request('login', { username, password });
  assert(login.login === true, 'login must return login=true');

  const account = await request('account/get');
  assert(account.data.username === username, 'account/get must return the logged-in account');

  await request('account/modify', {
    name: 'Live Tester Updated',
    verification_question: 'favorite tool?',
    verification_answer: 'codex',
  });
  const updatedAccount = await request('account/get');
  assert(updatedAccount.data.name === 'Live Tester Updated', 'account/modify must persist profile fields');

  const missingPassword = await request('account/modify', { password: changedPassword }, { allowError: true });
  assert(missingPassword.error === true, 'password change without formal_password must be rejected');

  const company = await request('compinfo/get');
  assert(typeof company.data.id === 'number', 'compinfo/get must return a company info id');

  await request('compinfo/modify', {
    company_name: 'Live Company',
    employee_count: 42,
    team_composition: ['engineering', 'people'],
    company_description: 'Live API verification company',
    employ_style: ['startup', 'async'],
  });
  const updatedCompany = await request('compinfo/get');
  assert(updatedCompany.data.company_name === 'Live Company', 'compinfo/modify must persist company_name');

  const jd = await request('jd/add', {
    job_name: 'Backend Contract Engineer',
    career_level: '3년 이상',
    required_skill: ['Django', 'React'],
    preferred_skill: ['LangGraph'],
    education_level: '무관',
    major: '컴퓨터공학',
    main_task: 'API contract verification',
    hiring_reason: 'MVP launch',
    work_type: 'hybrid',
    status: 'prepare',
  });
  assert(jd.data.status === 'prepare', 'jd/add must create a prepare JD');

  const modifiedJd = await request('jd/modify', {
    id: jd.data.id,
    status: 'on_going',
    main_task: 'Live API contract verification',
  });
  assert(modifiedJd.data.status === 'on_going', 'jd/modify must update status');

  const resume = await request('resume/add', {
    job_description_id: jd.data.id,
    name: 'Live Candidate',
    skill: ['Django', 'TypeScript'],
    education_level: { degree: 'bachelor' },
    experience: [{ company: 'Previous Co', role: 'Engineer' }],
    self_intoduction: [{ title: '지원 동기', content: '실제 API 검증을 좋아합니다.' }],
  });
  assert(resume.data.job_description_id === jd.data.id, 'resume/add must bind the resume to the JD');

  const secondResume = await request('resume/add', {
    job_description_id: jd.data.id,
    name: 'Unauthorized Candidate',
    self_intoduction: [{ title: '권한 테스트', content: 'API key 권한 밖 지원서입니다.' }],
  });

  const modifiedResume = await request('resume/modify', {
    id: resume.data.id,
    name: 'Live Candidate Updated',
    skill: ['Django', 'TypeScript', 'API contract'],
  });
  assert(modifiedResume.data.name === 'Live Candidate Updated', 'resume/modify must persist allowed fields');

  const reports = await request('report/get', { resume_id: resume.data.id });
  assert(Array.isArray(reports.data), 'report/get must return an array');

  const authKey = await request('authkey/add', {
    name: 'Live Share Key',
    description: 'Generated by live Django API verifier',
    credit_limit: 10,
  });
  assert(typeof authKey.data.value === 'string' && authKey.data.value.startsWith('sk_live_'), 'authkey/add must return the full API key');

  await request('authkey/modify', {
    id: authKey.data.id,
    authorized_resume: [resume.data.id],
  });
  const authKeys = await request('authkey/get');
  const maskedKey = authKeys.data.find((item) => item.id === authKey.data.id);
  assert(maskedKey && maskedKey.value !== authKey.data.value, 'authkey/get must return a masked API key');

  await request('account/modify', {
    formal_password: password,
    password: changedPassword,
  });
  const relogin = await request('login', { username, password: changedPassword });
  assert(relogin.login === true, 'login with changed password must succeed');

  await request('logout');

  const sharedJds = await request('jd/get', {}, { apiKey: authKey.data.value });
  assert(
    Array.isArray(sharedJds.data) && sharedJds.data.some((item) => item.id === jd.data.id),
    'X-API-Key jd/get must return the JD connected to the authorized resume',
  );

  const sharedResume = await request('resume/get', { id: resume.data.id }, { apiKey: authKey.data.value });
  assert(
    Array.isArray(sharedResume.data) && sharedResume.data.length === 1 && sharedResume.data[0].id === resume.data.id,
    'X-API-Key resume/get must return the authorized resume',
  );

  const unauthorizedResume = await request('resume/get', { id: secondResume.data.id }, { apiKey: authKey.data.value });
  assert(
    Array.isArray(unauthorizedResume.data) && unauthorizedResume.data.length === 0,
    'X-API-Key resume/get must hide unauthorized resumes',
  );

  if (process.env.RUN_LLM_E2E === '1' && process.env.OPENAI_API_KEY) {
    const analysis = await request('resume/analyze', { id: resume.data.id }, { apiKey: authKey.data.value });
    assert(
      analysis.data && Array.isArray(analysis.data.interview_question),
      'resume/analyze must return an AnalysisReport with interview_question array',
    );

    const chat = await request(
      'chat',
      { chat: [{ role: 'user', message: '이 JD의 핵심 역량을 요약해줘.' }] },
      { apiKey: authKey.data.value },
    );
    assert(chat.response?.role === 'agent' && typeof chat.response.message === 'string', 'chat must return an agent response');
  } else {
    console.log('LLM scenarios skipped: set RUN_LLM_E2E=1 and OPENAI_API_KEY to verify resume/analyze and chat live.');
  }
}

createTempSettings();
await runCommand(python, ['manage.py', 'migrate', '--noinput', '--settings', 'live_e2e_settings']);

const server = startServer();

try {
  await waitForServer(server);
  await runScenario();
  console.log('Live Django API checks passed.');
} finally {
  server.kill();
  rmSync(tempDir, { force: true, recursive: true });
}
