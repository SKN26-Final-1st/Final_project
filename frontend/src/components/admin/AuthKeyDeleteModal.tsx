import { Button, Modal, Typography } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { AuthKey } from '../../data/backendTypes';
import { maskAuthKeyValue } from './authKeyUtils';

type AuthKeyDeleteModalProps = {
  authKey: AuthKey | null;
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AuthKeyDeleteModal({ authKey, open, loading, onCancel, onConfirm }: AuthKeyDeleteModalProps) {
  const maskedValue = authKey ? maskAuthKeyValue(authKey.value) : '';

  return (
    <Modal
      title="API key를 삭제하시겠습니까?"
      open={open}
      width={420}
      className="authkey-delete-modal"
      onCancel={loading ? undefined : onCancel}
      closable={!loading}
      mask={{ closable: !loading }}
      destroyOnHidden
      getContainer={() => document.querySelector('.app-root') ?? document.body}
      footer={
        <div className="authkey-delete-modal-footer">
          <Button onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button
            aria-label="삭제"
            danger
            type="primary"
            icon={<DeleteOutlined />}
            loading={loading}
            onClick={onConfirm}
          >
            삭제
          </Button>
        </div>
      }
    >
      <div className="authkey-delete-modal-content">
        <div className="authkey-delete-warning">
          <ExclamationCircleOutlined aria-hidden />
          <div>
            <strong>공유 접근 권한이 즉시 중단됩니다.</strong>
            <p>삭제한 API key는 복구할 수 없습니다.</p>
          </div>
        </div>

        {authKey && (
          <div className="authkey-delete-target" aria-label="삭제할 API key">
            <Typography.Text type="secondary">삭제 대상</Typography.Text>
            <strong>{authKey.name}</strong>
            <Typography.Text code className="authkey-delete-value">
              {maskedValue}
            </Typography.Text>
          </div>
        )}
      </div>
    </Modal>
  );
}
