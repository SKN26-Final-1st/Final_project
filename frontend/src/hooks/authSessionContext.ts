import { createContext, useContext } from 'react';
import type { AuthCapabilities } from '../utils/authCapabilities';
import { getAuthCapabilities } from '../utils/authCapabilities';
import type { AuthMode } from '../utils/apiKeySession';

export type AuthSessionContextValue = {
  apiKey: string | null;
  authMode: AuthMode;
  authSessionKey: string;
  capabilities: AuthCapabilities;
};

export const AuthSessionContext = createContext<AuthSessionContextValue>({
  apiKey: null,
  authMode: 'account',
  authSessionKey: 'account',
  capabilities: getAuthCapabilities('account'),
});

export function useAuthSessionContext() {
  return useContext(AuthSessionContext);
}
