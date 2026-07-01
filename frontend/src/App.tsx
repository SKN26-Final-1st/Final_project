import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate as RouterNavigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { XProvider } from '@ant-design/x';
import { App as AntApp, Switch, Tooltip, theme as antdTheme } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { FloatingAlert } from './components/common/FloatingAlert';
import { PageError, PageLoading } from './components/common/PageState';
import { DocumentChatFab } from './components/chat/DocumentChatFab';
import { AppShell } from './components/layout/AppShell';
import type { AppRoute } from './data/appConfig';
import { radiusTokens, themePalette } from './data/themeTokens';
import { useApiAction } from './hooks/useApiAction';
import { useAppData } from './hooks/useAppData';
import { useAuthSession } from './hooks/useAuthSession';
import { DocumentChatProvider } from './hooks/useDocumentChatState';
import { useLogoutAction } from './hooks/useLogoutAction';
import { AdminPage } from './pages/AdminPage';
import { AnalysisReportPage } from './pages/AnalysisReportPage';
import { LoginPage, PasswordResetPage, SignupPage } from './pages/AuthPages';
import { ChatPage } from './pages/ChatPage';
import { CompanyPage } from './pages/CompanyPage';
import { CoverLetterPage } from './pages/CoverLetterPage';
import { CoverLetterTemplatePage } from './pages/CoverLetterTemplatePage';
import { DashboardPage } from './pages/DashboardPage';
import { JdPage } from './pages/JdPage';
import { MyPage } from './pages/MyPage';
import { RecruitmentPostPage } from './pages/RecruitmentPostPage';
import { SharedReportPage } from './pages/SharedReportPage';
import type { ThemeMode } from './types/app';
import { appRoutes, authRoutes, getRouteFromPathname } from './utils/routes';

const API_KEY_ALLOWED_ROUTES: AppRoute[] = ['/jd', '/cover-letter', '/analysis-report'];
const API_KEY_HOME_ROUTE: AppRoute = '/jd';

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const themeConfig = useMemo(
    () => {
      const currentPalette = renderedThemeMode === 'dark' ? themePalette.dark : themePalette.light;

      return {
        algorithm: renderedThemeMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: currentPalette.primary,
          colorInfo: currentPalette.primary,
          colorSuccess: currentPalette.accent,
          colorBgBase: currentPalette.background,
          colorBgContainer: currentPalette.card,
          colorBorder: currentPalette.border,
          colorTextBase: currentPalette.text,
          colorTextSecondary: currentPalette.muted,
          fontFamily: '"Noto Sans KR Clean", "Noto Sans KR", system-ui, sans-serif',
          borderRadius: radiusTokens.md,
        },
        components: {
          Card: {
            borderRadiusLG: radiusTokens.lg,
          },
          Button: {
            borderRadius: radiusTokens.sm + 2,
            controlHeight: 40,
          },
          Input: {
            borderRadius: radiusTokens.sm + 2,
          },
          Select: {
            borderRadius: radiusTokens.sm + 2,
          },
        },
      };
    },
    [renderedThemeMode],
  );

  const navigate = useCallback((nextRoute: AppRoute | string) => {
    void routerNavigate(nextRoute);
  }, [routerNavigate]);
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

  const renderProtectedPage = () => {
    if (loading) {
      return <PageLoading />;
    }

    if (error) {
      return <PageError message={error} onRetry={() => void reload()} />;
    }

    if (!data) {
      return <PageError message="초기 데이터가 없습니다." onRetry={() => void reload()} />;
    }

    if (isApiKeyMode && !isApiKeyAllowedRoute) {
      return <RouterNavigate to={API_KEY_HOME_ROUTE} replace />;
    }

    switch (route) {
      case '/admin':
        return <AdminPage navigate={navigate} showAlert={showAlert} />;
      case '/company':
        return (
          <CompanyPage
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            showAlert={showAlert}
          />
        );
      case '/jd':
        return <JdPage navigate={navigate} showAlert={showAlert} />;
      case '/cover-letter':
        return <CoverLetterPage navigate={navigate} showAlert={showAlert} />;
      case '/analysis-report':
        return <AnalysisReportPage navigate={navigate} />;
      case '/chat':
        return <ChatPage />;
      case '/mypage':
        return (
          <MyPage
            loadingKey={loadingKey}
            navigate={navigate}
            runApiAction={runApiAction}
          />
        );
      case '/recruitment-post':
        return <RecruitmentPostPage />;
      case '/cover-letter-template':
        return <CoverLetterTemplatePage />;
      case '/dashboard':
      default:
        return (
          <DashboardPage
            mode={mode}
            navigate={navigate}
            showAlert={showAlert}
          />
        );
    }
  };

  const renderAuthPage = () => {
    switch (route) {
      case '/signup':
        return (
          <SignupPage
            mode={renderedThemeMode}
            navigate={navigate}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            showAlert={showAlert}
          />
        );
      case '/password-reset':
        return (
          <PasswordResetPage
            mode={renderedThemeMode}
            navigate={navigate}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            resetStep={resetStep}
            setResetStep={setResetStep}
            showAlert={showAlert}
          />
        );
      case '/login':
      default:
        return (
          <LoginPage
            mode={renderedThemeMode}
            navigate={navigate}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            onLoginSuccess={() => {
              setIsAuthenticated(true);
              navigate('/dashboard');
            }}
            onApiKeyLoginSuccess={(nextApiKey) => {
              setApiKeySession(nextApiKey);
              navigate(API_KEY_HOME_ROUTE);
            }}
          />
        );
    }
  };

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
        {renderProtectedPage()}
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
            renderAuthPage()
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
