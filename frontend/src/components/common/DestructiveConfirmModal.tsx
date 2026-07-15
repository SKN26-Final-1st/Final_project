import type { ReactNode } from 'react';
import { Button, Modal } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

type DestructiveConfirmTarget = {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  ariaLabel?: string;
};

type DestructiveConfirmWarning = {
  title: ReactNode;
  description?: ReactNode;
};

type DestructiveConfirmModalProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  target?: DestructiveConfirmTarget | null;
  warning?: DestructiveConfirmWarning;
  loading: boolean;
  className?: string;
  footerClassName?: string;
  width?: number;
  cancelLabel?: ReactNode;
  confirmLabel?: ReactNode;
  confirmAriaLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DestructiveConfirmModal({
  open,
  title,
  description,
  target,
  warning,
  loading,
  className,
  footerClassName,
  width = 420,
  cancelLabel = '취소',
  confirmLabel = '삭제',
  confirmAriaLabel = '삭제',
  onCancel,
  onConfirm,
}: DestructiveConfirmModalProps) {
  return (
    <Modal
      centered
      className={['destructive-confirm-modal', className].filter(Boolean).join(' ')}
      closable={!loading}
      destroyOnHidden
      footer={
        <div className={['destructive-confirm-modal-footer', footerClassName].filter(Boolean).join(' ')}>
          <Button disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            aria-label={confirmAriaLabel}
            danger
            icon={<DeleteOutlined />}
            loading={loading}
            type="primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
      getContainer={() => document.querySelector('.app-root') ?? document.body}
      mask={{ closable: !loading }}
      open={open}
      title={title}
      width={width}
      onCancel={loading ? undefined : onCancel}
    >
      <div className="destructive-confirm-modal-content">
        {warning ? (
          <div className="destructive-confirm-warning">
            <ExclamationCircleOutlined aria-hidden />
            <div>
              <strong>{warning.title}</strong>
              {warning.description ? <p>{warning.description}</p> : null}
            </div>
          </div>
        ) : null}

        {description ? <p className="destructive-confirm-modal-copy">{description}</p> : null}

        {target ? (
          <div className="destructive-confirm-target" aria-label={target.ariaLabel}>
            <strong>{target.title}</strong>
            {target.description ? <span>{target.description}</span> : null}
            {target.extra}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
