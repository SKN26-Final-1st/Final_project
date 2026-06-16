import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { Navigate as RouterNavigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { XProvider } from '@ant-design/x';
import { App as AntApp, Switch, Tooltip, theme as antdTheme } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { FloatingAlert } from './components/common/FloatingAlert';
import { PageError, PageLoading } from './components/common/PageState';
import { DocumentChatFab } from './components/chat/DocumentChatFab';
import { AppShell } from './components/layout/AppShell';
import { apiClient } from './api/backendClient';
import { palette, type AppRoute, type ChatMessage } from './data/appConfig';
import { useApiAction } from './hooks/useApiAction';
import { useAppData } from './hooks/useAppData';
import { useAuthSession } from './hooks/useAuthSession';
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
import type { KeySetter, ThemeMode } from './types/app';
import { appRoutes, authRoutes, getRouteFromPathname } from './utils/routes';
import type { AuthKey } from './data/backendTypes';

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const route = getRouteFromPathname(location.pathname);
  const [mode, setMode] = useState<ThemeMode>('light');
  const { alert, loadingKey, runApiAction, setAlert, showAlert } = useApiAction();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedJdIdOverride, setSelectedJdIdOverride] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[] | null>(null);
  const [selectedReportResumeId, setSelectedReportResumeId] = useState<string | null>(null);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [createdAuthKey, setCreatedAuthKey] = useState<(Pick<AuthKey, 'name' | 'value'> & { locationKey: string }) | null>(
    null,
  );
  const postGenerated = false;
  const templateGenerated = false;
  const [resetStep, setResetStep] = useState(0);
  const isAuth = authRoutes.includes(route);
  const isShared = route === '/shared';
  const { authChecked, isAuthenticated, setIsAuthenticated } = useAuthSession(isShared);
  const shouldLoadAppData = authChecked && isAuthenticated && !isAuth && !isShared;
  const { data, loading, error, reload } = useAppData(shouldLoadAppData);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const jdIds = useMemo(() => data?.jdList.map((item) => item.id) ?? [], [data?.jdList]);
  const selectedJdId =
    selectedJdIdOverride && jdIds.includes(selectedJdIdOverride) ? selectedJdIdOverride : data?.jdList[0]?.id ?? null;
  const selectedRows = useMemo(() => {
    if (selectedRowKeys === null) {
      return selectedJdId ? [selectedJdId] : [];
    }

    const validRows = selectedRowKeys.filter((id) => jdIds.includes(String(id)));
    return validRows;
  }, [jdIds, selectedJdId, selectedRowKeys]);
  const activeChatMessages = chatMessages.length ? chatMessages : data?.analysisReport.chatMessages ?? [];
  const selectedJd = data?.jdList.find((item) => item.id === selectedJdId) ?? data?.jdList[0] ?? null;
  const updateSelectedRows: KeySetter = (nextRows) => {
    setSelectedRowKeys((current) => (typeof nextRows === 'function' ? nextRows(current ?? []) : nextRows));
  };

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

  const navigate = useCallback((nextRoute: AppRoute) => {
    void routerNavigate(nextRoute);
  }, [routerNavigate]);

  const visibleCreatedAuthKey =
    route === '/admin' && createdAuthKey?.locationKey === location.key ? createdAuthKey : null;

  const updateCreatedAuthKey = useCallback(
    (nextAuthKey: Pick<AuthKey, 'name' | 'value'> | null) => {
      setCreatedAuthKey(nextAuthKey ? { ...nextAuthKey, locationKey: location.key } : null);
    },
    [location.key, setCreatedAuthKey],
  );

  const sendChatMessage = () => {
    if (loadingKey === 'chat') {
      return;
    }

    const trimmed = chatInput.trim();
    if (!trimmed) {
      showAlert({ type: 'warning', message: '빈 메시지는 전송할 수 없습니다.' });
      return;
    }

    const nextChatMessages: ChatMessage[] = [...activeChatMessages, { role: 'user', text: trimmed }];
    setChatMessages(nextChatMessages);
    setChatInput('');
    void runApiAction(
      'chat',
      () => apiClient.sendChatMessage(trimmed, nextChatMessages),
      (response) => setChatMessages((prev) => [...prev, response.data]),
      () => {
        setChatMessages((prev) => prev.slice(0, -1));
        setChatInput(trimmed);
      },
    );
  };

  const logout = () => {
    if (loadingKey === 'logout') {
      return;
    }

    void runApiAction('logout', () => apiClient.logout(), () => {
      setChatMessages([]);
      setIsAuthenticated(false);
      navigate('/login');
    });
  };

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
        return (
          <AdminPage
            admin={data.admin}
            authKeys={data.authKeys}
            resumes={data.resumes}
            loadingKey={loadingKey}
            navigate={navigate}
            runApiAction={runApiAction}
            showAlert={showAlert}
            reloadData={reload}
            createdAuthKey={visibleCreatedAuthKey}
            setCreatedAuthKey={updateCreatedAuthKey}
          />
        );
      case '/company':
        return (
          <CompanyPage
            company={data.company}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            showAlert={showAlert}
            reloadData={reload}
          />
        );
      case '/jd':
        return (
          <JdPage
            jdList={data.jdList}
            resumes={data.resumes}
            selectedJdId={selectedJdId}
            selectedJd={selectedJd}
            loadingKey={loadingKey}
            setSelectedJdId={setSelectedJdIdOverride}
            setSelectedReportResumeId={setSelectedReportResumeId}
            runApiAction={runApiAction}
            navigate={navigate}
            showAlert={showAlert}
            reloadData={reload}
          />
        );
      case '/cover-letter':
        return (
          <CoverLetterPage
            jdList={data.jdList}
            selectedJdId={selectedJdId}
            resumes={data.resumes}
            coverRows={data.coverLetterRows}
            analysisDone={analysisDone}
            loadingKey={loadingKey}
            setSelectedJdId={setSelectedJdIdOverride}
            setSelectedReportResumeId={setSelectedReportResumeId}
            setAnalysisDone={setAnalysisDone}
            runApiAction={runApiAction}
            navigate={navigate}
            reloadData={reload}
          />
        );
      case '/analysis-report':
        return (
          <AnalysisReportPage
            reports={data.analysisReports}
            questions={data.interviewQuestions}
            resumes={data.resumes}
            jdList={data.jdList}
            selectedReportResumeId={selectedReportResumeId}
            setSelectedReportResumeId={setSelectedReportResumeId}
            navigate={navigate}
          />
        );
      case '/chat':
        return (
          <ChatPage
            report={data.analysisReport}
            chatMessages={activeChatMessages}
            chatInput={chatInput}
            loadingKey={loadingKey}
            jdList={data.jdList}
            resumes={data.resumes}
            analysisReports={data.analysisReports}
            interviewQuestions={data.interviewQuestions}
            setChatMessages={setChatMessages}
            setChatInput={setChatInput}
            sendChatMessage={sendChatMessage}
          />
        );
      case '/mypage':
        return (
          <MyPage
            profile={data.userProfile}
            company={data.company}
            loadingKey={loadingKey}
            navigate={navigate}
            runApiAction={runApiAction}
            reloadData={reload}
          />
        );
      case '/recruitment-post':
        return (
          <RecruitmentPostPage
            jdList={data.jdList}
            recruitmentPreview={data.recruitmentPreview}
            selectedRows={selectedRows}
            postGenerated={postGenerated}
            setSelectedRows={updateSelectedRows}
          />
        );
      case '/cover-letter-template':
        return (
          <CoverLetterTemplatePage
            selectedJd={selectedJd}
            templateQuestions={data.templateQuestions}
            templateGenerated={templateGenerated}
          />
        );
      case '/dashboard':
      default:
        return (
          <DashboardPage
            dashboard={data.dashboard}
            mode={mode}
            navigate={navigate}
            showAlert={showAlert}
            reloadData={reload}
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
            <AppShell
              route={route}
              mode={mode}
              assistantFab={
                route === '/chat' ? undefined : (
                  <DocumentChatFab
                    chatMessages={activeChatMessages}
                    chatInput={chatInput}
                    loadingKey={loadingKey}
                    jdList={data?.jdList ?? []}
                    resumes={data?.resumes ?? []}
                    analysisReports={data?.analysisReports ?? []}
                    interviewQuestions={data?.interviewQuestions ?? []}
                    setChatInput={setChatInput}
                    sendChatMessage={sendChatMessage}
                    navigate={navigate}
                  />
                )
              }
              themeSwitch={themeSwitch}
              creditPercent={data?.dashboard.creditPercent ?? 0}
              profile={data?.userProfile}
              navigate={navigate}
              onLogout={logout}
              showAlert={showAlert}
            >
              {renderProtectedPage()}
            </AppShell>
          )}
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
