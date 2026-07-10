export const API_KEY_SESSION_STORAGE_KEY = 'humour.apiKey';
const AUTH_RECOVERY_SESSION_STORAGE_KEY = 'humour.authRecovery';

export type AuthMode = 'account' | 'apiKey' | null;

function canUseSessionStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage);
}

export function getStoredApiKey() {
  if (!canUseSessionStorage()) {
    return null;
  }

  return window.sessionStorage.getItem(API_KEY_SESSION_STORAGE_KEY);
}

export function setStoredApiKey(apiKey: string) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(API_KEY_SESSION_STORAGE_KEY, apiKey);
}

export function clearStoredApiKey() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(API_KEY_SESSION_STORAGE_KEY);
}

export function markAuthRecoveryRequested() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(AUTH_RECOVERY_SESSION_STORAGE_KEY, 'true');
}

export function getAuthRecoveryRequested() {
  if (!canUseSessionStorage()) {
    return false;
  }

  return window.sessionStorage.getItem(AUTH_RECOVERY_SESSION_STORAGE_KEY) === 'true';
}

export function clearAuthRecoveryRequested() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(AUTH_RECOVERY_SESSION_STORAGE_KEY);
}

export function getApiKeyFingerprint(apiKey: string | null | undefined) {
  if (!apiKey) {
    return 'none';
  }

  return `${apiKey.length}:${apiKey.slice(-6)}`;
}

export function getCurrentAuthMode(): AuthMode {
  return getStoredApiKey() ? 'apiKey' : 'account';
}
