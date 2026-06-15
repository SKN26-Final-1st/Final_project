import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(root, '..');

function read(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const backendClient = read('frontend/src/api/backendClient.ts');
const httpClient = read('frontend/src/api/httpClient.ts');
const authPages = [
  read('frontend/src/pages/AuthPages.tsx'),
  read('frontend/src/pages/auth/LoginPage.tsx'),
  read('frontend/src/pages/auth/SignupPage.tsx'),
  read('frontend/src/pages/auth/PasswordResetPage.tsx'),
].join('\n');
const myPage = read('frontend/src/pages/MyPage.tsx');
const securitySettingsForm = read('frontend/src/components/mypage/SecuritySettingsForm.tsx');
const authScreen = read('frontend/src/components/layout/AuthScreen.tsx');
const sidebarNav = [
  read('frontend/src/components/layout/SidebarNav.tsx'),
  read('frontend/src/components/layout/MobileShellHeader.tsx'),
  read('frontend/src/components/layout/MenuItems.tsx'),
  read('frontend/src/components/layout/navigationUtils.ts'),
].join('\n');
const topHeader = read('frontend/src/components/layout/TopHeader.tsx');
const app = read('frontend/src/App.tsx');
const useApiAction = read('frontend/src/hooks/useApiAction.ts');
const sharedReportPage = read('frontend/src/pages/SharedReportPage.tsx');
const recruitmentPostPage = read('frontend/src/pages/RecruitmentPostPage.tsx');
const coverLetterTemplatePage = read('frontend/src/pages/CoverLetterTemplatePage.tsx');
const appDataService = read('frontend/src/api/appDataService.ts');
const adapters = read('frontend/src/api/adapters.ts');
const backendTypes = read('frontend/src/data/backendTypes.ts');
const appConfig = read('frontend/src/data/appConfig.tsx');
const viteConfig = read('frontend/vite.config.ts');
const backendClientContractSource = `${backendClient}\n${httpClient}`;

const requiredBackendCalls = [
  'csrf',
  'signin',
  'login',
  'logout',
  'checkuser',
  'passqestion',
  'passreset',
  'account/get',
  'account/modify',
  'compinfo/get',
  'compinfo/modify',
  'authkey/add',
  'authkey/get',
  'authkey/modify',
  'jd/add',
  'jd/get',
  'jd/modify',
  'resume/add',
  'resume/get',
  'resume/modify',
  'resume/analize',
  'report/get',
  'report/modify',
  'question/get',
  'question/modify',
  'chat',
];

function containsEndpoint(source, endpoint) {
  return [
    `'${endpoint}'`,
    `"${endpoint}"`,
    `/${endpoint}/`,
    `\${API_ROOT}/${endpoint}/`,
  ].some((needle) => source.includes(needle));
}

function getApiClientMethod(source, method) {
  const methodStart = source.indexOf(`  ${method}:`);
  assert(methodStart >= 0, `Missing account API method ${method}`);
  const methodTail = source.slice(methodStart + 1);
  const nextMethodMatch = /\n  [A-Za-z]\w+:\s/.exec(methodTail);
  const methodEnd = nextMethodMatch ? methodStart + 1 + nextMethodMatch.index : source.length;
  return source.slice(methodStart, methodEnd);
}

function getRouteMenuObject(source, route) {
  const routeStart = source.indexOf(`route: '${route}'`);
  assert(routeStart >= 0, `Missing menu route ${route}`);
  const routeTail = source.slice(routeStart);
  const endMatch = /\n\s*\},/.exec(routeTail);
  assert(endMatch, `Could not parse menu route ${route}`);
  return routeTail.slice(0, endMatch.index);
}

for (const endpoint of requiredBackendCalls) {
  assert(
    containsEndpoint(backendClientContractSource, endpoint),
    `Missing frontend backend call for ${endpoint}`,
  );
}

assert(
  /requestBackend<AnalysisReport\[\]>\(['"]report\/get['"]/.test(backendClient),
  'report/get must treat backend data as AnalysisReport[]',
);

assert(
  /requestBackend<\{\s*report:\s*AnalysisReport;\s*questions:\s*InterviewQuestion\[\];\s*\}>\(['"]resume\/analize['"],\s*\{\s*id:\s*resume\.id\s*\}\)/.test(
    backendClient,
  ),
  'resume/analize must send resume.id and consume the returned report/questions payload',
);

const realApiMethodNames = [
  'getDashboard',
  'getCompanyProfile',
  'getJobDescriptions',
  'getCoverLetterDraft',
  'getCoverLetters',
  'getAnalysisReport',
  'getRecruitmentPreview',
  'getCoverLetterTemplate',
  'saveCompanyProfile',
  'getAuthKeys',
  'addAuthKey',
  'saveAuthKey',
  'deleteAuthKey',
  'addJobDescription',
  'saveJobDescription',
  'deleteJobDescription',
  'requestJobAnalysis',
  'addResume',
  'saveResume',
  'deleteResume',
  'uploadCoverLetters',
  'requestCoverLetterAnalysis',
  'sendChatMessage',
  'saveReport',
  'saveQuestion',
];

for (const method of realApiMethodNames) {
  const methodBody = getApiClientMethod(backendClient, method);
  assert(!methodBody.includes('USE_MOCK_API'), `${method} must use real backend data instead of USE_MOCK_API`);
  assert(!/ApiResponse\.data/.test(methodBody), `${method} must not read static mock ApiResponse data`);
}

assert(!/function getDashboardSource\(\)[\s\S]*USE_MOCK_API/.test(backendClient), 'Dashboard source must not switch to local mock data');
assert(!/function getResumeSourceForJob[\s\S]*USE_MOCK_API/.test(backendClient), 'Resume source must not switch to local mock data');

assert(
  /apiKey\?:\s*string/.test(backendClientContractSource) &&
    /headers\.set\(['"]X-API-Key['"],\s*apiKey\s*\?\?\s*API_KEY\)/.test(backendClientContractSource),
  'Backend client must support per-request X-API-Key for shared report access',
);

assert(/getSharedResumeBundle/.test(backendClient), 'Shared resume/report/question bundle API is required');
assert(/\/shared/.test(appConfig) && /\/shared/.test(app), 'Shared report route must exist');

const recruitmentPostMenu = getRouteMenuObject(appConfig, '/recruitment-post');
const coverLetterTemplateMenu = getRouteMenuObject(appConfig, '/cover-letter-template');

assert(
  /mvpStatus\?:\s*['"]active['"] \| ['"]planned['"]/.test(appConfig) &&
    /visibleInNav\?:\s*boolean/.test(appConfig),
  'Menu items must explicitly distinguish active backend-backed pages from planned MVP pages',
);

for (const [route, menuObject] of [
  ['/recruitment-post', recruitmentPostMenu],
  ['/cover-letter-template', coverLetterTemplateMenu],
]) {
  assert(/mvpStatus:\s*['"]planned['"]/.test(menuObject), `${route} must be marked as a planned MVP route`);
  assert(/visibleInNav:\s*false/.test(menuObject), `${route} must be hidden from primary navigation`);
}

assert(
  /export const activeMainMenu = mainMenu\.filter/.test(appConfig),
  'appConfig must expose activeMainMenu for navigation surfaces',
);

assert(
  /activeMainMenu/.test(sidebarNav) && /activeMainMenu/.test(topHeader),
  'Sidebar and mobile route select must use activeMainMenu instead of exposing planned MVP pages',
);

assert(
  /const postGenerated = false;/.test(app) && /const templateGenerated = false;/.test(app),
  'Unsupported recruitment/template generation pages must not start in mock-generated success state',
);

assert(
  /planned-mvp-alert/.test(recruitmentPostPage) && /planned-mvp-alert/.test(coverLetterTemplatePage),
  'Planned MVP pages must show a backend API planned/development notice when accessed directly',
);

assert(
  /async function getJobDescriptions\(apiKey\?: string\)[\s\S]*requestBackend<JobDescription\[\]>\(['"]jd\/get['"],\s*\{\},\s*\{\s*apiKey\s*\}\)/.test(
    backendClient,
  ),
  'jd/get must support X-API-Key access for shared and public report flows',
);

assert(
  /async function getSharedResumeBundle\(resumeId: number, apiKey: string\)[\s\S]*getJobDescriptions\(apiKey\)/.test(
    backendClient,
  ),
  'Shared API key bundle must fetch accessible JD data through X-API-Key',
);

assert(
  /jobDescription:\s*JobDescription \| null/.test(sharedReportPage) && /bundle\.jobDescription/.test(sharedReportPage),
  'Shared report page must display the JD that is accessible through the API key',
);

assert(
  /type Account = \{[\s\S]*\bid: number;[\s\S]*\busername: string;[\s\S]*\baccount_hash: string;[\s\S]*\}/.test(
    backendTypes,
  ),
  'Account type must match backend to_dict fields, including required id, username, and account_hash',
);

assert(!/\bpassword\??:/.test(backendTypes.match(/type Account = \{[\s\S]*?\};/)?.[0] ?? ''), 'Account type must not include password');

assert(
  !/\baccount_id\??:/.test(backendTypes.match(/type AuthKey = \{[\s\S]*?\};/)?.[0] ?? ''),
  'AuthKey type must not expose account_id',
);

assert(
  /type CompanyInfo = \{[\s\S]*\bid: number;[\s\S]*\}/.test(backendTypes) &&
    !/\baccount_id\??:/.test(backendTypes.match(/type CompanyInfo = \{[\s\S]*?\};/)?.[0] ?? ''),
  'CompanyInfo type must match backend fields with required id and no account_id',
);

assert(
  !/\baccount_id\??:/.test(backendTypes.match(/type JobDescription = \{[\s\S]*?\};/)?.[0] ?? ''),
  'JobDescription type must not expose account_id',
);

assert(
  /reviewed_at:\s*DateTimeString;/.test(backendTypes),
  'Resume.reviewed_at must be a backend-normalized DateTimeString',
);

assert(!/reviewed_at:\s*null/.test(backendTypes), 'Resume types must use backend-normalized reviewed_at strings instead of null');

const accountMethodNames = [
  'getUserProfile',
  'login',
  'logout',
  'saveUserProfile',
  'checkSignupId',
  'completeSignup',
  'getPasswordQuestion',
  'resetPassword',
];

for (const method of accountMethodNames) {
  const methodBody = getApiClientMethod(backendClient, method);
  assert(!methodBody.includes('USE_MOCK_API'), `${method} must not branch to mock data`);
  assert(!methodBody.includes('authDefaultsApiResponse'), `${method} must not use mock auth defaults`);
}

assert(
  /login:\s*async\s*\(\s*username:\s*string,\s*password:\s*string\s*\)[\s\S]*await loginRequest\(username,\s*password\)[\s\S]*await getAccount\(\)/.test(
    backendClient,
  ),
  'login must call backend login and then reload the real account',
);

assert(
  /completeSignup:\s*async\s*\(body:\s*SignupBody\)[\s\S]*await signinRequest\(\{[\s\S]*username:\s*body\.username[\s\S]*password:\s*body\.password[\s\S]*verification_answer:\s*body\.verification_answer/.test(
    backendClient,
  ),
  'completeSignup must send the submitted signup fields directly to signin',
);

assert(
  /requestAction\(['"]account\/modify['"],\s*sanitizeAccountModifyBody\(body\)\)/.test(backendClient),
  'saveUserProfile must sanitize blocked account fields before account/modify',
);

assert(
  /password_confirm\?:\s*string/.test(securitySettingsForm) &&
    /name="password_confirm"/.test(securitySettingsForm) &&
    /getFieldValue\(['"]password['"]\)/.test(securitySettingsForm),
  'Password change form must require confirmation and validate it against the new password',
);

assert(
  !myPage.includes('Object.assign(body, securityValues)') &&
    /body\.formal_password\s*=\s*securityValues\.formal_password/.test(myPage) &&
    /body\.password\s*=\s*securityValues\.password/.test(myPage) &&
    !/password_confirm[\s\S]*apiClient\.saveUserProfile/.test(myPage),
  'MyPage password payload must pick only formal_password and password for account/modify',
);

assert(
  /apiClient\.login\(profile\.username,\s*securityValues\.password\)/.test(myPage) &&
    /securityForm\.resetFields\(\)/.test(myPage) &&
    /void reloadData\(\)/.test(myPage) &&
    !/onPasswordChanged/.test(myPage) &&
    !/onPasswordChanged=/.test(app),
  'Password changes must refresh the session with the new password, clear password fields, and stay on protected routes',
);

assert(!authPages.includes('authDefaults'), 'Auth pages must not prefill from mock auth defaults');
assert(!authPages.includes('verification_answer ??'), 'Password reset must not reuse a mock verification answer');
assert(!authScreen.includes("nav('/dashboard')"), 'Auth screen logo must not navigate directly to a protected route');
assert(/className="auth-logo-button"[\s\S]*type="button"|type="button"[\s\S]*className="auth-logo-button"/.test(authScreen), 'Auth logo button must be a non-submit button');
assert(/isAuthenticated/.test(app), 'App must track authenticated state for protected routes');
assert(/<RouterNavigate to="\/login" replace/.test(app), 'Protected routes must redirect unauthenticated users to login');
assert(!appDataService.includes('getAuthDefaults'), 'App data loading must not request mock auth defaults');
assert(!appDataService.includes('getLocalDashboardData'), 'App data loading must not fall back to local mock dashboard data');
assert(!adapters.includes('authDefaultsApiResponse'), 'Adapters must not derive AuthDefaults from mock account data');

assert(
  /server:\s*\{[\s\S]*proxy:\s*\{[\s\S]*\/api/.test(viteConfig),
  'vite.config.ts must proxy /api to the Django dev server',
);

assert(
  /port:\s*5173/.test(viteConfig) && /strictPort:\s*true/.test(viteConfig),
  'Vite dev server must stay on backend CSRF-trusted port 5173 instead of silently moving to another port',
);

assert(
  /async function checkUserRequest\(username: string\)[\s\S]*username\.trim\(\)[\s\S]*requestAction\(['"]checkuser['"],\s*\{\s*username:\s*trimmedUsername\s*\}\)/.test(
    backendClient,
  ),
  'checkuser must trim username and send POST /api/checkuser/ body as { username: trimmedUsername }',
);

assert(
  /async function checkUserRequest\(username: string\)[\s\S]*typeof payload\.valid !== ['"]boolean['"]/.test(backendClient),
  'checkuser must read top-level valid:boolean and reject malformed responses',
);

assert(
  /name="username"[\s\S]*whitespace:\s*true/.test(authPages),
  'Signup username field must block empty or whitespace-only values before calling checkuser',
);

assert(
  /catch \(nextError\)[\s\S]*const errorMessage = nextError instanceof Error \? nextError\.message/.test(useApiAction),
  'runApiAction must surface the concrete backend/client error message instead of only a generic API failure',
);

const mockOnlyMethods = [
  'generateRecruitmentPost',
  'downloadRecruitmentPdf',
  'generateCoverLetterTemplate',
  'downloadTemplateDocument',
];

for (const method of mockOnlyMethods) {
  const methodStart = backendClient.indexOf(`${method}:`);
  assert(methodStart >= 0, `Missing mock-only method ${method}`);
  const methodBody = getApiClientMethod(backendClient, method);
  assert(!methodBody.includes('requestAction('), `${method} should remain mock-only until backend endpoint exists`);
  assert(methodBody.includes('unsupportedBackendFeature'), `${method} must be marked as backend-unsupported`);
}

console.log('Backend contract checks passed.');
