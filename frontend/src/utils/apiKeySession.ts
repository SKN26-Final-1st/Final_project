export const API_KEY_SESSION_STORAGE_KEY = 'humour.apiKey';

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

export function getApiKeyFingerprint(apiKey: string | null | undefined) {
  if (!apiKey) {
    return 'none';
  }

  return `${apiKey.length}:${apiKey.slice(-6)}`;
}

export function getCurrentAuthMode(): AuthMode {
  return getStoredApiKey() ? 'apiKey' : 'account';
}
