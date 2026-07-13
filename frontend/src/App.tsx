import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate as RouterNavigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { XProvider } from '@ant-design/x';
import { App as AntApp, Switch, Tooltip } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FloatingAlert } from './components/common/FloatingAlert';
import { PageLoading } from './components/common/PageState';
import { resetAuthExpiryHandling } from './api/httpClient';
import { DocumentChatFab } from './components/chat/DocumentChatFab';
import { AppShell } from './components/layout/AppShell';
import { AuthRouteContent } from './components/routing/AuthRouteContent';
import { ProtectedRouteContent } from './components/routing/ProtectedRouteContent';
import type { AppRoute } from './data/appConfig';
import { createAppThemeConfig } from './data/appThemeConfig';
import { useApiAction } from './hooks/useApiAction';
import { useAppData } from './hooks/useAppData';
import { useAuthExpiryHandler } from './hooks/useAuthExpiryHandler';
import { useAuthSession } from './hooks/useAuthSession';
import { DocumentChatProvider } from './hooks/useDocumentChatState';
import { useLogoutAction } from './hooks/useLogoutAction';
import { SharedReportPage } from './pages/SharedReportPage';
import type { ThemeMode } from './types/app';
import { appRoutes, authRoutes, getRouteFromPathname } from './utils/routes';

const API_KEY_ALLOWED_ROUTES: AppRoute[] = ['/jd', '/cover-letter', '/analysis-report'];
const API_KEY_HOME_ROUTE: AppRoute = '/jd';

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const navigate = useCallback((nextRoute: AppRoute | string) => {
    void routerNavigate(nextRoute);
  }, [routerNavigate]);
  const route = getRouteFromPathname(location.pathname);
  const [mode, setMode] = useState<ThemeMode>('light');
  const { alert, loadingKey, runApiAction, setAlert, showAlert } = useApiAction();
  const [resetStep, setResetStep] = useState(0);
  const isAuth = authRoutes.includes(route);
  const isShared = route === '/shared';
  const renderedThemeMode: ThemeMode = isAuth ? 'light' : mode;
  const {
    apiKey,
    authChecked,
    authMode,
    clearAuthSession,
    isAuthenticated,
    setApiKeySession,
    setIsAuthenticated,
  } = useAuthSession(isShared);
  const isApiKeyMode = authMode === 'apiKey';
  const isApiKeyAllowedRoute = API_KEY_ALLOWED_ROUTES.includes(route);
  const appHomeRoute = isApiKeyMode ? API_KEY_HOME_ROUTE : '/dashboard';
  const shouldLoadAppData =
    authChecked && isAuthenticated && !isAuth && !isShared && (!isApiKeyMode || isApiKeyAllowedRoute);
  const { data, loading, error, reload } = useAppData(shouldLoadAppData, authMode, apiKey);
  useAuthExpiryHandler({ clearAuthSession, navigate });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const themeConfig = useMemo(() => createAppThemeConfig(renderedThemeMode), [renderedThemeMode]);

  const logout = useLogoutAction({ authMode, clearAuthSession, navigate, runApiAction, setIsAuthenticated });

  const themeSwitch = (
    <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
      <Switch
        aria-label={mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        checked={mode === 'dark'}
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        onChange={(checked) => setMode(checked ? 'dark' : 'light')}
      />
    </Tooltip>
  );

  const protectedContent = (
    <DocumentChatProvider
      loadingKey={loadingKey}
      runApiAction={runApiAction}
      showAlert={showAlert}
    >
      <AppShell
        allowedRoutes={isApiKeyMode ? API_KEY_ALLOWED_ROUTES : undefined}
        authMode={authMode}
        route={route}
        mode={mode}
        assistantFab={isApiKeyMode || route === '/chat' ? undefined : <DocumentChatFab navigate={navigate} />}
        homeRoute={appHomeRoute}
        themeSwitch={themeSwitch}
        creditPercent={data?.dashboard.creditPercent ?? 0}
        profile={data?.userProfile}
        navigate={navigate}
        onLogout={logout}
        showAlert={showAlert}
      >
        <ProtectedRouteContent
          route={route}
          loading={loading}
          error={error}
          hasData={Boolean(data)}
          isApiKeyMode={isApiKeyMode}
          isApiKeyAllowedRoute={isApiKeyAllowedRoute}
          apiKeyHomeRoute={API_KEY_HOME_ROUTE}
          authMode={authMode}
          loadingKey={loadingKey}
          mode={mode}
          navigate={navigate}
          reload={reload}
          runApiAction={runApiAction}
          setIsAuthenticated={setIsAuthenticated}
          showAlert={showAlert}
        />
      </AppShell>
    </DocumentChatProvider>
  );

  const pageContent = (
    <XProvider theme={themeConfig}>
      <AntApp>
        <div className="app-root" data-theme={renderedThemeMode}>
          <FloatingAlert alert={alert} onClose={() => setAlert(null)} />
          {isShared ? (
            <SharedReportPage mode={mode} navigate={navigate} themeSwitch={themeSwitch} />
          ) : isAuth && authChecked && isAuthenticated ? (
            <RouterNavigate to={appHomeRoute} replace />
          ) : isAuth ? (
            <AuthRouteContent
              route={route}
              mode={renderedThemeMode}
              navigate={navigate}
              loadingKey={loadingKey}
              runApiAction={runApiAction}
              resetStep={resetStep}
              setResetStep={setResetStep}
              showAlert={showAlert}
              onLoginSuccess={() => {
                resetAuthExpiryHandling();
                setIsAuthenticated(true);
                navigate('/dashboard');
              }}
              onApiKeyLoginSuccess={(nextApiKey) => {
                resetAuthExpiryHandling();
                setApiKeySession(nextApiKey);
                navigate(API_KEY_HOME_ROUTE);
              }}
            />
          ) : !authChecked ? (
            <PageLoading />
          ) : !isAuthenticated ? (
            <RouterNavigate to="/login" replace />
          ) : isApiKeyMode && !isApiKeyAllowedRoute ? (
            <RouterNavigate to={API_KEY_HOME_ROUTE} replace />
          ) : (
            protectedContent
          )}
          {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </div>
      </AntApp>
    </XProvider>
  );

  return (
    <Routes>
      <Route path="/" element={<RouterNavigate to="/dashboard" replace />} />
      {appRoutes.map((appRoute) => (
        <Route key={appRoute} path={appRoute} element={pageContent} />
      ))}
      <Route path="*" element={<RouterNavigate to="/dashboard" replace />} />
    </Routes>
  );
}
