import type { ReactNode } from 'react';
import type { UserProfile } from '../../api/adapters';
import type { AppRoute } from '../../data/appConfig';
import type { Navigate, ShowAlert, ThemeMode } from '../../types/app';
import type { AuthMode } from '../../utils/apiKeySession';

export type NavigationProps = {
  allowedRoutes?: AppRoute[];
  authMode?: AuthMode;
  homeRoute?: AppRoute;
  route: AppRoute;
  mode: ThemeMode;
  creditPercent: number;
  profile?: UserProfile;
  themeSwitch: ReactNode;
  navigate: Navigate;
  onLogout: () => void;
  showAlert: ShowAlert;
};
