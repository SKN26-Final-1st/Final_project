import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignupPage } from './SignupPage';
import type { RunApiAction } from '../../types/app';

function renderSignupPage(runApiAction = vi.fn() as unknown as RunApiAction) {
  const showAlert = vi.fn();

  render(
    <SignupPage
      mode="light"
      navigate={vi.fn()}
      themeSwitch={null}
      loadingKey={null}
      runApiAction={runApiAction}
      showAlert={showAlert}
    />,
  );

  return { showAlert };
}

describe('SignupPage', () => {
  it('아이디 중복 확인 후 username을 바꾸면 가입 완료를 다시 막는다', async () => {
    document.cookie = 'csrftoken=test-token';
    const user = userEvent.setup();
    const runApiAction = vi.fn() as unknown as RunApiAction;

    renderSignupPage(runApiAction);

    const username = document.querySelector<HTMLInputElement>('#username');
    const name = document.querySelector<HTMLInputElement>('#name');
    const password = document.querySelector<HTMLInputElement>('#password');
    const verificationQuestion = document.querySelector<HTMLInputElement>('#verification_question');
    const verificationAnswer = document.querySelector<HTMLInputElement>('#verification_answer');

    expect(username).toBeTruthy();
    expect(name).toBeTruthy();
    expect(password).toBeTruthy();
    expect(verificationQuestion).toBeTruthy();
    expect(verificationAnswer).toBeTruthy();

    await user.type(username!, 'available-user');
    await user.click(screen.getByRole('button', { name: /중복|묐났/ }));
    await screen.findByRole('button', { name: /가입|媛/ });

    await user.clear(username!);
    await user.type(username!, 'changed-user');
    await user.type(name!, '홍길동');
    await user.type(password!, 'password123!');
    await user.type(verificationQuestion!, '질문');
    await user.type(verificationAnswer!, '답');
    await user.click(screen.getByRole('button', { name: /가입|媛/ }));

    expect(runApiAction).not.toHaveBeenCalled();
  });
});
