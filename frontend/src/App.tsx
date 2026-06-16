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
import { palette, type AppRoute } from './data/appConfig';
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

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const route = getRouteFromPathname(location.pathname);
  const [mode, setMode] = useState<ThemeMode>('light');
  const { alert, loadingKey, runApiAction, setAlert, showAlert } = useApiAction();
  const [resetStep, setResetStep] = useState(0);
  const isAuth = authRoutes.includes(route);
  const isShared = route === '/shared';
  const { authChecked, isAuthenticated, setIsAuthenticated } = useAuthSession(isShared);
  const shouldLoadAppData = authChecked && isAuthenticated && !isAuth && !isShared;
  const { data, loading, error, reload } = useAppData(shouldLoadAppData);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const themeConfig = useMemo(
    () => ({
      algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: palette.primary,
        colorInfo: palette.primary,
        colorSuccess: palette.accent,
        colorBgBase: mode === 'dark' ? palette.text : palette.background,
        colorTextBase: mode === 'dark' ? palette.card : palette.text,
        fontFamily: '"Noto Sans KR Clean", "Noto Sans KR", system-ui, sans-serif',
        borderRadius: 12,
      },
      components: {
        Card: {
          borderRadiusLG: 22,
        },
        Button: {
          borderRadius: 12,
          controlHeight: 40,
        },
        Input: {
          borderRadius: 12,
        },
        Select: {
          borderRadius: 12,
        },
      },
    }),
    [mode],
  );

  const navigate = useCallback((nextRoute: AppRoute | string) => {
    void routerNavigate(nextRoute);
  }, [routerNavigate]);
  const logout = useLogoutAction({ navigate, runApiAction, setIsAuthenticated });

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
            mode={mode}
            navigate={navigate}
            themeSwitch={themeSwitch}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            showAlert={showAlert}
          />
        );
      case '/password-reset':
        return (
          <PasswordResetPage
            mode={mode}
            navigate={navigate}
            themeSwitch={themeSwitch}
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
            mode={mode}
            navigate={navigate}
            themeSwitch={themeSwitch}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            onLoginSuccess={() => {
              setIsAuthenticated(true);
              void reload().then(() => navigate('/dashboard'));
            }}
          />
        );
    }
  };

  const protectedContent = (
    <DocumentChatProvider
      defaultMessages={data?.analysisReport.chatMessages ?? []}
      loadingKey={loadingKey}
      runApiAction={runApiAction}
      showAlert={showAlert}
    >
      <AppShell
        route={route}
        mode={mode}
        assistantFab={route === '/chat' ? undefined : <DocumentChatFab navigate={navigate} />}
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
        <div className="app-root" data-theme={mode}>
          <FloatingAlert alert={alert} onClose={() => setAlert(null)} />
          {isShared ? (
            <SharedReportPage mode={mode} navigate={navigate} themeSwitch={themeSwitch} />
          ) : isAuth ? (
            renderAuthPage()
          ) : !authChecked ? (
            <PageLoading />
          ) : !isAuthenticated ? (
            <RouterNavigate to="/login" replace />
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
