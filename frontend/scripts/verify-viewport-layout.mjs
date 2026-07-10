import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.VERIFY_PORT || 5200 + Math.floor(Math.random() * 1000));
const baseUrl = `http://127.0.0.1:${port}`;
const overflowTolerance = 1;
const verticalTolerance = 1;
const verbose = process.env.VERIFY_VIEWPORT_VERBOSE === '1';

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

const routeChecks = [
  {
    route: '/dashboard',
    root: '.dashboard-page',
    actionSelectors: ['.dashboard-page .hero-actions .ant-btn'],
  },
  {
    route: '/jd',
    root: '.jd-page',
    actionSelectors: ['.jd-page .page-actions', '.jd-editor-mode-row', '.jd-checklist-generate-controls'],
  },
  {
    route: '/cover-letter',
    root: '.cover-letter-page',
    actionSelectors: ['.cover-letter-page .page-actions', '.cover-letter-list-card', '.jd-editor-mode-row'],
  },
  {
    route: '/analysis-report',
    root: '.analysis-report-page',
    actionSelectors: ['.analysis-report-detail-toolbar', '.analysis-report-feedback', '.analysis-report-page .ant-tabs-nav'],
  },
  {
    route: '/chat',
    root: '.chat-page',
    actionSelectors: ['.chat-workspace-card .chat-input-row', '.chat-window-panel'],
    requireInitialVisibleSelectors: ['.chat-workspace-card .chat-input-row'],
  },
  {
    route: '/admin',
    root: '.admin-page',
    actionSelectors: ['.admin-page .page-actions .ant-btn', '.authkey-item-actions .ant-btn', '.admin-credit-control .ant-btn'],
  },
  {
    route: '/company',
    root: '.company-page',
    actionSelectors: ['.company-page .page-actions .ant-btn', '.company-page form input'],
  },
  {
    route: '/mypage',
    root: '.mypage-page',
    actionSelectors: ['.mypage-settings-column .ant-btn-dangerous', '.mypage-settings-column .ant-btn-link'],
  },
  {
    route: '/recruitment-post',
    root: '.recruitment-post-page',
    actionSelectors: ['.recruitment-post-page .page-actions .ant-btn[disabled]', '.recruitment-post-page .ant-table-wrapper'],
    naturalDocumentFlow: true,
  },
  {
    route: '/cover-letter-template',
    root: '.content-frame > .page-title',
    actionSelectors: ['.content-frame .page-actions .ant-btn[disabled]', '.content-frame .ant-list-item'],
    naturalDocumentFlow: true,
  },
];

const viewportGroups = [
  ['short-laptop', [
    { width: 1280, height: 720 },
    { width: 1366, height: 625 },
    { width: 1366, height: 768 },
  ]],
  ['fhd', [
    { width: 1536, height: 864 },
    { width: 1600, height: 900 },
    { width: 1920, height: 1080 },
  ]],
  ['sixteen-ten', [
    { width: 1440, height: 900 },
    { width: 1680, height: 1050 },
    { width: 1920, height: 1200 },
  ]],
  ['ultrawide', [
    { width: 2560, height: 1080 },
    { width: 3440, height: 1440 },
  ]],
  ['tablet', [
    { width: 768, height: 1024 },
    { width: 834, height: 1112 },
    { width: 1024, height: 768 },
    { width: 1024, height: 1366 },
  ]],
  ['mobile', [
    { width: 360, height: 740 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]],
];

const viewports = viewportGroups.flatMap(([group, candidates]) =>
  candidates.map((viewport) => ({ ...viewport, group, name: `${viewport.width}x${viewport.height}` })),
);

const deviceScaleFactors = [1, 1.25, 1.5];
const scaledViewportNames = new Set(['1280x720', '1366x625', '1024x768', '390x844', '2560x1080', '3440x1440']);
const routeFilter = new Set((process.env.VERIFY_ROUTES ?? '').split(',').map((item) => item.trim()).filter(Boolean));
const viewportFilter = new Set((process.env.VERIFY_VIEWPORTS ?? '').split(',').map((item) => item.trim()).filter(Boolean));
const dprFilter = new Set((process.env.VERIFY_DPRS ?? '').split(',').map((item) => item.trim()).filter(Boolean));
const enabledRouteChecks = routeFilter.size
  ? routeChecks.filter((routeConfig) => routeFilter.has(routeConfig.route))
  : routeChecks;
const enabledDeviceScaleFactors = dprFilter.size
  ? deviceScaleFactors.filter((deviceScaleFactor) => dprFilter.has(String(deviceScaleFactor)))
  : deviceScaleFactors;
const enabledViewports = viewportFilter.size ? viewports.filter((viewport) => viewportFilter.has(viewport.name)) : viewports;
const viewportCases = enabledDeviceScaleFactors.flatMap((deviceScaleFactor) =>
  enabledViewports
    .filter((viewport) => deviceScaleFactor === 1 || scaledViewportNames.has(viewport.name))
    .map((viewport) => ({ viewport, deviceScaleFactor })),
);

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
    team_composition: ['AI', 'Frontend', 'HR', 'Platform', 'Data Science'],
    company_description:
      '채용 분석 서비스를 운영하는 팀입니다. 긴 설명을 사용해 카드 높이와 줄바꿈, 좁은 폭의 레이아웃 안정성을 함께 확인합니다.',
    employ_style: ['협업', '성장', '문서화', '정량 지표 기반 의사결정'],
  };
  const jds = [
    {
      id: 7,
      job_name: 'Frontend Engineer',
      education_level: '무관',
      major: '컴퓨터공학 또는 관련 경험',
      career_level: '3년 이상',
      required_skill: ['React', 'TypeScript', 'CSS', 'React Query', 'Testing Library'],
      preferred_skill: ['ECharts', 'Playwright', 'Design System', 'Accessibility'],
      main_task:
        '운영 화면 개발과 사용자 경험 개선, 상태 관리, 백엔드 API 연동, 테스트 자동화까지 담당합니다. 긴 문장으로 카드 overflow를 보수적으로 확인합니다.',
      hiring_reason: '제품 고도화와 고객사 확대에 따라 복잡한 운영 화면을 안정적으로 개선할 프론트엔드 담당자가 필요합니다.',
      work_type: '정규직',
      status: 'on_going',
      checklist_status: 'done',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 8,
      job_name: 'Backend Engineer',
      education_level: '',
      major: '',
      career_level: '5년 이상',
      required_skill: ['Django', 'PostgreSQL', 'Redis', 'Celery'],
      preferred_skill: ['LangGraph', 'Observability', 'API Contract Testing'],
      main_task: 'API와 AI 분석 파이프라인 개발, 데이터 모델링, 계약 테스트 자동화',
      hiring_reason: '',
      work_type: '정규직',
      status: 'prepare',
      checklist_status: 'processing',
      created_at: '2026-01-02',
      updated_at: '2026-01-02',
    },
  ];
  const resumes = Array.from({ length: 5 }, (_, index) => ({
    id: 10 + index,
    job_description_id: index % 2 === 0 ? 7 : 8,
    name: `지원자 ${index + 1}`,
    skill: ['React', 'TypeScript', 'CSS', 'Django'].slice(0, 2 + (index % 3)),
    education_level: {},
    experience: [
      {
        company: `이전 회사 ${index + 1}`,
        role: '서비스 개발',
        detail: '복잡한 운영 화면과 API 연동을 담당했습니다. 긴 경험 설명으로 카드 내부 스크롤 접근성을 확인합니다.',
      },
    ],
    self_intoduction: [
      {
        question: '지원 동기',
        answer:
          '사용자 문제를 해결하는 화면을 만들고 지표 기반으로 개선하는 일에 관심이 있습니다. 긴 자기소개 문장으로 textarea와 요약 카드의 줄바꿈을 확인합니다.',
      },
    ],
    certification: [],
    language: [],
    award: [],
    training: [],
    other_activity: [],
    reviewed: false,
    reviewed_at: '',
    created_at: '2026-01-03',
    updated_at: '2026-01-03',
  }));
  const questions = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    resume_id: 10,
    question: `추천 질문 ${index + 1}: React 화면 성능 문제를 어떤 순서로 진단하고 해결했나요?`,
    answer:
      '렌더링 원인을 측정하고 query cache, memoization, 컴포넌트 분리, 가상화 적용 여부를 판단해 해결했습니다.',
    purpose: '실제 문제 해결 과정과 판단 기준을 확인합니다.',
  }));
  const reportBase = {
    id: 21,
    resume_id: 10,
    overall_grade: 'A',
    overall_summary:
      'JD와 핵심 역량이 잘 맞습니다. 실무 경험의 구체성과 운영 화면 품질 관리 경험을 추가로 확인하면 좋습니다.',
    candidate_summary: 'React와 TypeScript 기반 화면 구현 경험이 있는 지원자입니다.',
    checklist: [
      { content: '필수 기술 보유', result: true },
      { content: '운영형 SaaS 경험', result: true },
      { content: '대규모 상태관리 경험', result: false },
      { content: '접근성 개선 경험', result: true },
    ],
    competency_analysis: Array.from(
      { length: 10 },
      (_, index) => `역량 분석 항목 ${index + 1}: 화면 구조와 API 연동 이해도가 좋고, 검증 가능한 사례가 있습니다.`,
    ),
    fit_analysis: Array.from(
      { length: 9 },
      (_, index) => `적합도 분석 항목 ${index + 1}: JD 요구사항과 연결되는 경험이 확인됩니다.`,
    ),
    motive:
      '지원 동기가 제품과 사용자 문제 해결 관점으로 설명되어 있습니다. 긴 문장에서도 상세 패널이 스크롤 가능한지 확인합니다.',
    collaboration: '협업 과정에서 문서화와 리뷰를 활용한 경험이 드러납니다.',
    strength: ['React 컴포넌트 설계', '사용자 경험 개선', '테스트 기반 검증', '접근성 고려'],
    concern: ['복잡한 데이터 시각화 경험은 추가 확인 필요', '장기 운영 경험 확인 필요'],
    check_point: Array.from(
      { length: 8 },
      (_, index) => `확인 포인트 ${index + 1}: 실제 프로젝트에서 맡은 역할과 문제 해결 범위를 질문하세요.`,
    ),
    final_comment:
      '전반적으로 JD와 잘 맞는 지원자이며, 면접에서는 운영 화면 유지보수 경험과 성능 문제 해결 경험을 깊게 확인하는 것이 좋습니다.',
    review_text: '검토 의견 메모가 긴 경우에도 상세 탭과 편집 폼에서 접근 가능해야 합니다.',
    interview_question: questions,
    status: 'done',
    created_at: '2026-01-04',
    version: 'analysis-graph-v2',
    user_feedback: 4,
  };
  const reportForResume = (resumeId = 10) => ({
    ...reportBase,
    id: 200 + resumeId,
    resume_id: resumeId,
    interview_question: questions.map((question) => ({
      ...question,
      id: resumeId * 100 + question.id,
      resume_id: resumeId,
    })),
  });
  const authKeys = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1,
    name: `면접관 공유 API key ${index + 1}`,
    description:
      '면접관 공유용 API key입니다. 설명이 길어져도 관리자 카드 리스트와 우측 편집 영역이 잘리지 않아야 합니다.',
    credit_limit: 1000 + index * 100,
    value: `sk_live_****${index + 1000}`,
    authorized_resume: resumes.map((resume) => resume.id).slice(0, 3 + (index % 3)),
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
    if (path === 'report/get') {
      let body = {};
      try {
        const postData = route.request().postData();
        body = postData ? JSON.parse(postData) : {};
      } catch {
        body = {};
      }

      const resumeId = Number(body.resume_id ?? body.id ?? 10);
      return fulfillJson(route, { error: false, data: [reportForResume(resumeId)] });
    }
    if (path === 'authkey/get') return fulfillJson(route, { error: false, data: authKeys });
    if (path === 'authkey/credit') return fulfillJson(route, { error: false, data: { credit: 4500 } });
    if (path === 'chat') {
      return fulfillJson(route, {
        error: false,
        response: { role: 'agent', message: 'JD 기준으로 답변합니다. 화면 하단 입력 영역은 항상 접근 가능해야 합니다.' },
      });
    }
    if (path.endsWith('/modify') || path.endsWith('/add') || path === 'resume/analyze' || path === 'jd/analyze') {
      return fulfillJson(route, { error: false, data: reportForResume(10) });
    }

    return fulfillJson(route, { error: false, data: [] });
  });
}

function formatCase(route, viewport, deviceScaleFactor) {
  return `${route} @ ${viewport.name} dpr ${deviceScaleFactor}`;
}

async function waitForRoute(page, routeConfig, viewport, deviceScaleFactor, browserErrors) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`${baseUrl}${routeConfig.route}`, { waitUntil: 'domcontentloaded' });

  try {
    await page.locator('.content-frame').waitFor({ timeout: 12000 });
    await page.locator(routeConfig.root).waitFor({ timeout: 12000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      bodyText: document.body.innerText.slice(0, 1200),
      hasAppRoot: Boolean(document.querySelector('.app-root')),
      location: window.location.href,
      title: document.title,
    }));
    throw new Error(
      `Route shell was not rendered for ${formatCase(routeConfig.route, viewport, deviceScaleFactor)}: ${JSON.stringify({
        ...diagnostic,
        browserErrors,
      })}`,
      { cause: error },
    );
  }
}

async function inspectRoute(page, routeConfig, viewport, deviceScaleFactor, browserErrors) {
  await waitForRoute(page, routeConfig, viewport, deviceScaleFactor, browserErrors);

  return page.evaluate(
    ({ routeConfig, viewport, deviceScaleFactor, overflowTolerance, verticalTolerance }) => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const isDesktopFixedViewport = viewportWidth >= 1200 && !routeConfig.naturalDocumentFlow;

      function roundedRect(rect) {
        return {
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }

      function metricsForElement(element, selector) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return {
          selector,
          tagName: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className : '',
          rect: roundedRect(rect),
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          position: style.position,
          clientWidth: Math.round(element.clientWidth),
          clientHeight: Math.round(element.clientHeight),
          scrollWidth: Math.round(element.scrollWidth),
          scrollHeight: Math.round(element.scrollHeight),
        };
      }

      function queryAll(selector) {
        return Array.from(document.querySelectorAll(selector));
      }

      function isBottomClipped(metric) {
        return metric.rect.bottom > viewportHeight + verticalTolerance;
      }

      function hasHorizontalOverflow(metric) {
        return metric.scrollWidth - metric.clientWidth > overflowTolerance;
      }

      function hasLockedVerticalOverflow(metric) {
        return metric.scrollHeight - metric.clientHeight > overflowTolerance && metric.overflowY === 'hidden';
      }

      function canVerticallyScroll(metric) {
        return ['auto', 'scroll', 'overlay'].includes(metric.overflowY);
      }

      function scrollAccessMetric(selector) {
        const element = document.querySelector(selector);

        if (!element) {
          return { selector, missing: true };
        }

        const before = metricsForElement(element, selector);
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
        const after = metricsForElement(element, selector);

        return {
          selector,
          missing: false,
          before,
          after,
          accessible:
            after.rect.bottom <= viewportHeight + verticalTolerance &&
            after.rect.top >= -verticalTolerance &&
            after.rect.right <= viewportWidth + verticalTolerance &&
            after.rect.left >= -verticalTolerance,
          initiallyVisible:
            before.rect.bottom <= viewportHeight + verticalTolerance &&
            before.rect.top >= -verticalTolerance &&
            before.rect.right <= viewportWidth + verticalTolerance &&
            before.rect.left >= -verticalTolerance,
        };
      }

      const fixedContainerSelectors = [
        '.content-frame',
        '.viewport-page',
        '.viewport-page > .split-editor-layout-row',
        '.viewport-page > .chat-page-layout-row',
        '.viewport-page > .mypage-layout-grid',
        '.viewport-page .admin-workspace-grid',
      ];
      const fixedContainers = fixedContainerSelectors.flatMap((selector) =>
        queryAll(selector).map((element) => metricsForElement(element, selector)),
      );
      const clippedFixedContainers = isDesktopFixedViewport ? fixedContainers.filter(isBottomClipped) : [];

      const sectionCards = queryAll('.viewport-page .section-card').map((element) =>
        metricsForElement(element, '.viewport-page .section-card'),
      );
      const clippedCards = isDesktopFixedViewport
        ? queryAll('.viewport-page .section-card')
            .filter(
              (element) =>
                !element.closest('.viewport-column-scroll') &&
                !element.closest('.dashboard-body-scroll') &&
                !element.closest('.admin-workspace-side'),
            )
            .map((element) => metricsForElement(element, '.viewport-page .section-card'))
            .filter(isBottomClipped)
        : [];

      const cardBodies = queryAll('.viewport-page .section-card > .ant-card-body').map((element) =>
        metricsForElement(element, '.viewport-page .section-card > .ant-card-body'),
      );
      const lockedOverflowCardBodies = cardBodies.filter(hasLockedVerticalOverflow);
      const scrollCardBodies = queryAll('.viewport-page .scroll-card-body > .ant-card-body').map((element) =>
        metricsForElement(element, '.viewport-page .scroll-card-body > .ant-card-body'),
      );
      const scrollCardBodyFailures = scrollCardBodies.filter(
        (metric) => metric.scrollHeight - metric.clientHeight > overflowTolerance && !canVerticallyScroll(metric),
      );

      const horizontalSelectors = [
        'html',
        'body',
        '.content-frame',
        '.viewport-page',
        '.split-editor-layout-row',
        '.chat-page-layout-row',
        '.mypage-layout-grid',
        '.dashboard-body-scroll',
        '.viewport-column-scroll',
        '.admin-workspace-side',
        '.section-card',
        '.section-card > .ant-card-body',
      ];
      const horizontalOverflowElements = horizontalSelectors
        .flatMap((selector) => {
          if (selector === 'html') {
            return [metricsForElement(document.documentElement, selector)];
          }
          if (selector === 'body') {
            return [metricsForElement(document.body, selector)];
          }
          return queryAll(selector).map((element) => metricsForElement(element, selector));
        })
        .filter(hasHorizontalOverflow);

      const scrollContainers = [
        '.viewport-column-scroll',
        '.dashboard-body-scroll',
        '.admin-workspace-side',
        '.scroll-card-body > .ant-card-body',
      ].flatMap((selector) => queryAll(selector).map((element) => metricsForElement(element, selector)));
      const clippedScrollContainers = isDesktopFixedViewport ? scrollContainers.filter(isBottomClipped) : [];

      const actionAccess = routeConfig.actionSelectors.map(scrollAccessMetric);
      const initialVisibilityFailures = (routeConfig.requireInitialVisibleSelectors ?? [])
        .map(scrollAccessMetric)
        .filter((metric) => metric.missing || !metric.initiallyVisible);

      const browser = {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        contentOverflowY: window.getComputedStyle(document.querySelector('.content') ?? document.body).overflowY,
      };

      return {
        route: routeConfig.route,
        viewport,
        deviceScaleFactor,
        isDesktopFixedViewport,
        browser,
        rootRendered: Boolean(document.querySelector(routeConfig.root)),
        hasViewportPage: Boolean(document.querySelector('.viewport-page')),
        clippedFixedContainers,
        clippedCards,
        lockedOverflowCardBodies,
        scrollCardBodyFailures,
        clippedScrollContainers,
        horizontalOverflowElements,
        missingActionSelectors: actionAccess.filter((metric) => metric.missing),
        inaccessibleActions: actionAccess.filter((metric) => !metric.missing && !metric.accessible),
        initialVisibilityFailures,
        counts: {
          sectionCards: sectionCards.length,
          cardBodies: cardBodies.length,
          scrollCardBodies: scrollCardBodies.length,
          actionSelectors: routeConfig.actionSelectors.length,
        },
      };
    },
    { routeConfig, viewport, deviceScaleFactor, overflowTolerance, verticalTolerance },
  );
}

function pushFailures(failures, result) {
  const label = formatCase(result.route, result.viewport, result.deviceScaleFactor);

  if (!result.rootRendered) {
    failures.push(`${label}: route root was not rendered.`);
  }

  for (const metric of result.clippedFixedContainers) {
    failures.push(`${label}: fixed container clipped ${JSON.stringify(metric)}`);
  }

  for (const metric of result.clippedCards) {
    failures.push(`${label}: section card clipped ${JSON.stringify(metric)}`);
  }

  for (const metric of result.lockedOverflowCardBodies) {
    failures.push(`${label}: card body has hidden vertical overflow ${JSON.stringify(metric)}`);
  }

  for (const metric of result.scrollCardBodyFailures) {
    failures.push(`${label}: scroll-card-body is not vertically scrollable ${JSON.stringify(metric)}`);
  }

  for (const metric of result.clippedScrollContainers) {
    failures.push(`${label}: scroll container clipped ${JSON.stringify(metric)}`);
  }

  for (const metric of result.horizontalOverflowElements) {
    failures.push(`${label}: horizontal overflow ${JSON.stringify(metric)}`);
  }

  for (const metric of result.missingActionSelectors) {
    failures.push(`${label}: missing action selector ${metric.selector}`);
  }

  for (const metric of result.inaccessibleActions) {
    failures.push(`${label}: action not accessible after scroll ${JSON.stringify(metric)}`);
  }

  for (const metric of result.initialVisibilityFailures) {
    failures.push(`${label}: action is not initially visible ${JSON.stringify(metric)}`);
  }
}

function summarizeResults(results) {
  const byRoute = new Map();

  for (const result of results) {
    const summary = byRoute.get(result.route) ?? {
      route: result.route,
      cases: 0,
      maxDocumentOverflow: 0,
      maxBodyOverflow: 0,
      maxCardBodies: 0,
      maxScrollCardBodies: 0,
      desktopFixedCases: 0,
      naturalFlowCases: 0,
    };

    summary.cases += 1;
    summary.maxDocumentOverflow = Math.max(
      summary.maxDocumentOverflow,
      result.browser.scrollWidth - result.browser.clientWidth,
    );
    summary.maxBodyOverflow = Math.max(
      summary.maxBodyOverflow,
      result.browser.bodyScrollWidth - result.browser.bodyClientWidth,
    );
    summary.maxCardBodies = Math.max(summary.maxCardBodies, result.counts.cardBodies);
    summary.maxScrollCardBodies = Math.max(summary.maxScrollCardBodies, result.counts.scrollCardBodies);
    summary.desktopFixedCases += result.isDesktopFixedViewport ? 1 : 0;
    summary.naturalFlowCases += result.isDesktopFixedViewport ? 0 : 1;
    byRoute.set(result.route, summary);
  }

  return Array.from(byRoute.values());
}

function summarizeFailures(failures) {
  const byRouteAndType = new Map();

  for (const failure of failures) {
    const match = failure.match(/^(?<route>\/\S+) @ (?<viewport>\S+) dpr (?<dpr>\S+): (?<message>.*)$/);
    const route = match?.groups?.route ?? 'unknown';
    const message = match?.groups?.message ?? failure;
    const type = message.replace(/\s+\{.*$/, '').replace(/\s+selector .*/, ' selector');
    const key = `${route} | ${type}`;
    byRouteAndType.set(key, (byRouteAndType.get(key) ?? 0) + 1);
  }

  return Array.from(byRouteAndType.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

const server = startDevServer();

try {
  await waitForServer(server);

  const browser = await chromium.launch({ executablePath });
  const failures = [];
  const summaries = [];
  const browserErrors = [];

  for (const deviceScaleFactor of enabledDeviceScaleFactors) {
    const context = await browser.newContext({
      deviceScaleFactor,
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();

    page.on('console', (message) => {
      if (message.type() === 'error') {
        browserErrors.push(`[${deviceScaleFactor}] ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      browserErrors.push(`[${deviceScaleFactor}] ${error.message}`);
    });

    await mockBackend(page);

    const matchingViewportCases = viewportCases.filter((item) => item.deviceScaleFactor === deviceScaleFactor);
    for (const { viewport } of matchingViewportCases) {
      for (const routeConfig of enabledRouteChecks) {
        const result = await inspectRoute(page, routeConfig, viewport, deviceScaleFactor, browserErrors);
        summaries.push(result);
        pushFailures(failures, result);
      }
    }

    await context.close();
  }

  await browser.close();

  const routeSummary = summarizeResults(summaries);
  const failureSummary = summarizeFailures(failures);

  if (failures.length) {
    throw new Error(
      `Viewport layout checks failed (${failures.length}):\n${failures
        .slice(0, 25)
        .join('\n')}${failures.length > 25 ? `\n... ${failures.length - 25} more failures` : ''}\n\nFailure summary: ${JSON.stringify(
        failureSummary,
        null,
        2,
      )}\n\nRoute summary: ${JSON.stringify(
        routeSummary,
        null,
        2,
      )}\nBrowser errors: ${JSON.stringify(browserErrors.slice(0, 20), null, 2)}`,
    );
  }

  console.log(
    `Viewport layout checks passed. ${JSON.stringify({
      cases: summaries.length,
      routes: enabledRouteChecks.map((item) => item.route),
      viewportGroups: Object.fromEntries(viewportGroups.map(([group, candidates]) => [group, candidates])),
      deviceScaleFactors: enabledDeviceScaleFactors,
      scaledViewportNames: Array.from(scaledViewportNames),
      routeSummary,
    })}`,
  );

  if (verbose) {
    console.log(JSON.stringify(summaries, null, 2));
  }
} finally {
  server.kill();
}
