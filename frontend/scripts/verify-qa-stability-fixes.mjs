import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const authKeyList = read('src/components/admin/AuthKeyList.tsx');
assert(/maskAuthKeyValue/.test(authKeyList), 'AuthKeyList must mask key values before rendering them.');
assert(!/<Tag className="authkey-value-tag">\s*\{authKey\.value\}\s*<\/Tag>/.test(authKeyList), 'AuthKeyList must not render authKey.value directly.');

const signupPage = read('src/pages/auth/SignupPage.tsx');
assert(/checkedUsername/.test(signupPage), 'SignupPage must remember which username was checked.');
assert(/setCheckedUsername\(null\)/.test(signupPage), 'SignupPage must reset username verification when values change.');
assert(/available === true/.test(signupPage), 'SignupPage must only mark username as checked when backend says available=true.');
assert(/checkedUsername !== values\.username\.trim\(\)/.test(signupPage), 'SignupPage submit must block when the checked username differs from the current value.');

const app = read('src/App.tsx');
assert(/setChatInput\(trimmed\)/.test(app), 'Chat failure must restore the original input.');
assert(/prev\.slice\(0,\s*-1\)/.test(app), 'Chat failure must remove the optimistic user message.');

const useAppData = read('src/hooks/useAppData.ts');
assert(/loading:\s*enabled\s*&&\s*isPending/.test(useAppData), 'useAppData loading must be based on initial pending state only.');
assert(/refreshing:\s*enabled\s*&&\s*isFetching\s*&&\s*!isPending/.test(useAppData), 'useAppData should expose refreshing separately from loading.');

const appDataService = read('src/api/appDataService.ts');
assert(!/apiClient\.getUserProfile\(\)/.test(appDataService), 'loadAppData must not duplicate account/get via getUserProfile.');

const useApiAction = read('src/hooks/useApiAction.ts');
assert(!/if\s*\(\s*loadingKey\s*\)\s*\{\s*return;?\s*\}/.test(useApiAction), 'useApiAction must not use a global API action lock.');
assert(/if\s*\(\s*loadingKey\s*===\s*key\s*\)/.test(useApiAction), 'useApiAction should only block duplicate actions for the same key.');

console.log('QA stability checks passed.');
