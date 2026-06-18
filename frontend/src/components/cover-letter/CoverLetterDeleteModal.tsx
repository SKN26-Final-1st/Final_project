import { Button, Modal } from 'antd';
import type { CoverLetterRow } from '../../api/adapters';

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
    <Modal
      centered
      className="jd-delete-modal"
      destroyOnHidden
      footer={
        <div className="jd-delete-modal-footer">
          <Button disabled={deleting} onClick={onCancel}>
            취소
          </Button>
          <Button danger loading={deleting} type="primary" onClick={onConfirm}>
            삭제
          </Button>
        </div>
      }
      getContainer={() => document.querySelector('.app-root') ?? document.body}
      open={Boolean(targetResume)}
      title="자소서를 삭제하시겠습니까?"
      onCancel={onCancel}
    >
      <p className="jd-delete-modal-copy">
        삭제한 자소서는 복구할 수 없습니다. 연결된 분석 결과가 있다면 함께 영향을 받을 수 있습니다.
      </p>
      {targetResume ? (
        <div className="jd-delete-target">
          <strong>{targetResume.applicant}</strong>
          <span>{targetResume.jd}</span>
        </div>
      ) : null}
    </Modal>
  );
}
