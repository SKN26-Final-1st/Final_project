import type { AppRoute } from '../data/appConfig';
import type { AuthMode } from './apiKeySession';

type CrudCapabilities = { create: boolean; edit: boolean; delete: boolean };

export type AuthCapabilities = {
  routes: AppRoute[];
  jd: CrudCapabilities & { analyze: boolean; chat: boolean };
  checklist: CrudCapabilities;
  resume: CrudCapabilities & { analyze: boolean };
  report: { edit: boolean; delete: boolean; feedback: boolean };
  account: { manage: boolean };
  company: { manage: boolean };
  authKey: { manage: boolean };
};

const ACCOUNT_ROUTES: AppRoute[] = [
  '/dashboard', '/admin', '/company', '/jd', '/cover-letter', '/analysis-report', '/chat', '/mypage',
  '/recruitment-post', '/cover-letter-template',
];
const API_KEY_ROUTES: AppRoute[] = ['/jd', '/cover-letter', '/analysis-report'];

export function getAuthCapabilities(authMode: AuthMode): AuthCapabilities {
  const isAccount = authMode === 'account';
  const isAuthenticated = isAccount || authMode === 'apiKey';

  return {
    routes: isAccount ? ACCOUNT_ROUTES : authMode === 'apiKey' ? API_KEY_ROUTES : [],
    jd: { create: isAccount, edit: isAuthenticated, delete: isAuthenticated, analyze: isAuthenticated, chat: isAccount },
    checklist: { create: isAccount, edit: isAuthenticated, delete: isAuthenticated },
    resume: { create: isAccount, edit: isAuthenticated, delete: isAuthenticated, analyze: isAuthenticated },
    report: { edit: isAuthenticated, delete: isAuthenticated, feedback: isAuthenticated },
    account: { manage: isAccount },
    company: { manage: isAccount },
    authKey: { manage: isAccount },
  };
}

export function canAccessRoute(capabilities: AuthCapabilities, route: AppRoute) {
  return capabilities.routes.includes(route);
}
