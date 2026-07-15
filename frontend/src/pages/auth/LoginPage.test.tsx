import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RunApiAction } from '../../types/app';
import { registerAuthRecoveryLogout } from '../../utils/authRecovery';
import { LoginPage } from './LoginPage';

const login = vi.hoisted(() => vi.fn());
const loginWithApiKey = vi.hoisted(() => vi.fn());

vi.mock('../../api/backendClient', () => ({
  apiClient: { login, loginWithApiKey },
}));

vi.mock('../../components/layout/AuthScreen', () => ({
  AuthScreen: ({ card }: { card: ReactNode }) => <main>{card}</main>,
}));

describe('LoginPage auth recovery coordination', () => {
  it('waits for the recovery logout before starting a new account login', async () => {
    let finishRecovery!: () => void;
    registerAuthRecoveryLogout(
      new Promise<void>((resolve) => {
        finishRecovery = resolve;
      }),
    );
    login.mockResolvedValue({ error: false, data: { authenticated: true } });
    const runApiAction = vi.fn(async (_key, action, afterComplete) => {
      const response = await action();
      afterComplete?.(response);
    }) as unknown as RunApiAction;
    const user = userEvent.setup();

    render(
      <LoginPage
        mode="light"
        navigate={vi.fn()}
        loadingKey={null}
        runApiAction={runApiAction}
        onLoginSuccess={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('아이디'), 'hong');
    await user.type(screen.getByLabelText('비밀번호'), 'password');
    await user.click(screen.getByRole('button', { name: /로그인/ }));

    expect(login).not.toHaveBeenCalled();

    await act(async () => {
      finishRecovery();
    });
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('hong', 'password');
    });
  });

  it('completes only the API Key callback when the API Key form is submitted', async () => {
    loginWithApiKey.mockResolvedValue({ error: false, data: { authenticated: true } });
    const onLoginSuccess = vi.fn();
    const onApiKeyLoginSuccess = vi.fn();
    const runApiAction = vi.fn(async (_key, action, afterComplete) => {
      const response = await action();
      afterComplete?.(response);
    }) as unknown as RunApiAction;
    const user = userEvent.setup();

    render(
      <LoginPage
        mode="light"
        navigate={vi.fn()}
        loadingKey={null}
        runApiAction={runApiAction}
        onLoginSuccess={onLoginSuccess}
        onApiKeyLoginSuccess={onApiKeyLoginSuccess}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /API Key/ }));
    await user.type(screen.getByLabelText('API Key'), 'sk_live_callback_test');
    await user.click(screen.getByRole('button', { name: /API Key/ }));

    await waitFor(() => {
      expect(onApiKeyLoginSuccess).toHaveBeenCalledWith('sk_live_callback_test');
    });
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
