import type { ReactNode } from 'react';
import { Layout } from 'antd';
import { MobileShellHeader, SidebarNav } from './SidebarNav';
import type { UserProfile } from '../../api/adapters';
import type { AppRoute } from '../../data/appConfig';
import type { Navigate, ShowAlert, ThemeMode } from '../../types/app';
import type { AuthMode } from '../../utils/apiKeySession';

const { Content } = Layout;

type AppShellProps = {
  allowedRoutes?: AppRoute[];
  authMode?: AuthMode;
  route: AppRoute;
  children: ReactNode;
  assistantFab?: ReactNode;
  homeRoute?: AppRoute;
  mode: ThemeMode;
  themeSwitch: ReactNode;
  creditPercent: number;
  profile?: UserProfile;
  navigate: Navigate;
  onLogout: () => void;
  showAlert: ShowAlert;
};

export function AppShell({
  allowedRoutes,
  authMode,
  route,
  children,
  assistantFab,
  homeRoute,
  mode,
  themeSwitch,
  creditPercent,
  profile,
  navigate,
  onLogout,
  showAlert,
}: AppShellProps) {
  return (
    <Layout className="shell">
      <SidebarNav
        allowedRoutes={allowedRoutes}
        authMode={authMode}
        homeRoute={homeRoute}
        route={route}
        mode={mode}
        creditPercent={creditPercent}
        profile={profile}
        themeSwitch={themeSwitch}
        navigate={navigate}
        onLogout={onLogout}
        showAlert={showAlert}
      />
      <Layout>
        <MobileShellHeader
          allowedRoutes={allowedRoutes}
          authMode={authMode}
          homeRoute={homeRoute}
          route={route}
          mode={mode}
          creditPercent={creditPercent}
          profile={profile}
          themeSwitch={themeSwitch}
          navigate={navigate}
          onLogout={onLogout}
          showAlert={showAlert}
        />
        <Content className="content">
          <div className="content-frame" key={route}>
            {children}
          </div>
        </Content>
      </Layout>
      {assistantFab}
    </Layout>
  );
}
