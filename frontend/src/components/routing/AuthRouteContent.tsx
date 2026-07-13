import type { Dispatch, SetStateAction } from 'react';
import { LoginPage, PasswordResetPage, SignupPage } from '../../pages/AuthPages';
import type { AppRoute } from '../../data/appConfig';
import type { Navigate, RunApiAction, ShowAlert, ThemeMode } from '../../types/app';

type AuthRouteContentProps = {
  route: AppRoute;
  mode: ThemeMode;
  navigate: Navigate;
  loadingKey: string | null;
  runApiAction: RunApiAction;
  resetStep: number;
  setResetStep: Dispatch<SetStateAction<number>>;
  showAlert: ShowAlert;
  onLoginSuccess: () => void;
  onApiKeyLoginSuccess: (apiKey: string) => void;
};

export function AuthRouteContent(props: AuthRouteContentProps) {
  if (props.route === '/signup') {
    return <SignupPage mode={props.mode} navigate={props.navigate} loadingKey={props.loadingKey} runApiAction={props.runApiAction} showAlert={props.showAlert} />;
  }
  if (props.route === '/password-reset') {
    return (
      <PasswordResetPage
        mode={props.mode}
        navigate={props.navigate}
        loadingKey={props.loadingKey}
        runApiAction={props.runApiAction}
        resetStep={props.resetStep}
        setResetStep={props.setResetStep}
        showAlert={props.showAlert}
      />
    );
  }
  return (
    <LoginPage
      mode={props.mode}
      navigate={props.navigate}
      loadingKey={props.loadingKey}
      runApiAction={props.runApiAction}
      onLoginSuccess={props.onLoginSuccess}
      onApiKeyLoginSuccess={props.onApiKeyLoginSuccess}
    />
  );
}
