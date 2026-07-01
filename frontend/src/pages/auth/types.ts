import type { ReactNode } from 'react';
import type { Navigate, RunApiAction, ThemeMode } from '../../types/app';

export type AuthPageBaseProps = {
  mode: ThemeMode;
  navigate: Navigate;
  themeSwitch?: ReactNode;
  loadingKey: string | null;
  runApiAction: RunApiAction;
};
