import { Alert, Button, Space, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import type { AuthKey } from '../../data/backendTypes';

type CreatedAuthKeyPanelProps = {
  authKey: Pick<AuthKey, 'name' | 'value'>;
  onCopy: () => void;
  onClose: () => void;
};

export function CreatedAuthKeyPanel({ authKey, onCopy, onClose }: CreatedAuthKeyPanelProps) {
  return (
    <Alert
      showIcon
      className="created-authkey-panel"
      type="success"
      message="새 API key가 발급되었습니다."
      description={
        <div className="created-authkey-content">
          <span>이 키는 지금만 원문으로 복사할 수 있습니다. 페이지를 새로고침하거나 이동하면 다시 표시되지 않습니다.</span>
          <Typography.Text code className="created-authkey-value">
            {authKey.value}
          </Typography.Text>
        </div>
      }
      action={
        <Space wrap>
          <Button size="small" icon={<CopyOutlined />} onClick={onCopy}>
            복사
          </Button>
          <Button size="small" onClick={onClose}>
            확인
          </Button>
        </Space>
      }
    />
  );
}
