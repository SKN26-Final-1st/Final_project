import type { ReactNode } from 'react';
import { Layout } from 'antd';
import { MobileShellHeader, SidebarNav } from './SidebarNav';
import type { UserProfile } from '../../api/adapters';
import type { AppRoute } from '../../data/mockData';
import type { Navigate, ShowAlert, ThemeMode } from '../../types/app';

const { Content } = Layout;

type AppShellProps = {
  route: AppRoute;
  children: ReactNode;
  assistantFab?: ReactNode;
  mode: ThemeMode;
  themeSwitch: ReactNode;
  creditPercent: number;
  profile?: UserProfile;
  navigate: Navigate;
  showAlert: ShowAlert;
};

export function AppShell({
  route,
  children,
  assistantFab,
  mode,
  themeSwitch,
  creditPercent,
  profile,
  navigate,
  showAlert,
}: AppShellProps) {
  return (
    <Layout className="shell">
      <SidebarNav
        route={route}
        mode={mode}
        creditPercent={creditPercent}
        profile={profile}
        themeSwitch={themeSwitch}
        navigate={navigate}
        showAlert={showAlert}
      />
      <Layout>
        <MobileShellHeader
          route={route}
          mode={mode}
          creditPercent={creditPercent}
          profile={profile}
          themeSwitch={themeSwitch}
          navigate={navigate}
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
