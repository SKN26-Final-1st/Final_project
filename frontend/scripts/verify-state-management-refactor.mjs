import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const exists = (path) => existsSync(resolve(root, path));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const requiredHooks = [
  'src/hooks/useJdPageData.ts',
  'src/hooks/useCoverLetterPageData.ts',
  'src/hooks/useAdminPageData.ts',
  'src/hooks/useAnalysisReportPageData.ts',
  'src/hooks/useChatPageData.ts',
  'src/hooks/useDocumentChatState.ts',
  'src/hooks/mutations/useAdminMutations.ts',
  'src/hooks/mutations/useJdMutations.ts',
  'src/hooks/mutations/useResumeMutations.ts',
];

for (const hookPath of requiredHooks) {
  assert(exists(hookPath), `Missing state-management hook: ${hookPath}`);
}

const app = read('src/App.tsx');
const removedAppStateNames = [
  'selectedJdIdOverride',
  'selectedRowKeys',
  'selectedReportResumeId',
  'analysisDone',
  'createdAuthKey',
  'chatMessages',
  'chatInput',
];

for (const name of removedAppStateNames) {
  assert(!new RegExp(`\\[\\s*${name}\\b[\\s\\S]*?useState`).test(app), `App.tsx should not own ${name}.`);
}

assert(!/import\s+\{\s*apiClient\s*\}/.test(app), 'App.tsx should not import apiClient for page/domain mutations.');
assert(!/type\s+ChatMessage/.test(app), 'App.tsx should not own chat message types.');
assert(!/type\s+AuthKey/.test(app), 'App.tsx should not own created AuthKey state.');
assert(!/jdList=\{data\./.test(app), 'App.tsx should not pass jdList from app data into pages.');
assert(!/resumes=\{data\./.test(app), 'App.tsx should not pass resumes from app data into pages.');
assert(!/analysisReports=\{data\./.test(app), 'App.tsx should not pass analysisReports from app data into pages.');
assert(!/authKeys=\{data\./.test(app), 'App.tsx should not pass authKeys from app data into AdminPage.');
assert(!/reloadData=\{reload\}/.test(app), 'App.tsx should not pass app-data refetch callbacks into domain pages.');

const jdPage = read('src/pages/JdPage.tsx');
assert(/useJdPageData/.test(jdPage), 'JdPage should select its own query data.');
assert(/useJdMutations/.test(jdPage), 'JdPage should use JD mutation hooks.');

const coverPage = read('src/pages/CoverLetterPage.tsx');
assert(/useCoverLetterPageData/.test(coverPage), 'CoverLetterPage should select its own query data.');
assert(/useResumeMutations/.test(coverPage), 'CoverLetterPage should use resume mutation hooks.');

const adminPage = read('src/pages/AdminPage.tsx');
assert(/useAdminPageData/.test(adminPage), 'AdminPage should select its own query data.');
assert(/useAdminMutations/.test(adminPage), 'AdminPage should use admin mutation hooks.');
assert(/useState<[\s\S]*Pick<AuthKey, 'name' \| 'value'>/.test(adminPage), 'AdminPage should own created API key state locally.');

const reportPage = read('src/pages/AnalysisReportPage.tsx');
assert(/useAnalysisReportPageData/.test(reportPage), 'AnalysisReportPage should select its own query data.');
const reportHook = read('src/hooks/useAnalysisReportPageData.ts');
assert(/useSearchParams/.test(reportHook), 'Analysis report data hook should use URL query for selected resume.');

const chatPage = read('src/pages/ChatPage.tsx');
assert(/useChatPageData/.test(chatPage), 'ChatPage should select its own query data.');
assert(/useDocumentChatState/.test(chatPage), 'ChatPage should use document chat state hook.');

for (const mutationHook of [
  'src/hooks/mutations/useAdminMutations.ts',
  'src/hooks/mutations/useJdMutations.ts',
  'src/hooks/mutations/useResumeMutations.ts',
]) {
  const source = read(mutationHook);
  assert(/useMutation/.test(source), `${mutationHook} should use TanStack Query useMutation.`);
  assert(
    /useInvalidateAppData/.test(source) || /invalidateQueries\(\{\s*queryKey:\s*queryKeys\.appData\(\)/.test(source),
    `${mutationHook} should invalidate app-data cache on success.`,
  );
}

console.log('State-management refactor checks passed.');
