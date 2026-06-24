import type { AuthKey } from '../../data/backendTypes';
import { DestructiveConfirmModal } from '../common/DestructiveConfirmModal';
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
    <DestructiveConfirmModal
      className="authkey-delete-modal"
      confirmLabel="삭제"
      footerClassName="authkey-delete-modal-footer"
      loading={loading}
      open={open}
      target={
        authKey
          ? {
              title: authKey.name,
              description: '삭제 대상 API key',
              extra: <code className="authkey-delete-value">{maskedValue}</code>,
              ariaLabel: '삭제할 API key',
            }
          : null
      }
      title="API key를 삭제하시겠습니까?"
      warning={{
        title: '공유 접근 권한이 즉시 중단됩니다.',
        description: '삭제한 API key는 복구할 수 없습니다.',
      }}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
