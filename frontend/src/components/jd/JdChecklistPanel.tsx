import { useState } from 'react';
import { Button, Input, Popconfirm } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { InlineLoading } from '../common/InlineLoading';
import type { Checklist } from '../../data/backendTypes';

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
  deleting: boolean;
  generating: boolean;
  items: Checklist[];
  jobDescriptionId: number;
  loading: boolean;
  updating: boolean;
  onAdd: (payload: ChecklistAddPayload) => Promise<unknown>;
  onDelete: (payload: ChecklistDeletePayload) => Promise<unknown>;
  onGenerate: () => Promise<unknown>;
  onUpdate: (payload: ChecklistUpdatePayload) => Promise<unknown>;
};

const CHECKLIST_REQUIRED_MESSAGE = '체크리스트 내용을 입력하세요.';

function normalizeContent(value: string) {
  return value.trim();
}

export function JdChecklistPanel({
  adding,
  deleting,
  generating,
  items,
  jobDescriptionId,
  loading,
  updating,
  onAdd,
  onDelete,
  onGenerate,
  onUpdate,
}: JdChecklistPanelProps) {
  const [newContent, setNewContent] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editError, setEditError] = useState('');

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

  return (
    <section className="jd-checklist-panel">
      <div className="jd-checklist-panel-head">
        <div>
          <h3>JD 체크리스트</h3>
          <span className="muted">선택한 JD 기준 항목</span>
        </div>
        <Button
          size="small"
          icon={<FileSearchOutlined />}
          disabled={generating}
          onClick={() => void onGenerate()}
        >
          {generating ? <InlineLoading label="생성 중" /> : '체크리스트 분석 요청'}
        </Button>
      </div>

      <div className="jd-checklist-add-form">
        <Input.TextArea
          aria-label="새 체크리스트 내용"
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="체크리스트 항목 입력"
          status={addError ? 'error' : undefined}
          value={newContent}
          onChange={(event) => {
            setNewContent(event.target.value);
            if (addError) {
              setAddError('');
            }
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
                      <Popconfirm
                        title="체크리스트 항목을 삭제할까요?"
                        okText="삭제"
                        cancelText="취소"
                        onConfirm={() => void onDelete({ id: item.id, job_description_id: jobDescriptionId })}
                      >
                        <Button
                          aria-label={`${item.content} 삭제`}
                          danger
                          size="small"
                          disabled={deleting}
                          loading={deleting}
                        >
                          삭제
                        </Button>
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">등록된 체크리스트가 없습니다. 분석 요청 또는 직접 추가로 항목을 만들 수 있습니다.</p>
      )}
    </section>
  );
}
