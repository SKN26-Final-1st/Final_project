import { Button, Modal } from 'antd';
import type { JdItem } from '../../api/adapters';

type JdDeleteModalProps = {
  targetJd: JdItem | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function JdDeleteModal({ targetJd, deleting, onCancel, onConfirm }: JdDeleteModalProps) {
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
      open={Boolean(targetJd)}
      title="JD를 삭제하시겠습니까?"
      onCancel={onCancel}
    >
      <p className="jd-delete-modal-copy">
        삭제한 JD는 복구할 수 없습니다. 연결된 지원자 데이터가 있다면 함께 영향을 받을 수 있습니다.
      </p>
      {targetJd ? (
        <div className="jd-delete-target">
          <strong>{targetJd.title}</strong>
          <span>{targetJd.team}</span>
        </div>
      ) : null}
    </Modal>
  );
}
