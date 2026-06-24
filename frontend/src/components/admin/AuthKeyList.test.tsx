import { fireEvent, render, screen } from '@testing-library/react';
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
  it('접근 범위 트리를 카드 헤더와 액션 아래의 독립 영역에 배치한다', () => {
    const { container } = render(
      <AuthKeyList
        authKeys={[authKey]}
        loadingKey={null}
        accessGroups={[
          {
            key: 'jd-long',
            label: '매우 긴 프론트엔드 플랫폼 개발자 채용 JD 이름입니다',
            resumes: [{ label: '아주 긴 이름을 가진 지원자 라벨입니다', value: 10 }],
          },
        ]}
        getAuthorizedResumeIds={(item) => item.authorized_resume}
        updateAuthorizedDraft={vi.fn()}
        saveAuthorizedResumes={vi.fn()}
        deleteAuthKey={vi.fn()}
      />,
    );

    const itemContent = container.querySelector('.authkey-item-content');
    const accessTree = container.querySelector('.authkey-access');

    expect(itemContent).toBeInTheDocument();
    expect(itemContent?.querySelector('.authkey-item-header')).toBeInTheDocument();
    expect(itemContent?.querySelector('.authkey-item-actions')).toBeInTheDocument();
    expect(accessTree?.parentElement).toBe(itemContent);
  });

  it('기존 API key 목록에서는 원문 key를 노출하지 않는다', () => {
    render(
      <AuthKeyList
        authKeys={[authKey]}
        loadingKey={null}
        accessGroups={[
          {
            key: 'jd-1',
            label: '백엔드 JD',
            resumes: [{ label: '홍길동', value: 10 }],
          },
        ]}
        getAuthorizedResumeIds={(item) => item.authorized_resume}
        updateAuthorizedDraft={vi.fn()}
        saveAuthorizedResumes={vi.fn()}
        deleteAuthKey={vi.fn()}
      />,
    );

    expect(screen.queryByText(authKey.value)).not.toBeInTheDocument();
    expect(screen.getByText('sk_live_****1234')).toBeInTheDocument();
  });

  it('JD 단위로 전체 resume 접근을 허용하고 일부 허용 상태를 표시한다', () => {
    const updateAuthorizedDraft = vi.fn();

    render(
      <AuthKeyList
        authKeys={[authKey]}
        loadingKey={null}
        accessGroups={[
          {
            key: 'jd-frontend',
            label: '프론트엔드 JD',
            resumes: [
              { label: '홍길동', value: 10 },
              { label: '김프론트', value: 11 },
            ],
          },
          {
            key: 'jd-backend',
            label: '백엔드 JD',
            resumes: [{ label: '박백엔드', value: 12 }],
          },
        ]}
        getAuthorizedResumeIds={() => []}
        updateAuthorizedDraft={updateAuthorizedDraft}
        saveAuthorizedResumes={vi.fn()}
        deleteAuthKey={vi.fn()}
      />,
    );

    expect(screen.queryByPlaceholderText('허용할 지원서 선택')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /프론트엔드 JD/ }));

    expect(updateAuthorizedDraft).toHaveBeenCalledWith(1, [10, 11]);
  });

  it('JD를 펼쳐 개별 resume 접근을 허용한다', () => {
    const updateAuthorizedDraft = vi.fn();

    render(
      <AuthKeyList
        authKeys={[authKey]}
        loadingKey={null}
        accessGroups={[
          {
            key: 'jd-frontend',
            label: '프론트엔드 JD',
            resumes: [
              { label: '홍길동', value: 10 },
              { label: '김프론트', value: 11 },
            ],
          },
        ]}
        getAuthorizedResumeIds={() => [10]}
        updateAuthorizedDraft={updateAuthorizedDraft}
        saveAuthorizedResumes={vi.fn()}
        deleteAuthKey={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));

    expect(screen.getByText('일부 허용')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /프론트엔드 JD/ })).toBePartiallyChecked();

    fireEvent.click(screen.getByRole('button', { name: '프론트엔드 JD 지원서 목록 열기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '김프론트' }));

    expect(updateAuthorizedDraft).toHaveBeenCalledWith(1, [10, 11]);
  });
});
