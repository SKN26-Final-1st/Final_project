import { useState } from 'react';
import { Button, Checkbox, Tag } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';

export type AuthKeyAccessResumeOption = {
  value: number;
  label: string;
};

export type AuthKeyAccessGroup = {
  key: string;
  label: string;
  resumes: AuthKeyAccessResumeOption[];
};

type AuthKeyAccessTreeProps = {
  authKeyId: number;
  authKeyName: string;
  groups: AuthKeyAccessGroup[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
};

function addUniqueIds(currentIds: number[], nextIds: number[]) {
  return Array.from(new Set([...currentIds, ...nextIds]));
}

function removeIds(currentIds: number[], idsToRemove: number[]) {
  const removeSet = new Set(idsToRemove);
  return currentIds.filter((id) => !removeSet.has(id));
}

function toggleId(currentIds: number[], targetId: number) {
  return currentIds.includes(targetId) ? currentIds.filter((id) => id !== targetId) : [...currentIds, targetId];
}

export function AuthKeyAccessTree({
  authKeyId,
  authKeyName,
  groups,
  selectedIds,
  onChange,
}: AuthKeyAccessTreeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroupKeys, setOpenGroupKeys] = useState<string[]>([]);

  const toggleGroupOpen = (groupKey: string) => {
    setOpenGroupKeys((current) =>
      current.includes(groupKey) ? current.filter((key) => key !== groupKey) : [...current, groupKey],
    );
  };

  const selectedIdSet = new Set(selectedIds);

  return (
    <div className="authkey-access">
      <Button
        className="authkey-access-toggle"
        aria-label={`${authKeyName} 지원서 접근 범위 ${isOpen ? '닫기' : '열기'}`}
        icon={isOpen ? <DownOutlined /> : <RightOutlined />}
        onClick={() => setIsOpen((current) => !current)}
      >
        지원서 범위
      </Button>

      {isOpen && (
        <div className="authkey-access-panel">
          {groups.length ? (
            groups.map((group) => {
              const groupIds = group.resumes.map((resume) => resume.value);
              const selectedCount = groupIds.filter((id) => selectedIdSet.has(id)).length;
              const isChecked = groupIds.length > 0 && selectedCount === groupIds.length;
              const isIndeterminate = selectedCount > 0 && selectedCount < groupIds.length;
              const isGroupOpen = openGroupKeys.includes(group.key);
              const statusLabel = isChecked ? '전체 허용' : isIndeterminate ? '일부 허용' : '미허용';

              return (
                <div className="authkey-access-group" key={`${authKeyId}-${group.key}`}>
                  <div className="authkey-access-group-row">
                    <div className="authkey-access-group-main">
                      <Button
                        className="authkey-access-expand"
                        type="text"
                        size="small"
                        aria-label={`${group.label} 지원서 목록 ${isGroupOpen ? '닫기' : '열기'}`}
                        icon={isGroupOpen ? <DownOutlined /> : <RightOutlined />}
                        onClick={() => toggleGroupOpen(group.key)}
                      />
                      <Checkbox
                        checked={isChecked}
                        disabled={!groupIds.length}
                        indeterminate={isIndeterminate}
                        onChange={() => {
                          onChange(isChecked ? removeIds(selectedIds, groupIds) : addUniqueIds(selectedIds, groupIds));
                        }}
                      >
                        <span className="authkey-access-label">{group.label}</span>
                      </Checkbox>
                    </div>
                    <Tag
                      className="authkey-access-status"
                      color={isChecked ? 'green' : isIndeterminate ? 'gold' : 'default'}
                    >
                      {statusLabel}
                    </Tag>
                  </div>

                  {isGroupOpen && (
                    <div className="authkey-access-resumes">
                      {group.resumes.map((resume) => (
                        <Checkbox
                          className="authkey-access-resume"
                          checked={selectedIdSet.has(resume.value)}
                          key={`${group.key}-${resume.value}`}
                          onChange={() => onChange(toggleId(selectedIds, resume.value))}
                        >
                          <span className="authkey-access-label">{resume.label}</span>
                        </Checkbox>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <span className="authkey-access-empty">연결할 지원서가 없습니다.</span>
          )}
        </div>
      )}
    </div>
  );
}
