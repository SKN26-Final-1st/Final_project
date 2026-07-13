import { Navigate as RouterNavigate } from 'react-router-dom';
import { PageError, PageLoading } from '../common/PageState';
import { AdminPage } from '../../pages/AdminPage';
import { AnalysisReportPage } from '../../pages/AnalysisReportPage';
import { ChatPage } from '../../pages/ChatPage';
import { CompanyPage } from '../../pages/CompanyPage';
import { CoverLetterPage } from '../../pages/CoverLetterPage';
import { CoverLetterTemplatePage } from '../../pages/CoverLetterTemplatePage';
import { DashboardPage } from '../../pages/DashboardPage';
import { JdPage } from '../../pages/JdPage';
import { MyPage } from '../../pages/MyPage';
import { RecruitmentPostPage } from '../../pages/RecruitmentPostPage';
import type { AppRoute } from '../../data/appConfig';
import type { AuthMode } from '../../utils/apiKeySession';
import type { Navigate, RunApiAction, ShowAlert, ThemeMode } from '../../types/app';

type ProtectedRouteContentProps = {
  route: AppRoute;
  loading: boolean;
  error: string | null;
  hasData: boolean;
  isApiKeyMode: boolean;
  isApiKeyAllowedRoute: boolean;
  apiKeyHomeRoute: AppRoute;
  authMode: AuthMode;
  loadingKey: string | null;
  mode: ThemeMode;
  navigate: Navigate;
  reload: () => Promise<void>;
  runApiAction: RunApiAction;
  setIsAuthenticated: (value: boolean) => void;
  showAlert: ShowAlert;
};

export function ProtectedRouteContent(props: ProtectedRouteContentProps) {
  if (props.loading) return <PageLoading />;
  if (props.error) return <PageError message={props.error} onRetry={() => void props.reload()} />;
  if (!props.hasData) return <PageError message="초기 데이터가 없습니다." onRetry={() => void props.reload()} />;
  if (props.isApiKeyMode && !props.isApiKeyAllowedRoute) {
    return <RouterNavigate to={props.apiKeyHomeRoute} replace />;
  }

  switch (props.route) {
    case '/admin':
      return <AdminPage navigate={props.navigate} showAlert={props.showAlert} />;
    case '/company':
      return <CompanyPage loadingKey={props.loadingKey} runApiAction={props.runApiAction} showAlert={props.showAlert} />;
    case '/jd':
      return <JdPage navigate={props.navigate} showAlert={props.showAlert} />;
    case '/cover-letter':
      return <CoverLetterPage navigate={props.navigate} showAlert={props.showAlert} />;
    case '/analysis-report':
      return <AnalysisReportPage navigate={props.navigate} showAlert={props.showAlert} />;
    case '/chat':
      return <ChatPage />;
    case '/mypage':
      return (
        <MyPage
          authMode={props.authMode}
          loadingKey={props.loadingKey}
          navigate={props.navigate}
          runApiAction={props.runApiAction}
          setIsAuthenticated={props.setIsAuthenticated}
        />
      );
    case '/recruitment-post':
      return <RecruitmentPostPage />;
    case '/cover-letter-template':
      return <CoverLetterTemplatePage />;
    case '/dashboard':
    default:
      return <DashboardPage mode={props.mode} navigate={props.navigate} showAlert={props.showAlert} />;
  }
}
