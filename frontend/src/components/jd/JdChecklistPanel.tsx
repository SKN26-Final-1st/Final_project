import { useState } from 'react';
import { Alert, Button, Input, InputNumber, Tag } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { DestructiveConfirmModal } from '../common/DestructiveConfirmModal';
import { InlineLoading } from '../common/InlineLoading';
import type { Checklist, JobDescriptionChecklistStatus } from '../../data/backendTypes';

type ChecklistAddPayload = {
  job_description_id: number;
  content: string;
};

type ChecklistUpdatePayload = ChecklistAddPayload & {
  id: number;
};

type ChecklistDeletePayload = {
  id: number;
  job_description_id: number;
};

type JdChecklistPanelProps = {
  adding: boolean;
  canAdd?: boolean;
  deleting: boolean;
  generating: boolean;
  generateCount: number;
  generateQuery: string;
  generateBlockedReason?: string;
  items: Checklist[];
  jobDescriptionId: number;
  loading: boolean;
  checklistStatus?: JobDescriptionChecklistStatus;
  refreshingFailure?: boolean;
  updating: boolean;
  onAdd: (payload: ChecklistAddPayload) => Promise<unknown>;
  onDelete: (payload: ChecklistDeletePayload) => Promise<unknown>;
  onGenerate: () => Promise<unknown>;
  onGenerateCountChange: (value: number) => void;
  onGenerateQueryChange: (value: string) => void;
  onRefreshFailure?: () => Promise<unknown>;
  onUpdate: (payload: ChecklistUpdatePayload) => Promise<unknown>;
};

const CHECKLIST_REQUIRED_MESSAGE = '체크리스트 내용을 입력하세요.';

const CHECKLIST_STATUS_LABEL: Record<JobDescriptionChecklistStatus, string> = {
  done: '체크리스트 준비됨',
  onqueue: '생성 대기',
  processing: '생성 중',
  fail: '생성 실패',
};

function getChecklistStatusDescription(status: JobDescriptionChecklistStatus) {
  if (status === 'onqueue') {
    return '체크리스트 생성 요청이 대기 중입니다.';
  }

  if (status === 'processing') {
    return '체크리스트를 생성하는 중입니다. 완료되면 목록이 갱신됩니다.';
  }

  if (status === 'fail') {
    return '이전 체크리스트 생성 요청이 실패했습니다. 확인 후 상태를 초기화하면 다시 요청할 수 있습니다.';
  }

  return '';
}

function normalizeContent(value: string) {
  return value.trim();
}

export function JdChecklistPanel({
  adding,
  canAdd = true,
  deleting,
  generating,
  generateCount,
  generateQuery,
  generateBlockedReason,
  items,
  jobDescriptionId,
  loading,
  checklistStatus = 'done',
  refreshingFailure = false,
  updating,
  onAdd,
  onDelete,
  onGenerate,
  onGenerateCountChange,
  onGenerateQueryChange,
  onRefreshFailure,
  onUpdate,
}: JdChecklistPanelProps) {
  const [newContent, setNewContent] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Checklist | null>(null);

  const submitNewChecklist = async () => {
    const content = normalizeContent(newContent);

    if (!content) {
      setAddError(CHECKLIST_REQUIRED_MESSAGE);
      return;
    }

    setAddError('');
    await onAdd({ job_description_id: jobDescriptionId, content });
    setNewContent('');
  };

  const startEditing = (item: Checklist) => {
    setEditingId(item.id);
    setEditingContent(item.content);
    setEditError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingContent('');
    setEditError('');
  };

  const submitEditing = async (item: Checklist) => {
    const content = normalizeContent(editingContent);

    if (!content) {
      setEditError(CHECKLIST_REQUIRED_MESSAGE);
      return;
    }

    setEditError('');
    await onUpdate({ id: item.id, job_description_id: jobDescriptionId, content });
    cancelEditing();
  };

  const cancelDelete = () => {
    if (!deleting) {
      setDeleteTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    await onDelete({ id: deleteTarget.id, job_description_id: jobDescriptionId });

    if (editingId === deleteTarget.id) {
      cancelEditing();
    }

    setDeleteTarget(null);
  };

  const hasStatusNotice = checklistStatus !== 'done';
  const isGenerateDisabled = generating || Boolean(generateBlockedReason);

  return (
    <section className="jd-checklist-panel">
      <div className="jd-checklist-panel-head">
        <div>
          <h3>JD 체크리스트</h3>
          <span className="muted">선택한 JD 기준 항목</span>
          {checklistStatus !== 'done' ? <Tag className="jd-checklist-status-tag">{CHECKLIST_STATUS_LABEL[checklistStatus]}</Tag> : null}
        </div>
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          disabled={isGenerateDisabled}
          title={generateBlockedReason}
          onClick={() => void onGenerate()}
        >
          {generating ? <InlineLoading label="생성 중" /> : '체크리스트 분석 요청'}
        </Button>
      </div>

      {hasStatusNotice ? (
        <Alert
          className="jd-checklist-status-alert"
          type={checklistStatus === 'fail' ? 'warning' : 'info'}
          showIcon
          message={CHECKLIST_STATUS_LABEL[checklistStatus]}
          description={getChecklistStatusDescription(checklistStatus)}
          action={
            checklistStatus === 'fail' && onRefreshFailure ? (
              <Button size="small" loading={refreshingFailure} onClick={() => void onRefreshFailure()}>
                확인했습니다
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="jd-checklist-generate-controls">
        <Input
          allowClear
          aria-label="체크리스트 생성 요청사항"
          placeholder="체크리스트 생성 요청사항 (예: 실무 경험 검증을 강화)"
          value={generateQuery}
          onChange={(event) => onGenerateQueryChange(event.target.value)}
        />
        <InputNumber
          aria-label="체크리스트 생성 개수"
          min={0}
          max={10}
          value={generateCount}
          onChange={(value) => onGenerateCountChange(typeof value === 'number' ? value : 0)}
        />
        <span className="muted">0이면 현재 항목 기준 10개까지 채웁니다.</span>
      </div>

      {canAdd ? (
        <>
          <div className="jd-checklist-add-form">
            <Input.TextArea
              aria-label="새 체크리스트 내용"
              autoSize={{ minRows: 1, maxRows: 3 }}
              placeholder="체크리스트 항목 입력"
              status={addError ? 'error' : undefined}
              value={newContent}
              onChange={(event) => {
                setNewContent(event.target.value);
                if (addError) setAddError('');
              }}
            />
            <Button
              aria-label="체크리스트 추가"
              disabled={adding}
              loading={adding}
              onClick={() => void submitNewChecklist()}
            >
              추가
            </Button>
          </div>
          {addError ? <p className="form-field-error">{addError}</p> : null}
        </>
      ) : null}

      {loading ? (
        <InlineLoading label="체크리스트 로딩 중" />
      ) : items.length ? (
        <div className="jd-checklist-list" role="list">
          {items.map((item) => {
            const isEditing = editingId === item.id;

            return (
              <div className="jd-checklist-row" key={item.id} role="listitem">
                {isEditing ? (
                  <div className="jd-checklist-edit-field">
                    <Input.TextArea
                      aria-label={`${item.content} 수정 내용`}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      status={editError ? 'error' : undefined}
                      value={editingContent}
                      onChange={(event) => {
                        setEditingContent(event.target.value);
                        if (editError) {
                          setEditError('');
                        }
                      }}
                    />
                    {editError ? <p className="form-field-error">{editError}</p> : null}
                  </div>
                ) : (
                  <span className="jd-checklist-content">{item.content}</span>
                )}

                <div className="jd-checklist-row-actions">
                  {isEditing ? (
                    <>
                      <Button
                        aria-label={`${item.content} 저장`}
                        size="small"
                        type="primary"
                        disabled={updating}
                        loading={updating}
                        onClick={() => void submitEditing(item)}
                      >
                        저장
                      </Button>
                      <Button
                        aria-label={`${item.content} 수정 취소`}
                        size="small"
                        disabled={updating}
                        onClick={cancelEditing}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        aria-label={`${item.content} 수정`}
                        size="small"
                        disabled={updating || deleting}
                        onClick={() => startEditing(item)}
                      >
                        수정
                      </Button>
                      <Button
                        aria-label={`${item.content} 삭제`}
                        danger
                        size="small"
                        disabled={deleting}
                        loading={deleting && deleteTarget?.id === item.id}
                        onClick={() => setDeleteTarget(item)}
                      >
                        삭제
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="jd-checklist-empty">
          <strong>지원서 분석 전 필수 기준이 없습니다.</strong>
          <p className="muted">지원서 분석은 JD 체크리스트를 기준으로 진행됩니다. 자동 생성하거나 직접 기준을 추가해주세요.</p>
        </div>
      )}
      <DestructiveConfirmModal
        open={Boolean(deleteTarget)}
        title="체크리스트 항목을 삭제하시겠습니까?"
        description={
          <>
            삭제한 체크리스트는 복구할 수 없습니다. 이 JD의 이후 지원서 분석 기준에서 제외됩니다. 기존에
            생성된 리포트는 자동으로 변경되지 않습니다.
          </>
        }
        target={
          deleteTarget
            ? {
                title: deleteTarget.content,
                ariaLabel: '삭제할 체크리스트 항목',
              }
            : null
        }
        warning={{
          title: '지원서 분석 기준에서 제외됩니다.',
          description: '이 항목을 삭제해도 기존에 생성된 리포트 내용은 자동으로 다시 계산되지 않습니다.',
        }}
        loading={deleting}
        cancelLabel="취소"
        confirmLabel="삭제"
        confirmAriaLabel="삭제"
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
