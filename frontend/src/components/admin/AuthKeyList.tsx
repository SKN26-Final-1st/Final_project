import { Button, List, Tag } from 'antd';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { InlineLoading } from '../common/InlineLoading';
import type { AuthKey } from '../../data/backendTypes';
import { maskAuthKeyValue } from './authKeyUtils';
import { AuthKeyAccessTree, type AuthKeyAccessGroup } from './AuthKeyAccessTree';

export type { AuthKeyAccessGroup, AuthKeyAccessResumeOption } from './AuthKeyAccessTree';

type AuthKeyListProps = {
  authKeys: AuthKey[];
  loadingKey: string | null;
  accessGroups: AuthKeyAccessGroup[];
  getAuthorizedResumeIds: (authKey: AuthKey) => number[];
  updateAuthorizedDraft: (id: number, nextIds: number[]) => void;
  saveAuthorizedResumes: (authKey: AuthKey) => void;
  deleteAuthKey: (authKey: AuthKey) => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export function AuthKeyList({
  authKeys,
  loadingKey,
  accessGroups,
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
          <List.Item>
            <div className="authkey-item-content">
              <div className="authkey-item-header">
                <List.Item.Meta
                  title={
                    <div className="authkey-meta">
                      <strong className="authkey-name">{authKey.name}</strong>
                      <div className="authkey-tags">
                        <Tag className="authkey-value-tag">{maskAuthKeyValue(authKey.value)}</Tag>
                        <Tag color="geekblue">한도 {formatNumber(authKey.credit_limit)}pt</Tag>
                        <Tag color={authKey.authorized_resume.length ? 'green' : 'default'}>
                          허용 지원서 {authKey.authorized_resume.length}건
                        </Tag>
                      </div>
                    </div>
                  }
                  description={<span className="authkey-description">{authKey.description || '설명 없음'}</span>}
                />
                <div className="authkey-item-actions" aria-label={`${authKey.name} API key 작업`}>
                  <Button
                    icon={loadingKey === saveKey ? undefined : <SaveOutlined />}
                    disabled={loadingKey === saveKey}
                    onClick={() => saveAuthorizedResumes(authKey)}
                  >
                    {loadingKey === saveKey ? <InlineLoading label="저장 중" /> : '저장'}
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={loadingKey === deleteKey}
                    onClick={() => deleteAuthKey(authKey)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
              <AuthKeyAccessTree
                authKeyId={authKey.id}
                authKeyName={authKey.name}
                groups={accessGroups}
                selectedIds={getAuthorizedResumeIds(authKey)}
                onChange={(nextIds) => updateAuthorizedDraft(authKey.id, nextIds)}
              />
            </div>
          </List.Item>
        );
      }}
    />
  );
}
