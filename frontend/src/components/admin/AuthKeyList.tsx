import { Button, InputNumber, List, Tag } from 'antd';
import { DeleteOutlined, KeyOutlined, SaveOutlined } from '@ant-design/icons';
import { InlineLoading } from '../common/InlineLoading';
import type { AuthKey } from '../../data/backendTypes';
import { maskAuthKeyValue } from './authKeyUtils';
import { AuthKeyAccessTree, type AuthKeyAccessGroup } from './AuthKeyAccessTree';

export type { AuthKeyAccessGroup, AuthKeyAccessResumeOption } from './AuthKeyAccessTree';

type AuthKeyListProps = {
  authKeys: AuthKey[];
  loadingKey: string | null;
  accessGroups: AuthKeyAccessGroup[];
  adminCreditRemaining: number;
  getAuthorizedResumeIds: (authKey: AuthKey) => number[];
  getCreditLimit: (authKey: AuthKey) => number;
  updateAuthorizedDraft: (id: number, nextIds: number[]) => void;
  updateCreditDraft: (id: number, nextCredit: number) => void;
  saveAuthorizedResumes: (authKey: AuthKey) => void;
  deleteAuthKey: (authKey: AuthKey) => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function getCreditDeltaText(delta: number) {
  if (delta > 0) {
    return `+${formatNumber(delta)}p 추가 제공`;
  }

  if (delta < 0) {
    return `${formatNumber(Math.abs(delta))}p 회수 예정`;
  }

  return 'Credit 변경 없음';
}

export function AuthKeyList({
  authKeys,
  loadingKey,
  accessGroups,
  adminCreditRemaining,
  getAuthorizedResumeIds,
  getCreditLimit,
  updateAuthorizedDraft,
  updateCreditDraft,
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
        const nextCredit = getCreditLimit(authKey);
        const creditDelta = nextCredit - authKey.credit_limit;
        const exceedsAdminCredit = creditDelta > adminCreditRemaining;

        return (
          <List.Item>
            <article className="authkey-card" aria-label={`${authKey.name} API key 카드`}>
              <div className="authkey-card-main">
                <span className="authkey-card-icon" aria-hidden="true">
                  <KeyOutlined />
                </span>

                <div className="authkey-card-content">
                  <header className="authkey-card-header">
                    <div className="authkey-card-heading">
                      <div className="authkey-title-row">
                        <strong className="authkey-name">{authKey.name}</strong>
                        <div className="authkey-tags">
                          <Tag className="authkey-value-tag">{maskAuthKeyValue(authKey.value)}</Tag>
                          <Tag color="geekblue">Credit {formatNumber(authKey.credit_limit)}pt</Tag>
                          <Tag color={authKey.authorized_resume.length ? 'green' : 'default'}>
                            허용 지원서 {authKey.authorized_resume.length}건
                          </Tag>
                        </div>
                      </div>
                      <p className="authkey-description">{authKey.description || '설명 없음'}</p>
                    </div>

                    <div className="authkey-item-actions" aria-label={`${authKey.name} API key 작업`}>
                      <Button
                        size="small"
                        icon={loadingKey === saveKey ? undefined : <SaveOutlined />}
                        disabled={loadingKey === saveKey || exceedsAdminCredit}
                        onClick={() => saveAuthorizedResumes(authKey)}
                      >
                        {loadingKey === saveKey ? <InlineLoading label="저장 중" /> : '저장'}
                      </Button>
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        disabled={loadingKey === deleteKey}
                        onClick={() => deleteAuthKey(authKey)}
                      >
                        삭제
                      </Button>
                    </div>
                  </header>

                  <div className="authkey-credit-editor">
                    <label className="authkey-credit-label" htmlFor={`authkey-credit-${authKey.id}`}>
                      제공 Credit
                    </label>
                    <InputNumber
                      id={`authkey-credit-${authKey.id}`}
                      min={0}
                      precision={0}
                      value={nextCredit}
                      className="authkey-credit-input"
                      aria-label={`${authKey.name} 제공 Credit`}
                      onChange={(value) => updateCreditDraft(authKey.id, Math.max(0, Number(value ?? 0)))}
                    />
                    <span className={exceedsAdminCredit ? 'authkey-credit-delta error' : 'authkey-credit-delta'}>
                      {exceedsAdminCredit ? '보유 Credit을 초과할 수 없습니다.' : getCreditDeltaText(creditDelta)}
                    </span>
                  </div>

                  <AuthKeyAccessTree
                    authKeyId={authKey.id}
                    authKeyName={authKey.name}
                    groups={accessGroups}
                    selectedIds={getAuthorizedResumeIds(authKey)}
                    onChange={(nextIds) => updateAuthorizedDraft(authKey.id, nextIds)}
                  />
                </div>
              </div>
            </article>
          </List.Item>
        );
      }}
    />
  );
}
