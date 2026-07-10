import { Component, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Result, Space } from 'antd';
import { LoginOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/backendClient';
import { clearAuthenticatedQueryState } from '../../api/queryClient';
import { clearStoredApiKey, markAuthRecoveryRequested } from '../../utils/apiKeySession';
import { startAuthRecoveryLogout } from '../../utils/authRecovery';

type AppErrorBoundaryProps = PropsWithChildren<{
  reloadPage?: () => void;
}>;

type AppErrorBoundaryState = {
  hasError: boolean;
};

type AppErrorFallbackProps = {
  onReload: () => void;
  onReset: () => void;
};

function AppErrorFallback({ onReload, onReset }: AppErrorFallbackProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const moveToLogin = () => {
    clearAuthenticatedQueryState(queryClient);
    clearStoredApiKey();
    markAuthRecoveryRequested();

    startAuthRecoveryLogout((signal) =>
      apiClient.logout({ authFailurePolicy: 'local', signal }),
    );

    void navigate('/login', { replace: true });
    window.setTimeout(onReset, 0);
  };

  return (
    <main className="app-error-boundary-screen" role="alert">
      <Result
        status="500"
        title="화면을 표시하지 못했습니다."
        subTitle="일시적인 문제가 발생했습니다. 페이지를 다시 불러오거나 로그인 화면으로 이동해주세요."
        extra={
          <Space wrap>
            <Button aria-label="다시 불러오기" type="primary" icon={<ReloadOutlined />} onClick={onReload}>
              다시 불러오기
            </Button>
            <Button
              aria-label="로그인 화면으로 이동"
              icon={<LoginOutlined />}
              onClick={moveToLogin}
            >
              로그인 화면으로 이동
            </Button>
          </Space>
        }
      />
    </main>
  );
}

class ErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <AppErrorFallback
          onReload={this.props.reloadPage ?? (() => window.location.reload())}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

export function AppErrorBoundary(props: AppErrorBoundaryProps) {
  return <ErrorBoundary {...props} />;
}
