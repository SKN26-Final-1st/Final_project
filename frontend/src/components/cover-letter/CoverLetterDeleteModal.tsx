import type { CoverLetterRow } from '../../api/adapters';
import { DestructiveConfirmModal } from '../common/DestructiveConfirmModal';

type CoverLetterDeleteModalProps = {
  targetResume: CoverLetterRow | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CoverLetterDeleteModal({
  targetResume,
  deleting,
  onCancel,
  onConfirm,
}: CoverLetterDeleteModalProps) {
  return (
    <DestructiveConfirmModal
      className="jd-delete-modal cover-letter-delete-modal"
      confirmLabel="삭제"
      description="삭제한 자소서는 복구할 수 없습니다. 연결된 분석 결과가 있다면 함께 영향을 받을 수 있습니다."
      footerClassName="jd-delete-modal-footer"
      loading={deleting}
      open={Boolean(targetResume)}
      target={
        targetResume
          ? {
              title: targetResume.applicant,
              description: targetResume.jd,
              ariaLabel: '삭제할 자소서',
            }
          : null
      }
      title="자소서를 삭제하시겠습니까?"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
