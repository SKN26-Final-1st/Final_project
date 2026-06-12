import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import { Navigate as RouterNavigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { XProvider } from '@ant-design/x';
import { Alert, App as AntApp, Switch, Tooltip, theme as antdTheme } from 'antd';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { PageError, PageLoading } from './components/common/PageState';
import { DocumentChatFab } from './components/chat/DocumentChatFab';
import { AppShell } from './components/layout/AppShell';
import { apiClient } from './api/backendClient';
import { palette, type AppRoute, type ChatMessage } from './data/mockData';
import { useMockAppData } from './hooks/useMockAppData';
import { AdminPage } from './pages/AdminPage';
import { LoginPage, PasswordResetPage, SignupPage } from './pages/AuthPages';
import { ChatPage } from './pages/ChatPage';
import { CompanyPage } from './pages/CompanyPage';
import { CoverLetterPage } from './pages/CoverLetterPage';
import { CoverLetterTemplatePage } from './pages/CoverLetterTemplatePage';
import { DashboardPage } from './pages/DashboardPage';
import { JdPage } from './pages/JdPage';
import { MyPage } from './pages/MyPage';
import { RecruitmentPostPage } from './pages/RecruitmentPostPage';
import type { AlertState, KeySetter, ThemeMode } from './types/app';
import { appRoutes, authRoutes, getRouteFromPathname } from './utils/routes';
import type { ApiResponse } from './data/apiMockData';

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const route = getRouteFromPathname(location.pathname);
  const [mode, setMode] = useState<ThemeMode>('light');
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedJdIdOverride, setSelectedJdIdOverride] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[] | null>(null);
  const [coverUploaded, setCoverUploaded] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [postGenerated, setPostGenerated] = useState(true);
  const [templateGenerated, setTemplateGenerated] = useState(true);
  const [resetStep, setResetStep] = useState(0);
  const { data, loading, error, reload } = useMockAppData();

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

  const showAlert = (nextAlert: AlertState) => {
    setAlert(nextAlert);
    window.setTimeout(() => setAlert(null), 3400);
  };

  const runApiAction = async <T,>(
    key: string,
    action: () => Promise<ApiResponse<T>>,
    afterComplete?: (response: ApiResponse<T>) => void,
  ) => {
    if (loadingKey) {
      return;
    }

    setLoadingKey(key);
    try {
      const response = await action();
      showAlert({
        type: response.error ? 'error' : 'success',
        message: response.message ?? (response.error ? 'API 요청이 실패했습니다.' : '요청이 완료되었습니다.'),
      });
      afterComplete?.(response);
    } catch (nextError) {
      showAlert({
        type: 'error',
        message: 'API 요청이 실패했습니다.',
        description: nextError instanceof Error ? nextError.message : undefined,
      });
    } finally {
      setLoadingKey(null);
    }
  };

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
    void runApiAction('chat', () => apiClient.sendChatMessage(trimmed, nextChatMessages), (response) =>
      setChatMessages((prev) => [...prev, response.data]),
    );
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
        return <AdminPage admin={data.admin} navigate={navigate} showAlert={showAlert} />;
      case '/company':
        return (
          <CompanyPage
            company={data.company}
            loadingKey={loadingKey}
            runApiAction={runApiAction}
            showAlert={showAlert}
          />
        );
      case '/jd':
        return (
          <JdPage
            jdList={data.jdList}
            selectedJdId={selectedJdId}
            selectedJd={selectedJd}
            loadingKey={loadingKey}
            setSelectedJdId={setSelectedJdIdOverride}
            runApiAction={runApiAction}
            navigate={navigate}
            showAlert={showAlert}
          />
        );
      case '/cover-letter':
        return (
          <CoverLetterPage
            jdList={data.jdList}
            selectedJdId={selectedJdId}
            draft={data.coverLetterDraft}
            coverRows={data.coverLetterRows}
            coverUploaded={coverUploaded}
            analysisDone={analysisDone}
            loadingKey={loadingKey}
            setSelectedJdId={setSelectedJdIdOverride}
            setCoverUploaded={setCoverUploaded}
            setAnalysisDone={setAnalysisDone}
            runApiAction={runApiAction}
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
            navigate={navigate}
            runApiAction={runApiAction}
          />
        );
      case '/recruitment-post':
        return (
          <RecruitmentPostPage
            jdList={data.jdList}
            recruitmentPreview={data.recruitmentPreview}
            selectedRows={selectedRows}
            postGenerated={postGenerated}
            loadingKey={loadingKey}
            setSelectedRows={updateSelectedRows}
            setPostGenerated={setPostGenerated}
            runApiAction={runApiAction}
          />
        );
      case '/cover-letter-template':
        return (
          <CoverLetterTemplatePage
            selectedJd={selectedJd}
            templateQuestions={data.templateQuestions}
            templateGenerated={templateGenerated}
            loadingKey={loadingKey}
            setTemplateGenerated={setTemplateGenerated}
            runApiAction={runApiAction}
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
    const authDefaults = data?.authDefaults;

    switch (route) {
      case '/signup':
        return (
          <SignupPage
            mode={mode}
            navigate={navigate}
            themeSwitch={themeSwitch}
            loadingKey={loadingKey}
            authDefaults={authDefaults}
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
            authDefaults={authDefaults}
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
            authDefaults={authDefaults}
            runApiAction={runApiAction}
            onLoginSuccess={() => void reload().then(() => navigate('/dashboard'))}
          />
        );
    }
  };

  const isAuth = authRoutes.includes(route);

  const pageContent = (
    <XProvider theme={themeConfig}>
      <AntApp>
        <div className="app-root" data-theme={mode}>
          {alert && (
            <div className="floating-alert">
              <Alert
                showIcon
                closable
                type={alert.type}
                message={alert.message}
                description={alert.description}
                onClose={() => setAlert(null)}
              />
            </div>
          )}
          {isAuth ? (
            renderAuthPage()
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
