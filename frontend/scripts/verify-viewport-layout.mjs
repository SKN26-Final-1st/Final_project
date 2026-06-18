import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5212);
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
      throw new Error(`Vite dev server exited early: ${server.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 400));
  }

  throw new Error(`Timed out waiting for Vite dev server. ${lastError?.message || ''}`.trim());
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
    credit: 4500,
    subscribe: true,
    subscribe_expiration: '2026-12-31',
  };
  const company = {
    id: 1,
    company_name: 'HumouR',
    employee_count: 24,
    team_composition: ['AI', 'Frontend', 'HR'],
    company_description: '채용 분석 서비스를 운영하는 팀입니다.',
    employ_style: ['협업', '성장'],
  };
  const jds = [
    {
      id: 7,
      job_name: 'Frontend Engineer',
      education_level: '무관',
      major: '컴퓨터공학',
      career_level: '3년 이상',
      required_skill: ['React', 'TypeScript', 'CSS'],
      preferred_skill: ['ECharts', 'Testing Library'],
      main_task: '운영 화면 개발과 디자인 시스템 정리',
      hiring_reason: '제품 고도화',
      work_type: '정규직',
      status: 'on_going',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 8,
      job_name: 'Backend Engineer',
      education_level: '',
      major: '',
      career_level: '5년 이상',
      required_skill: ['Django', 'PostgreSQL'],
      preferred_skill: ['LangGraph'],
      main_task: 'API와 AI 분석 파이프라인 개발',
      hiring_reason: '',
      work_type: '정규직',
      status: 'prepare',
      created_at: '2026-01-02',
      updated_at: '2026-01-02',
    },
  ];
  const resumes = [
    {
      id: 10,
      job_description_id: 7,
      name: '홍길동',
      skill: ['React', 'TypeScript'],
      education_level: {},
      experience: [],
      self_intoduction: [{ question: '지원 동기', answer: '사용자 문제를 해결하는 화면을 만드는 데 관심이 있습니다.' }],
      certification: [],
      language: [],
      award: [],
      training: [],
      other_activity: [],
      status: 'done',
      reviewed: false,
      reviewed_at: '',
      created_at: '2026-01-03',
      updated_at: '2026-01-03',
    },
  ];
  const report = {
    id: 21,
    resume_id: 10,
    overall_grade: 'A',
    overall_summary: 'JD와 핵심 역량이 잘 맞습니다. 실무 경험의 구체성을 추가로 확인하면 좋습니다.',
    candidate_summary: 'React와 TypeScript 기반 화면 구현 경험이 있는 지원자입니다.',
    checklist: [
      { content: '필수 기술 보유', result: true },
      { content: '운영형 SaaS 경험', result: true },
      { content: '대규모 상태관리 경험', result: false },
    ],
    competency_analysis: Array.from({ length: 8 }, (_, index) => `역량 분석 항목 ${index + 1}: 화면 구조화와 API 연동 이해도가 좋습니다.`),
    fit_analysis: Array.from({ length: 7 }, (_, index) => `적합도 분석 항목 ${index + 1}: JD 요구사항과 연결되는 경험을 확인했습니다.`),
    strength: ['React 컴포넌트 설계', '사용자 경험 개선', '테스트 기반 검증'],
    concern: ['복잡한 데이터 시각화 경험은 추가 확인 필요', '장기 운영 경험 확인 필요'],
    check_point: Array.from({ length: 6 }, (_, index) => `확인 포인트 ${index + 1}: 실제 프로젝트에서 맡은 역할을 질문하세요.`),
    final_comment: '전반적으로 JD와 잘 맞는 지원자이며, 면접에서는 운영 화면 유지보수 경험을 깊게 확인하는 것이 좋습니다.',
  };
  const questions = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    resume_id: 10,
    question: `추천 질문 ${index + 1}: React 화면 성능 문제를 어떻게 해결했나요?`,
    answer: '렌더링 원인을 측정하고 memoization, query cache, 컴포넌트 분리로 해결합니다.',
    purpose: '실제 문제 해결 과정과 판단 기준을 확인합니다.',
  }));
  report.interview_question = questions;
  const authKeys = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    name: `외부 면접관 공유 ${index + 1}`,
    description: '면접관 공유용 API key',
    credit_limit: 1000,
    value: `sk_live_****${index + 1000}`,
    authorized_resume: [10],
  }));

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());

    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    const path = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');

    if (path === 'csrf') return fulfillJson(route, { error: false, message: 'CSRF cookie set' });
    if (path === 'account/get') return fulfillJson(route, { error: false, data: account });
    if (path === 'compinfo/get') return fulfillJson(route, { error: false, data: company });
    if (path === 'jd/get') return fulfillJson(route, { error: false, data: jds });
    if (path === 'resume/get') return fulfillJson(route, { error: false, data: resumes });
    if (path === 'report/get') return fulfillJson(route, { error: false, data: report.resume_id === 10 ? [report] : [] });
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: authKeys });
    if (path === 'chat') {
      return fulfillJson(route, { error: false, response: { role: 'agent', message: 'JD 기준으로 답변합니다.' } });
    }
    if (path.endsWith('/modify') || path.endsWith('/add') || path === 'resume/analyze') {
      return fulfillJson(route, { error: false, data: report });
    }

    return fulfillJson(route, { error: false, data: [] });
  });
}

async function inspectRoute(page, route, viewport, browserErrors) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  try {
    await page.locator('.content-frame').waitFor({ timeout: 10000 });
    await page.locator('.viewport-page').waitFor({ timeout: 10000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      bodyText: document.body.innerText.slice(0, 1000),
      hasAppRoot: Boolean(document.querySelector('.app-root')),
      location: window.location.href,
      title: document.title,
    }));
    throw new Error(
      `content-frame was not rendered for ${route} at ${viewport.width}x${viewport.height}: ${JSON.stringify({
        ...diagnostic,
        browserErrors,
      })}`,
      { cause: error },
    );
  }

  return page.evaluate(() => {
    const viewportHeight = window.innerHeight;
    const viewportPage = document.querySelector('.viewport-page');
    const contentFrame = document.querySelector('.content-frame');
    const layoutRow = document.querySelector('.viewport-page > .split-editor-layout-row, .viewport-page > .chat-page-layout-row');
    const viewportPageRect = viewportPage?.getBoundingClientRect();
    const contentFrameRect = contentFrame?.getBoundingClientRect();
    const layoutRowRect = layoutRow?.getBoundingClientRect();
    const layoutRowStyle = layoutRow ? window.getComputedStyle(layoutRow) : null;
    const dashboardBodyScroll = document.querySelector('.dashboard-body-scroll');
    const dashboardBodyScrollRect = dashboardBodyScroll?.getBoundingClientRect();
    const dashboardBodyScrollStyle = dashboardBodyScroll ? window.getComputedStyle(dashboardBodyScroll) : null;
    const cards = Array.from(document.querySelectorAll('.viewport-page .section-card'))
      .filter((card) => !card.closest('.viewport-column-scroll') && !card.closest('.dashboard-body-scroll'))
      .map((card) => {
      const rect = card.getBoundingClientRect();
      const body = card.querySelector('.ant-card-body');
      const bodyRect = body?.getBoundingClientRect();
      const bodyStyle = body ? window.getComputedStyle(body) : null;
      return {
        className: card.className,
        bottom: Math.round(rect.bottom),
        top: Math.round(rect.top),
        bodyClientHeight: body ? Math.round(body.clientHeight) : null,
        bodyOverflowY: bodyStyle?.overflowY ?? null,
        bodyScrollHeight: body ? Math.round(body.scrollHeight) : null,
        bodyVisibleBottom: bodyRect ? Math.round(bodyRect.bottom) : null,
        clipped: rect.bottom > viewportHeight + 1,
        hasInternalScroll: body ? body.scrollHeight > body.clientHeight + 1 : false,
      };
      });
    const scrollColumns = Array.from(document.querySelectorAll('.viewport-column-scroll')).map((column) => {
      const rect = column.getBoundingClientRect();
      return {
        bottom: Math.round(rect.bottom),
        clipped: rect.bottom > viewportHeight + 1,
        clientHeight: Math.round(column.clientHeight),
        scrollHeight: Math.round(column.scrollHeight),
      };
    });

    const chatInput = document.querySelector('.chat-workspace-card .chat-input-row');
    const chatInputRect = chatInput?.getBoundingClientRect();

    return {
      bodyOverflowY: window.getComputedStyle(document.body).overflowY,
      contentOverflowY: window.getComputedStyle(document.querySelector('.content')).overflowY,
      contentFrameHeight: contentFrameRect ? Math.round(contentFrameRect.height) : null,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      hasViewportPage: Boolean(viewportPage),
      layoutRowFlex: layoutRowStyle?.flex ?? null,
      layoutRowHeight: layoutRowRect ? Math.round(layoutRowRect.height) : null,
      viewportPageHeight: viewportPageRect ? Math.round(viewportPageRect.height) : null,
      viewportHeight,
      viewportWidth: window.innerWidth,
      clippedCards: cards.filter((card) => card.clipped),
      scrollableCards: cards.filter((card) => card.hasInternalScroll).length,
      clippedScrollColumns: scrollColumns.filter((column) => column.clipped),
      dashboardBodyScroll: dashboardBodyScroll
        ? {
            bottom: dashboardBodyScrollRect ? Math.round(dashboardBodyScrollRect.bottom) : null,
            clipped: dashboardBodyScrollRect ? dashboardBodyScrollRect.bottom > viewportHeight + 1 : false,
            clientWidth: Math.round(dashboardBodyScroll.clientWidth),
            clientHeight: Math.round(dashboardBodyScroll.clientHeight),
            overflowY: dashboardBodyScrollStyle?.overflowY ?? null,
            overflowX: dashboardBodyScrollStyle?.overflowX ?? null,
            scrollWidth: Math.round(dashboardBodyScroll.scrollWidth),
            scrollHeight: Math.round(dashboardBodyScroll.scrollHeight),
          }
        : null,
      scrollColumns,
      chatInputBottom: chatInputRect ? Math.round(chatInputRect.bottom) : null,
      chatInputVisible: chatInputRect ? chatInputRect.bottom <= viewportHeight + 1 : true,
      cards,
    };
  });
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
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

  const desktopRoutes = ['/dashboard', '/jd', '/cover-letter', '/analysis-report', '/chat', '/admin', '/company', '/mypage'];
  const desktopViewports = [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];
  const failures = [];
  const summaries = [];

  for (const viewport of desktopViewports) {
    for (const route of desktopRoutes) {
      const result = await inspectRoute(page, route, viewport, browserErrors);
      summaries.push({
        route,
        viewport,
        clippedCards: result.clippedCards.length,
        contentFrameHeight: result.contentFrameHeight,
        layoutRowFlex: result.layoutRowFlex,
        layoutRowHeight: result.layoutRowHeight,
        scrollableCards: result.scrollableCards,
        viewportPageHeight: result.viewportPageHeight,
        dashboardBodyScroll: result.dashboardBodyScroll,
        horizontalOverflow: {
          document: result.documentScrollWidth - result.documentClientWidth,
          body: result.bodyScrollWidth - result.bodyClientWidth,
          dashboardBody: result.dashboardBodyScroll
            ? result.dashboardBodyScroll.scrollWidth - result.dashboardBodyScroll.clientWidth
            : null,
        },
      });

      if (!result.hasViewportPage) {
        failures.push(`${route} did not render viewport-page at ${viewport.width}x${viewport.height}`);
      }

      if (result.clippedCards.length) {
        failures.push(`${route} has clipped cards at ${viewport.width}x${viewport.height}: ${JSON.stringify(result.clippedCards)}`);
      }

      if (result.clippedScrollColumns.length) {
        failures.push(
          `${route} has clipped internal scroll columns at ${viewport.width}x${viewport.height}: ${JSON.stringify(
            result.clippedScrollColumns,
          )}`,
        );
      }

      if (result.dashboardBodyScroll?.clipped) {
        failures.push(
          `${route} dashboard body scroll container is clipped at ${viewport.width}x${viewport.height}: ${JSON.stringify(
            result.dashboardBodyScroll,
          )}`,
        );
      }

      if (route === '/dashboard') {
        const documentOverflow = result.documentScrollWidth - result.documentClientWidth;
        const bodyOverflow = result.bodyScrollWidth - result.bodyClientWidth;
        const dashboardBodyOverflow = result.dashboardBodyScroll
          ? result.dashboardBodyScroll.scrollWidth - result.dashboardBodyScroll.clientWidth
          : 0;

        if (documentOverflow > 1 || bodyOverflow > 1 || dashboardBodyOverflow > 1) {
          failures.push(
            `/dashboard has horizontal overflow at ${viewport.width}x${viewport.height}: ${JSON.stringify({
              documentOverflow,
              bodyOverflow,
              dashboardBodyOverflow,
              dashboardBodyScroll: result.dashboardBodyScroll,
            })}`,
          );
        }
      }

      if (route === '/chat' && !result.chatInputVisible) {
        failures.push(`/chat input is clipped at ${viewport.width}x${viewport.height}: bottom=${result.chatInputBottom}`);
      }
    }
  }

  const mobileResult = await inspectRoute(page, '/jd', { width: 390, height: 844 }, browserErrors);
  if (mobileResult.contentOverflowY === 'hidden') {
    failures.push('Mobile /jd content still has overflow hidden.');
  }

  const mobileDashboardResult = await inspectRoute(page, '/dashboard', { width: 390, height: 844 }, browserErrors);
  if (mobileDashboardResult.contentOverflowY === 'hidden') {
    failures.push('Mobile /dashboard content still has overflow hidden.');
  }

  await browser.close();

  if (failures.length) {
    throw new Error(`Viewport layout checks failed:\n${failures.join('\n')}\n\nSummary: ${JSON.stringify(summaries, null, 2)}`);
  }

  console.log(`Viewport layout checks passed. ${JSON.stringify(summaries)}`);
} finally {
  server.kill();
}
