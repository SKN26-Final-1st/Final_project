import { Alert } from 'antd';
import type { AlertState } from '../../types/app';

type FloatingAlertProps = {
  alert: AlertState | null;
  onClose: () => void;
};

export function FloatingAlert({ alert, onClose }: FloatingAlertProps) {
  if (!alert) {
    return null;
  }

  return (
    <div className="floating-alert">
      <Alert
        showIcon
        closable
        type={alert.type}
        title={alert.message}
        description={alert.description}
        onClose={onClose}
      />
    </div>
  );
}
