import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const port = Number(process.env.VERIFY_PORT || 5176);
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotDir = resolve('qa-screenshots');

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

mkdirSync(screenshotDir, { recursive: true });

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
  username: 'widget-company',
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
};
const question = {
  id: 701,
  resume_id: 501,
  question: 'How did you optimize React rendering?',
  answer: 'Use memoization and component boundaries.',
  purpose: 'Validate frontend performance experience.',
};

async function mockBackend(page) {
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
    if (path === 'question/get') return fulfillJson(route, { error: false, data: [question] });
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: [] });
    if (path === 'chat') return fulfillJson(route, { error: false, response: { role: 'agent', message: 'Checked.' } });
    return fulfillJson(route, { error: false, data: [] });
  });
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

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));

  if (Math.max(overflow.body, overflow.document) > overflow.viewport + 1) {
    throw new Error(`${label}에서 가로 오버플로우가 발생했습니다: ${JSON.stringify(overflow)}`);
  }
}

async function assertWidgetUsesSingleScrollModel(page, label) {
  const scrollModel = await page.evaluate(() => {
    const body = document.querySelector('.document-chat-widget-body');
    const chatWindow = document.querySelector('.document-chat-window');
    const toggle = document.querySelector('.document-chat-recommendation-toggle');

    if (!body || !chatWindow || !toggle) {
      return {
        hasBody: Boolean(body),
        hasChatWindow: Boolean(chatWindow),
        hasToggle: Boolean(toggle),
      };
    }

    const bodyStyle = window.getComputedStyle(body);
    const chatStyle = window.getComputedStyle(chatWindow);

    return {
      hasBody: true,
      hasChatWindow: true,
      hasToggle: true,
      bodyOverflowY: bodyStyle.overflowY,
      chatOverflowY: chatStyle.overflowY,
    };
  });

  if (!scrollModel.hasBody || !scrollModel.hasChatWindow || !scrollModel.hasToggle) {
    throw new Error(`${label} single-scroll elements missing: ${JSON.stringify(scrollModel)}`);
  }

  if (!['hidden', 'clip'].includes(scrollModel.bodyOverflowY)) {
    throw new Error(`${label} body should not scroll: ${JSON.stringify(scrollModel)}`);
  }

  if (!['auto', 'scroll'].includes(scrollModel.chatOverflowY)) {
    throw new Error(`${label} chat window should be the scroll container: ${JSON.stringify(scrollModel)}`);
  }
}

async function assertRecommendationPanel(page, label) {
  const toggle = page.locator('.document-chat-recommendation-toggle');
  await toggle.waitFor({ state: 'visible', timeout: 5000 });
  await toggle.click();

  const panel = page.locator('.document-chat-recommendation-panel');
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  await panel.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: false }).map((animation) => animation.finished.catch(() => undefined))),
  );

  const sourceStackCount = await panel.locator('.document-source-stack').count();
  const quickActionsCount = await panel.locator('.document-quick-actions').count();
  if (sourceStackCount === 0 || quickActionsCount === 0) {
    throw new Error(
      `${label} recommendation panel content is incomplete: sources=${sourceStackCount} prompts=${quickActionsCount}`,
    );
  }

  const toggleVisibleWhenOpen = await toggle.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0.01;
  });

  if (toggleVisibleWhenOpen) {
    throw new Error(`${label} recommendation toggle should hide while panel is open`);
  }
}

async function assertNoDuplicateWorkspaceButton(page, label) {
  const linkCount = await page.locator('.document-workspace-link').count();
  if (linkCount > 0) {
    throw new Error(`${label} has duplicate full-screen workspace button`);
  }
}

async function assertPinnedToViewport(page, locator, label, expectedInset) {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: false }).map((animation) => animation.finished.catch(() => undefined))),
  );

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) {
    throw new Error(`${label} 영역을 찾지 못했습니다.`);
  }

  const actualRight = viewport.width - box.x - box.width;
  const actualBottom = viewport.height - box.y - box.height;
  const tolerance = expectedInset.tolerance ?? 2;

  if (
    Math.abs(actualRight - expectedInset.right) > tolerance ||
    Math.abs(actualBottom - expectedInset.bottom) > tolerance
  ) {
    throw new Error(
      `${label}이 우측 하단에 고정되지 않았습니다. expected=${JSON.stringify(expectedInset)} actual=${JSON.stringify({
        right: actualRight,
        bottom: actualBottom,
      })}`,
    );
  }

  return box;
}

async function verifyDesktopWidget(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockBackend(page);
  await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(page, 'desktop dashboard');

  const hasChatMenu = await page.locator('.sidebar .side-nav-item[href="/chat"]').count();
  if (hasChatMenu) {
    throw new Error('Sidebar should not expose the full chat page as a primary menu item.');
  }

  const fab = page.locator('.document-chat-fab');
  await fab.waitFor({ state: 'visible', timeout: 5000 });
  await assertPinnedToViewport(page, fab, '접힌 채팅 FAB', { right: 28, bottom: 28 });

  await fab.evaluate((element) => element.click());
  const widget = page.locator('.document-chat-widget');

  await widget.waitFor({ state: 'visible', timeout: 5000 });
  await assertPinnedToViewport(page, widget, '채팅 위젯', { right: 28, bottom: 28 });

  const dragHandleCount = await page.locator('.document-chat-widget-drag-handle').count();
  if (dragHandleCount > 0) {
    throw new Error('고정형 채팅 위젯에 드래그 핸들이 남아 있습니다.');
  }

  await assertNoHorizontalOverflow(page, 'desktop widget');
  await assertWidgetUsesSingleScrollModel(page, 'desktop widget');
  await assertNoDuplicateWorkspaceButton(page, 'desktop widget');
  await assertRecommendationPanel(page, 'desktop widget');
  await assertNoHorizontalOverflow(page, 'desktop recommendation panel');
  await page.screenshot({ path: resolve(screenshotDir, 'document-chat-widget-desktop.png'), fullPage: true });
}

async function verifyMobileWidget(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBackend(page);
  await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: 'networkidle' });
  const fab = page.locator('.document-chat-fab');

  await fab.waitFor({ state: 'visible', timeout: 5000 });
  await assertPinnedToViewport(page, fab, '모바일 채팅 FAB', { right: 16, bottom: 16 });
  await fab.evaluate((element) => element.click());

  const widget = page.locator('.document-chat-widget');
  await widget.waitFor({ state: 'visible', timeout: 5000 });

  const box = await assertPinnedToViewport(page, widget, '모바일 채팅 위젯', { right: 12, bottom: 12 });

  if (box.x < -1 || box.y < -1 || box.x + box.width > 391 || box.y + box.height > 845) {
    throw new Error(`모바일 위젯이 뷰포트 밖으로 벗어났습니다: ${JSON.stringify(box)}`);
  }

  await assertNoHorizontalOverflow(page, 'mobile widget');
  await assertWidgetUsesSingleScrollModel(page, 'mobile widget');
  await assertNoDuplicateWorkspaceButton(page, 'mobile widget');
  await assertRecommendationPanel(page, 'mobile widget');
  await assertNoHorizontalOverflow(page, 'mobile recommendation panel');
  await page.screenshot({ path: resolve(screenshotDir, 'document-chat-widget-mobile.png'), fullPage: true });
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath, headless: true });
  const desktopPage = await browser.newPage();

  try {
    await verifyDesktopWidget(desktopPage);
    await desktopPage.close();

    const mobilePage = await browser.newPage();
    await verifyMobileWidget(mobilePage);
    await mobilePage.close();
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
