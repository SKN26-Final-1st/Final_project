import { useMemo, useState } from 'react';
import { Alert, Button, Col, Form, Input, InputNumber, List, Progress, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import {
  ApiOutlined,
  CopyOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  KeyOutlined,
  PlusOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { InlineLoading } from '../components/common/InlineLoading';
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

type AuthKeyCreateForm = {
  name: string;
  description?: string;
  credit_limit?: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

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
  const [form] = Form.useForm<AuthKeyCreateForm>();
  const [authorizedDrafts, setAuthorizedDrafts] = useState<Record<number, number[]>>({});
  const resumeOptions = useMemo(
    () => resumes.map((resume) => ({ value: resume.id, label: formatResumeLabel(resume) })),
    [resumes],
  );

  const createAuthKey = async (values: AuthKeyCreateForm) => {
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

      <Row gutter={[16, 16]}>
        {admin.summary.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.label}>
            <SectionCard title={item.label}>
              <Statistic value={item.value} suffix={item.suffix} />
              <p className="muted">{item.helper}</p>
            </SectionCard>
          </Col>
        ))}
      </Row>

      <div className="admin-workspace-grid">
        <SectionCard
          title="공유 API key"
          extra={
            <Tag color="blue" icon={<KeyOutlined />}>
              {authKeys.length}개
            </Tag>
          }
        >
          <Form form={form} layout="vertical" onFinish={(values) => void createAuthKey(values)}>
            <Row gutter={[12, 0]}>
              <Col xs={24} md={8}>
                <Form.Item label="키 이름" name="name" rules={[{ required: true, message: '키 이름을 입력하세요.' }]}>
                  <Input placeholder="예: 외부 면접관 공유" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item label="설명" name="description">
                  <Input placeholder="사용 목적" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="크레딧 한도" name="credit_limit">
                  <InputNumber min={0} precision={0} className="full-width-control" placeholder="0" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loadingKey === 'authkey-add'}>
              API key 발급
            </Button>
          </Form>

          {createdAuthKey && (
            <Alert
              showIcon
              className="created-authkey-panel"
              type="success"
              message="새 API key가 발급되었습니다."
              description={
                <div className="created-authkey-content">
                  <span>
                    이 키는 지금만 원문으로 복사할 수 있습니다. 페이지를 새로고침하거나 이동하면 다시 표시되지 않습니다.
                  </span>
                  <Typography.Text code className="created-authkey-value">
                    {createdAuthKey.value}
                  </Typography.Text>
                </div>
              }
              action={
                <Space wrap>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => void copyCreatedAuthKey()}>
                    복사
                  </Button>
                  <Button size="small" onClick={() => setCreatedAuthKey(null)}>
                    확인
                  </Button>
                </Space>
              }
            />
          )}

          <List
            className="authkey-list"
            dataSource={authKeys}
            locale={{ emptyText: '발급된 API key가 없습니다.' }}
            renderItem={(authKey) => {
              const saveKey = `authkey-save-${authKey.id}`;
              const deleteKey = `authkey-delete-${authKey.id}`;

              return (
                <List.Item
                  actions={[
                    <Button
                      key="save"
                      icon={loadingKey === saveKey ? undefined : <SaveOutlined />}
                      disabled={loadingKey === saveKey}
                      onClick={() => saveAuthorizedResumes(authKey)}
                    >
                      {loadingKey === saveKey ? <InlineLoading label="저장 중" /> : '저장'}
                    </Button>,
                    <Button
                      danger
                      key="delete"
                      icon={<DeleteOutlined />}
                      disabled={loadingKey === deleteKey}
                      onClick={() => deleteAuthKey(authKey)}
                    >
                      삭제
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="authkey-meta">
                        <strong className="authkey-name">{authKey.name}</strong>
                        <div className="authkey-tags">
                          <Tag className="authkey-value-tag">{authKey.value}</Tag>
                          <Tag color="geekblue">한도 {formatNumber(authKey.credit_limit)}pt</Tag>
                        </div>
                      </div>
                    }
                    description={<span className="authkey-description">{authKey.description || '설명 없음'}</span>}
                  />
                  <Select
                    mode="multiple"
                    allowClear
                    className="authkey-resume-select"
                    placeholder="허용할 지원서 선택"
                    options={resumeOptions}
                    value={getAuthorizedResumeIds(authKey)}
                    onChange={(nextIds) => updateAuthorizedDraft(authKey.id, nextIds)}
                  />
                </List.Item>
              );
            }}
          />
        </SectionCard>

        <div className="admin-workspace-side">
          <SectionCard title="포인트 / 구독">
            <div className="admin-credit-panel">
              <CreditCardOutlined />
              <div>
                <strong>{formatNumber(admin.credit.remaining)}pt</strong>
                <span>{admin.credit.subscriptionStatus}</span>
              </div>
            </div>
            <Progress percent={admin.credit.percent} />
            <p className="muted">구독 만료일: {admin.credit.expiresAt}</p>
          </SectionCard>

          <SectionCard title="backend 미지원 기능">
            <Alert
              showIcon
              type="warning"
              title="표시 전용"
              description="플랜 목록, 결제/구독 변경, 포인트 충전 이력, 일반/기업 고객 구분, 조직 멤버 권한 관리는 현재 backend endpoint가 없어 임의 호출하지 않습니다."
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
