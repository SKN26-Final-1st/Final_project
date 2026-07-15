import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthKeyDeleteModal } from './AuthKeyDeleteModal';
import type { AuthKey } from '../../data/backendTypes';

const authKey: AuthKey = {
  id: 7,
  name: '외부 면접관 공유 테스트 긴 이름',
  description: '면접관 공유용',
  credit_limit: 5000,
  value: 'sk_live_secretfullkey5678',
  authorized_resume: [11, 12],
};

describe('AuthKeyDeleteModal', () => {
  it('삭제 대상의 이름과 마스킹된 key만 보여주고 확인 전에는 삭제하지 않는다', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <AuthKeyDeleteModal
        authKey={authKey}
        open
        loading={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('API key를 삭제하시겠습니까?')).toBeInTheDocument();
    expect(screen.getByText(authKey.name)).toBeInTheDocument();
    expect(screen.getByText('sk_live_****5678')).toBeInTheDocument();
    expect(screen.queryByText(authKey.value)).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '420px' });

    await user.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('삭제 버튼을 누를 때만 확인 콜백을 호출한다', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <AuthKeyDeleteModal
        authKey={authKey}
        open
        loading={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
