import { useMemo, useState } from 'react';
import { Button, Form, Space, Tag } from 'antd';
import { KeyOutlined, SettingOutlined } from '@ant-design/icons';
import { AdminCreditPanel } from '../components/admin/AdminCreditPanel';
import { AdminSummaryCards } from '../components/admin/AdminSummaryCards';
import { AuthKeyCreateForm, type AuthKeyCreateFormValues } from '../components/admin/AuthKeyCreateForm';
import { AuthKeyDeleteModal } from '../components/admin/AuthKeyDeleteModal';
import { AuthKeyList, type AuthKeyAccessGroup } from '../components/admin/AuthKeyList';
import { CreatedAuthKeyPanel } from '../components/admin/CreatedAuthKeyPanel';
import { EmptyState } from '../components/common/PageState';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { JdItem } from '../api/adapters';
import type { AuthKey, Resume } from '../data/backendTypes';
import { useAdminPageData } from '../hooks/useAdminPageData';
import { useAdminMutations } from '../hooks/mutations/useAdminMutations';
import type { Navigate, ShowAlert } from '../types/app';

type AdminPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

function formatResumeAccessLabel(resume: Resume) {
  return resume.name || '이름 없음';
}

function createResumeAccessGroups(resumes: Resume[], jdList: JdItem[]): AuthKeyAccessGroup[] {
  const resumesByJdId = new Map<string, Resume[]>();

  resumes.forEach((resume) => {
    const jdId = String(resume.job_description_id);
    const groupResumes = resumesByJdId.get(jdId) ?? [];
    groupResumes.push(resume);
    resumesByJdId.set(jdId, groupResumes);
  });

  const groups = jdList
    .map((jd) => {
      const groupResumes = resumesByJdId.get(jd.id) ?? [];
      resumesByJdId.delete(jd.id);

      return {
        key: `jd-${jd.id}`,
        label: jd.title || '제목 없는 JD',
        resumes: groupResumes.map((resume) => ({ value: resume.id, label: formatResumeAccessLabel(resume) })),
      };
    })
    .filter((group) => group.resumes.length > 0);

  const unlinkedResumes = Array.from(resumesByJdId.values()).flat();
  if (unlinkedResumes.length > 0) {
    groups.push({
      key: 'jd-unlinked',
      label: '연결 JD 없음',
      resumes: unlinkedResumes.map((resume) => ({ value: resume.id, label: formatResumeAccessLabel(resume) })),
    });
  }

  return groups;
}

function addOneMonth(date: Date) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
}

function getSubscriptionBaseDate(expiresAtIso: string, isSubscriptionActive: boolean) {
  const expirationDate = expiresAtIso ? new Date(expiresAtIso) : null;

  if (isSubscriptionActive && expirationDate && !Number.isNaN(expirationDate.getTime())) {
    return expirationDate;
  }

  return new Date();
}

export function AdminPage({ navigate, showAlert }: AdminPageProps) {
  const [form] = Form.useForm<AuthKeyCreateFormValues>();
  const [authorizedDrafts, setAuthorizedDrafts] = useState<Record<number, number[]>>({});
  const [creditDrafts, setCreditDrafts] = useState<Record<number, number>>({});
  const [createdAuthKey, setCreatedAuthKey] = useState<Pick<AuthKey, 'name' | 'value'> | null>(null);
  const [deleteTargetAuthKey, setDeleteTargetAuthKey] = useState<AuthKey | null>(null);
  const { admin, authKeys, jdList, resumes } = useAdminPageData();
  const { createAuthKey: createAuthKeyMutation, deleteAuthKey: deleteAuthKeyMutation, saveAccount, saveAuthKey } =
    useAdminMutations(showAlert);
  const loadingKey = createAuthKeyMutation.isPending
    ? 'authkey-add'
    : saveAuthKey.isPending && saveAuthKey.variables
      ? `authkey-save-${saveAuthKey.variables.id}`
      : deleteAuthKeyMutation.isPending && deleteAuthKeyMutation.variables
        ? `authkey-delete-${deleteAuthKeyMutation.variables}`
        : saveAccount.isPending
          ? 'account-save'
        : null;
  const accessGroups = useMemo(() => createResumeAccessGroups(resumes, jdList), [jdList, resumes]);

  const createAuthKey = async (values: AuthKeyCreateFormValues) => {
    if (admin && (values.credit_limit ?? 0) > admin.credit.remaining) {
      showAlert({ type: 'warning', message: '보유 Credit을 초과할 수 없습니다.' });
      return;
    }

    const response = await createAuthKeyMutation.mutateAsync(values);
    form.resetFields();
    setCreatedAuthKey({ name: response.data.name, value: response.data.value });
  };

  const copyCreatedAuthKey = async () => {
    if (!createdAuthKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdAuthKey.value);
      showAlert({ type: 'success', message: 'API key를 복사했습니다.' });
    } catch {
      showAlert({ type: 'error', message: '복사에 실패했습니다. API key를 직접 선택해 복사하세요.' });
    }
  };

  const getAuthorizedResumeIds = (authKey: AuthKey) => authorizedDrafts[authKey.id] ?? authKey.authorized_resume;
  const getCreditLimit = (authKey: AuthKey) => creditDrafts[authKey.id] ?? authKey.credit_limit;

  const updateAuthorizedDraft = (id: number, nextIds: number[]) => {
    setAuthorizedDrafts((current) => ({ ...current, [id]: nextIds }));
  };

  const updateCreditDraft = (id: number, nextCredit: number) => {
    setCreditDrafts((current) => ({ ...current, [id]: nextCredit }));
  };

  const saveAuthorizedResumes = (authKey: AuthKey) => {
    const nextCredit = getCreditLimit(authKey);
    const creditDelta = nextCredit - authKey.credit_limit;

    if (admin && creditDelta > admin.credit.remaining) {
      showAlert({ type: 'warning', message: '보유 Credit을 초과할 수 없습니다.' });
      return;
    }

    void saveAuthKey
      .mutateAsync({ id: authKey.id, authorized_resume: getAuthorizedResumeIds(authKey), credit_limit: nextCredit })
      .then(() => {
        setAuthorizedDrafts((current) => {
          const next = { ...current };
          delete next[authKey.id];
          return next;
        });
        setCreditDrafts((current) => {
          const next = { ...current };
          delete next[authKey.id];
          return next;
        });
      });
  };

  const deleteAuthKey = (authKey: AuthKey) => {
    setDeleteTargetAuthKey(authKey);
  };

  const confirmDeleteAuthKey = async () => {
    if (!deleteTargetAuthKey) {
      return;
    }

    await deleteAuthKeyMutation.mutateAsync(deleteTargetAuthKey.id);
    setDeleteTargetAuthKey(null);
  };

  const rechargeCredit = async (amount: number) => {
    if (!admin) {
      return;
    }

    await saveAccount.mutateAsync({ credit: admin.credit.remaining + amount });
  };

  const startOrExtendSubscription = async () => {
    if (!admin) {
      return;
    }

    const baseDate = getSubscriptionBaseDate(admin.credit.expiresAtIso, admin.credit.isSubscriptionActive);
    await saveAccount.mutateAsync({
      subscribe: true,
      subscribe_expiration: addOneMonth(baseDate).toISOString(),
    });
  };

  if (!admin) {
    return <EmptyState description="관리자 데이터를 불러오지 못했습니다." />;
  }

  return (
    <div className="admin-page startup-admin-page viewport-page">
      <PageTitle
        eyebrow="Company Admin"
        title="관리자"
        description={`${admin.companyName}의 크레딧, 구독 상태, 공유 API key 접근 범위를 관리합니다.`}
        actions={
          <Space wrap>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/company')}>
              회사 정보
            </Button>
          </Space>
        }
      />

      <AdminSummaryCards summary={admin.summary} />

      <div className="admin-workspace-grid">
        <SectionCard
          className="scroll-card-body"
          title="공유 API key"
          extra={
            <Tag color="blue" icon={<KeyOutlined />}>
              {authKeys.length}개
            </Tag>
          }
        >
          <AuthKeyCreateForm
            form={form}
            loading={createAuthKeyMutation.isPending}
            maxCredit={admin.credit.remaining}
            onFinish={(values) => void createAuthKey(values)}
          />

          {createdAuthKey && (
            <CreatedAuthKeyPanel
              authKey={createdAuthKey}
              onCopy={() => void copyCreatedAuthKey()}
              onClose={() => setCreatedAuthKey(null)}
            />
          )}

          <AuthKeyList
            authKeys={authKeys}
            loadingKey={loadingKey}
            accessGroups={accessGroups}
            adminCreditRemaining={admin.credit.remaining}
            getAuthorizedResumeIds={getAuthorizedResumeIds}
            getCreditLimit={getCreditLimit}
            updateAuthorizedDraft={updateAuthorizedDraft}
            updateCreditDraft={updateCreditDraft}
            saveAuthorizedResumes={saveAuthorizedResumes}
            deleteAuthKey={deleteAuthKey}
          />

          <AuthKeyDeleteModal
            authKey={deleteTargetAuthKey}
            open={Boolean(deleteTargetAuthKey)}
            loading={deleteAuthKeyMutation.isPending}
            onCancel={() => setDeleteTargetAuthKey(null)}
            onConfirm={() => void confirmDeleteAuthKey()}
          />
        </SectionCard>

        <div className="admin-workspace-side">
          <AdminCreditPanel
            credit={admin.credit}
            loading={saveAccount.isPending}
            onRecharge={(amount) => void rechargeCredit(amount)}
            onSubscribe={() => void startOrExtendSubscription()}
          />
        </div>
      </div>
    </div>
  );
}
