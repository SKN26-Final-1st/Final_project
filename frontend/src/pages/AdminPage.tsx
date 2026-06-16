import { useMemo, useState } from 'react';
import { Button, Form, Space, Tag } from 'antd';
import { ApiOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import { AdminCreditPanel } from '../components/admin/AdminCreditPanel';
import { AdminSummaryCards } from '../components/admin/AdminSummaryCards';
import { AuthKeyCreateForm, type AuthKeyCreateFormValues } from '../components/admin/AuthKeyCreateForm';
import { AuthKeyList } from '../components/admin/AuthKeyList';
import { CreatedAuthKeyPanel } from '../components/admin/CreatedAuthKeyPanel';
import { UnsupportedBackendPanel } from '../components/admin/UnsupportedBackendPanel';
import { PageTitle } from '../components/common/PageTitle';
import { SectionCard } from '../components/common/SectionCard';
import type { AuthKey, Resume } from '../data/backendTypes';
import { useAdminPageData } from '../hooks/useAdminPageData';
import { useAdminMutations } from '../hooks/mutations/useAdminMutations';
import type { Navigate, ShowAlert } from '../types/app';

type AdminPageProps = {
  navigate: Navigate;
  showAlert: ShowAlert;
};

function formatResumeLabel(resume: Resume) {
  return `${resume.name || '이름 없음'} · #${resume.id}`;
}

export function AdminPage({ navigate, showAlert }: AdminPageProps) {
  const [form] = Form.useForm<AuthKeyCreateFormValues>();
  const [authorizedDrafts, setAuthorizedDrafts] = useState<Record<number, number[]>>({});
  const [createdAuthKey, setCreatedAuthKey] = useState<Pick<AuthKey, 'name' | 'value'> | null>(null);
  const { admin, authKeys, resumes } = useAdminPageData();
  const { createAuthKey: createAuthKeyMutation, deleteAuthKey: deleteAuthKeyMutation, saveAuthKey } =
    useAdminMutations(showAlert);
  const loadingKey = createAuthKeyMutation.isPending
    ? 'authkey-add'
    : saveAuthKey.isPending && saveAuthKey.variables
      ? `authkey-save-${saveAuthKey.variables.id}`
      : deleteAuthKeyMutation.isPending && deleteAuthKeyMutation.variables
        ? `authkey-delete-${deleteAuthKeyMutation.variables}`
        : null;
  const resumeOptions = useMemo(
    () => resumes.map((resume) => ({ value: resume.id, label: formatResumeLabel(resume) })),
    [resumes],
  );

  const createAuthKey = async (values: AuthKeyCreateFormValues) => {
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

  const updateAuthorizedDraft = (id: number, nextIds: number[]) => {
    setAuthorizedDrafts((current) => ({ ...current, [id]: nextIds }));
  };

  const saveAuthorizedResumes = (authKey: AuthKey) => {
    void saveAuthKey
      .mutateAsync({ id: authKey.id, authorized_resume: getAuthorizedResumeIds(authKey) })
      .then(() => {
        setAuthorizedDrafts((current) => {
          const next = { ...current };
          delete next[authKey.id];
          return next;
        });
      });
  };

  const deleteAuthKey = (authKey: AuthKey) => {
    void deleteAuthKeyMutation.mutateAsync(authKey.id);
  };

  if (!admin) {
    return null;
  }

  return (
    <div className="admin-page startup-admin-page">
      <PageTitle
        eyebrow="Company Admin"
        title="관리자"
        description={`${admin.companyName}의 크레딧, 구독 상태, 공유 API key 접근 범위를 관리합니다.`}
        actions={
          <Space wrap>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/company')}>
              회사 정보
            </Button>
            <Button
              icon={<ApiOutlined />}
              onClick={() => showAlert({ type: 'info', message: '플랜/결제 API는 아직 backend에 없습니다.' })}
            >
              플랜 상태 보기
            </Button>
          </Space>
        }
      />

      <AdminSummaryCards summary={admin.summary} />

      <div className="admin-workspace-grid">
        <SectionCard
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
            resumeOptions={resumeOptions}
            getAuthorizedResumeIds={getAuthorizedResumeIds}
            updateAuthorizedDraft={updateAuthorizedDraft}
            saveAuthorizedResumes={saveAuthorizedResumes}
            deleteAuthKey={deleteAuthKey}
          />
        </SectionCard>

        <div className="admin-workspace-side">
          <AdminCreditPanel credit={admin.credit} />
          <UnsupportedBackendPanel />
        </div>
      </div>
    </div>
  );
}
