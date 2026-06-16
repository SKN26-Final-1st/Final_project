import { Button, List, Select, Tag, type SelectProps } from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { InlineLoading } from '../common/InlineLoading';
import type { AuthKey } from '../../data/backendTypes';

type AuthKeyListProps = {
  authKeys: AuthKey[];
  loadingKey: string | null;
  resumeOptions: SelectProps<number[]>['options'];
  getAuthorizedResumeIds: (authKey: AuthKey) => number[];
  updateAuthorizedDraft: (id: number, nextIds: number[]) => void;
  saveAuthorizedResumes: (authKey: AuthKey) => void;
  deleteAuthKey: (authKey: AuthKey) => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function maskAuthKeyValue(value: string) {
  if (!value) {
    return '****';
  }

  if (value.includes('****')) {
    return value;
  }

  const suffix = value.slice(-4);
  const prefix = value.startsWith('sk_') ? value.split('_').slice(0, 2).join('_') : '';

  return prefix ? `${prefix}_****${suffix}` : `****${suffix}`;
}

export function AuthKeyList({
  authKeys,
  loadingKey,
  resumeOptions,
  getAuthorizedResumeIds,
  updateAuthorizedDraft,
  saveAuthorizedResumes,
  deleteAuthKey,
}: AuthKeyListProps) {
  return (
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
                    <Tag className="authkey-value-tag">{maskAuthKeyValue(authKey.value)}</Tag>
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
  );
}
