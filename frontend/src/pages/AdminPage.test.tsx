import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';
import type { AdminData, JdItem } from '../api/adapters';
import type { AuthKey, Resume } from '../data/backendTypes';

const createAuthKeyMutateAsync = vi.hoisted(() => vi.fn());
const deleteAuthKeyMutateAsync = vi.hoisted(() => vi.fn());
const saveAccountMutateAsync = vi.hoisted(() => vi.fn());
const saveAuthKeyMutateAsync = vi.hoisted(() => vi.fn());

const adminData: AdminData = {
  companyName: 'HumouR',
  ownerName: '관리자',
  summary: [],
  members: [],
  permissions: [],
  operatingStatus: {
    activeJobs: 0,
    averageScore: 0,
    pendingReviews: 0,
    processingResumes: 0,
  },
  credit: {
    expiresAt: '',
    expiresAtIso: '',
    isSubscriptionActive: false,
    percent: 0,
    remaining: 1000,
    subscriptionStatus: '활성',
  },
};

const resume: Resume = {
  id: 10,
  job_description_id: 20,
  name: '홍길동',
  skill: [],
  education_level: {},
  experience: [],
  self_intoduction: [],
  certification: [],
  language: [],
  award: [],
  training: [],
  other_activity: [],
  reviewed: false,
  reviewed_at: '',
  created_at: '',
  updated_at: '',
};

const secondResume: Resume = {
  ...resume,
  id: 11,
  name: '김프론트',
};

const jd: JdItem = {
  id: '20',
  title: '프론트엔드 개발자 채용',
  team: '',
  status: '진행 중',
  statusCode: 'on_going',
  fit: 0,
  stack: [],
  preferredStack: [],
  summary: '',
  requiredExperience: '',
  employmentType: '',
  educationLevel: '',
  major: '',
  hiringReason: '',
  checklistStatus: 'done',
};

const authKey: AuthKey = {
  id: 1,
  name: '외부 면접관 공유',
  description: '면접관 전용',
  credit_limit: 1000,
  value: 'sk_live_secretfullkey1234',
  authorized_resume: [10],
};

vi.mock('../hooks/useAdminPageData', () => ({
  useAdminPageData: () => ({
    admin: adminData,
    authKeys: [authKey],
    jdList: [jd],
    resumes: [resume, secondResume],
  }),
}));

vi.mock('../hooks/mutations/useAdminMutations', () => ({
  useAdminMutations: () => ({
    createAuthKey: { isPending: false, mutateAsync: createAuthKeyMutateAsync },
    deleteAuthKey: { isPending: false, mutateAsync: deleteAuthKeyMutateAsync },
    saveAccount: { isPending: false, mutateAsync: saveAccountMutateAsync },
    saveAuthKey: { isPending: false, variables: undefined, mutateAsync: saveAuthKeyMutateAsync },
  }),
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAuthKeyMutateAsync.mockResolvedValue({ data: { name: '새 키', value: 'sk_live_new' } });
    saveAccountMutateAsync.mockResolvedValue({});
    saveAuthKeyMutateAsync.mockResolvedValue({});
  });

  it('API key 접근 권한 트리에 DB PK 라벨을 노출하지 않는다', () => {
    render(<AdminPage navigate={vi.fn()} showAlert={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));

    expect(screen.getByText('프론트엔드 개발자 채용')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '프론트엔드 개발자 채용 지원서 목록 열기' }));

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByText(/#10/)).not.toBeInTheDocument();
  });

  it('개발자용 미지원 안내와 플랜 상태 버튼을 노출하지 않는다', () => {
    render(<AdminPage navigate={vi.fn()} showAlert={vi.fn()} />);

    expect(screen.queryByText(['backend', '미지원', '기능'].join(' '))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(['backend', 'endpoint'].join(' ')))).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /플랜 상태 보기/ })).not.toBeInTheDocument();
  });

  it('JD 전체 선택 후 저장하면 authorized_resume id 배열과 credit_limit을 전달한다', async () => {
    render(<AdminPage navigate={vi.fn()} showAlert={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /프론트엔드 개발자 채용/ }));
    fireEvent.click(screen.getByRole('button', { name: /저장/ }));

    await waitFor(() => {
      expect(saveAuthKeyMutateAsync).toHaveBeenCalledWith({
        id: 1,
        authorized_resume: [10, 11],
        credit_limit: 1000,
      });
    });
  });

  it('API key 발급 credit이 관리자 보유 credit을 넘으면 mutation을 호출하지 않는다', async () => {
    const user = userEvent.setup();

    render(<AdminPage navigate={vi.fn()} showAlert={vi.fn()} />);

    await user.type(screen.getByLabelText('키 이름'), '초과 키');
    await user.type(screen.getAllByLabelText('제공 Credit')[0], '1001');
    await user.click(screen.getByRole('button', { name: /API key 발급/ }));

    expect(await screen.findByText('보유 Credit을 초과할 수 없습니다.')).toBeInTheDocument();
    expect(createAuthKeyMutateAsync).not.toHaveBeenCalled();
  });
});
