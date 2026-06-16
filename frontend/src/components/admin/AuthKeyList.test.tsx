import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthKeyList } from './AuthKeyList';
import type { AuthKey } from '../../data/backendTypes';

const authKey: AuthKey = {
  id: 1,
  name: '외부 면접관 공유',
  description: '면접관 전용',
  credit_limit: 1000,
  value: 'sk_live_secretfullkey1234',
  authorized_resume: [10],
};

describe('AuthKeyList', () => {
  it('기존 API key 목록에서는 원문 key를 노출하지 않는다', () => {
    render(
      <AuthKeyList
        authKeys={[authKey]}
        loadingKey={null}
        resumeOptions={[{ label: '홍길동 - 백엔드 JD', value: 10 }]}
        getAuthorizedResumeIds={(item) => item.authorized_resume}
        updateAuthorizedDraft={vi.fn()}
        saveAuthorizedResumes={vi.fn()}
        deleteAuthKey={vi.fn()}
      />,
    );

    expect(screen.queryByText(authKey.value)).not.toBeInTheDocument();
    expect(screen.getByText('sk_live_****1234')).toBeInTheDocument();
  });
});
