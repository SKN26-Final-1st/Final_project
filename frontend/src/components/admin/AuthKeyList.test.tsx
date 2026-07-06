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

function renderList(overrides: Partial<Parameters<typeof AuthKeyList>[0]> = {}) {
  const props: Parameters<typeof AuthKeyList>[0] = {
    authKeys: [authKey],
    loadingKey: null,
    accessGroups: [
      {
        key: 'jd-frontend',
        label: '프론트엔드 JD',
        resumes: [
          { label: '홍길동', value: 10 },
          { label: '김프론트', value: 11 },
        ],
      },
    ],
    adminCreditRemaining: 1000,
    getAuthorizedResumeIds: (item) => item.authorized_resume,
    getCreditLimit: (item) => item.credit_limit,
    updateAuthorizedDraft: vi.fn(),
    updateCreditDraft: vi.fn(),
    saveAuthorizedResumes: vi.fn(),
    deleteAuthKey: vi.fn(),
    ...overrides,
  };

  return { ...render(<AuthKeyList {...props} />), props };
}

describe('AuthKeyList', () => {
  it('API key 하나를 하나의 compact 카드로 렌더링한다', () => {
    const { container } = renderList();
    const cards = container.querySelectorAll('.authkey-card');

    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('외부 면접관 공유');
    expect(cards[0]).toHaveTextContent('sk_live_****1234');
    expect(cards[0]).toHaveTextContent('Credit 1,000pt');
    expect(cards[0]).toHaveTextContent('허용 지원서 1건');
    expect(cards[0]).toHaveTextContent('JD 1개 · 지원서 1명 허용');
    expect(cards[0].querySelector('.authkey-card-icon')).toBeInTheDocument();
    expect(cards[0].querySelector('.authkey-credit-editor')).toBeInTheDocument();
    expect(cards[0].querySelector('.authkey-access')).toBeInTheDocument();
  });

  it('기존 API key 목록에서 원문 key를 노출하지 않는다', () => {
    renderList();

    expect(screen.queryByText(authKey.value)).not.toBeInTheDocument();
    expect(screen.getByText('sk_live_****1234')).toBeInTheDocument();
  });

  it('JD 단위로 전체 resume 접근을 허용한다', () => {
    const updateAuthorizedDraft = vi.fn();
    renderList({
      getAuthorizedResumeIds: () => [],
      updateAuthorizedDraft,
    });

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /프론트엔드 JD/ }));

    expect(updateAuthorizedDraft).toHaveBeenCalledWith(1, [10, 11]);
  });

  it('개별 resume 선택 시 JD checkbox를 indeterminate로 표시한다', () => {
    const updateAuthorizedDraft = vi.fn();
    renderList({
      getAuthorizedResumeIds: () => [10],
      updateAuthorizedDraft,
    });

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));

    expect(screen.getByText('일부 허용')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /프론트엔드 JD/ })).toBePartiallyChecked();

    fireEvent.click(screen.getByRole('button', { name: '프론트엔드 JD 지원서 목록 열기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '김프론트' }));

    expect(updateAuthorizedDraft).toHaveBeenCalledWith(1, [10, 11]);
  });

  it('credit 증가분이 관리자 보유 credit을 넘으면 저장을 막는다', () => {
    renderList({
      adminCreditRemaining: 100,
      getCreditLimit: () => 1500,
    });

    expect(screen.getByText('보유 Credit을 초과할 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /저장/ })).toBeDisabled();
  });

  it('credit 변경 차액을 사용자에게 안내한다', () => {
    renderList({
      getCreditLimit: () => 1200,
    });

    expect(screen.getByText('+200p 추가 제공')).toBeInTheDocument();
  });
});
