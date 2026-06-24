import type { JdItem } from '../../api/adapters';
import { DestructiveConfirmModal } from '../common/DestructiveConfirmModal';

type JdDeleteModalProps = {
  targetJd: JdItem | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function JdDeleteModal({ targetJd, deleting, onCancel, onConfirm }: JdDeleteModalProps) {
  return (
    <DestructiveConfirmModal
      className="jd-delete-modal"
      confirmLabel="삭제"
      description="삭제한 JD는 복구할 수 없습니다. 연결된 지원자 데이터가 있다면 함께 영향을 받을 수 있습니다."
      footerClassName="jd-delete-modal-footer"
      loading={deleting}
      open={Boolean(targetJd)}
      target={
        targetJd
          ? {
              title: targetJd.title,
              description: targetJd.team,
              ariaLabel: '삭제할 JD',
            }
          : null
      }
      title="JD를 삭제하시겠습니까?"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
