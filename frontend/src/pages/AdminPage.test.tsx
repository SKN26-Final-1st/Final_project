import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminPage } from './AdminPage';
import type { AdminData, JdItem } from '../api/adapters';
import type { AuthKey, Resume } from '../data/backendTypes';

const createAuthKeyMutateAsync = vi.hoisted(() => vi.fn());
const deleteAuthKeyMutateAsync = vi.hoisted(() => vi.fn());
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
  status: 'done',
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
    saveAuthKey: { isPending: false, mutateAsync: saveAuthKeyMutateAsync },
  }),
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveAuthKeyMutateAsync.mockResolvedValue({});
  });

  it('API key 허용 지원서 선택 라벨에 DB PK를 노출하지 않는다', () => {
    render(<AdminPage navigate={vi.fn()} showAlert={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));

    expect(screen.getByText('프론트엔드 개발자 채용')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '프론트엔드 개발자 채용 지원서 목록 열기' }));

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.queryByText(/#10/)).not.toBeInTheDocument();
  });

  it('JD 전체 선택 후 기존 저장 mutation에 authorized_resume id 배열을 전달한다', async () => {
    render(<AdminPage navigate={vi.fn()} showAlert={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '외부 면접관 공유 지원서 접근 범위 열기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /프론트엔드 개발자 채용/ }));
    fireEvent.click(screen.getByRole('button', { name: /저장/ }));

    expect(saveAuthKeyMutateAsync).toHaveBeenCalledWith({ id: 1, authorized_resume: [10, 11] });
  });
});
