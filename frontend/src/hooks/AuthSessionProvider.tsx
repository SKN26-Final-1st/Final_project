import type { PropsWithChildren } from 'react';
import { AuthSessionContext, type AuthSessionContextValue } from './authSessionContext';

export function AuthSessionProvider({ children, value }: PropsWithChildren<{ value: AuthSessionContextValue }>) {
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
