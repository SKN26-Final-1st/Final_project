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
import type { AdminData } from '../api/adapters';
import { apiClient } from '../api/backendClient';
import type { AuthKey, Resume } from '../data/backendTypes';
import type { Navigate, RunApiAction, ShowAlert } from '../types/app';

type AdminPageProps = {
  admin: AdminData;
  authKeys: AuthKey[];
  resumes: Resume[];
  loadingKey: string | null;
  navigate: Navigate;
  runApiAction: RunApiAction;
  showAlert: ShowAlert;
  reloadData: () => Promise<void>;
  createdAuthKey: Pick<AuthKey, 'name' | 'value'> | null;
  setCreatedAuthKey: (nextAuthKey: Pick<AuthKey, 'name' | 'value'> | null) => void;
};

function formatResumeLabel(resume: Resume) {
  return `${resume.name || '이름 없음'} · #${resume.id}`;
}

export function AdminPage({
  admin,
  authKeys,
  resumes,
  loadingKey,
  navigate,
  runApiAction,
  showAlert,
  reloadData,
  createdAuthKey,
  setCreatedAuthKey,
}: AdminPageProps) {
  const [form] = Form.useForm<AuthKeyCreateFormValues>();
  const [authorizedDrafts, setAuthorizedDrafts] = useState<Record<number, number[]>>({});
  const resumeOptions = useMemo(
    () => resumes.map((resume) => ({ value: resume.id, label: formatResumeLabel(resume) })),
    [resumes],
  );

  const createAuthKey = async (values: AuthKeyCreateFormValues) => {
    await runApiAction(
      'authkey-add',
      () => apiClient.addAuthKey(values),
      (response) => {
        form.resetFields();
        setCreatedAuthKey({ name: response.data.name, value: response.data.value });
        showAlert({
          type: 'success',
          message: '새 API key가 생성되었습니다.',
        });
        void reloadData();
      },
    );
  };

  const copyCreatedAuthKey = async () => {
    if (!createdAuthKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdAuthKey.value);
      showAlert({ type: 'success', message: 'API key를 복사했습니다.' });
    } catch {
      showAlert({ type: 'error', message: '복사에 실패했습니다. API key를 직접 선택해 복사해주세요.' });
    }
  };

  const getAuthorizedResumeIds = (authKey: AuthKey) => authorizedDrafts[authKey.id] ?? authKey.authorized_resume;

  const updateAuthorizedDraft = (id: number, nextIds: number[]) => {
    setAuthorizedDrafts((current) => ({ ...current, [id]: nextIds }));
  };

  const saveAuthorizedResumes = (authKey: AuthKey) => {
    void runApiAction(
      `authkey-save-${authKey.id}`,
      () => apiClient.saveAuthKey({ id: authKey.id, authorized_resume: getAuthorizedResumeIds(authKey) }),
      () => {
        setAuthorizedDrafts((current) => {
          const next = { ...current };
          delete next[authKey.id];
          return next;
        });
        void reloadData();
      },
    );
  };

  const deleteAuthKey = (authKey: AuthKey) => {
    void runApiAction(
      `authkey-delete-${authKey.id}`,
      () => apiClient.deleteAuthKey(authKey.id),
      () => void reloadData(),
    );
  };

  return (
    <div className="admin-page startup-admin-page">
      <PageTitle
        eyebrow="Company Admin"
        title="관리자"
        description={`${admin.companyName}의 포인트, 구독 상태, 공유 API key 접근 범위를 관리합니다.`}
        actions={
          <Space wrap>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/company')}>
              회사 정보
            </Button>
            <Button icon={<ApiOutlined />} onClick={() => showAlert({ type: 'info', message: '플랜/결제 API는 아직 backend에 없습니다.' })}>
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
          <AuthKeyCreateForm form={form} loading={loadingKey === 'authkey-add'} onFinish={(values) => void createAuthKey(values)} />

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
