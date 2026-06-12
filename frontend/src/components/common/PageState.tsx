import { Alert, Button, Card, Empty, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

type PageLoadingProps = {
  title?: string;
};

export function PageLoading({ title = '데이터를 불러오는 중입니다.' }: PageLoadingProps) {
  return (
    <Card>
      <Skeleton active paragraph={{ rows: 8 }} title={{ width: title.length * 12 }} />
    </Card>
  );
}

type PageErrorProps = {
  message: string;
  onRetry: () => void;
};

export function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <Alert
      showIcon
      type="error"
      message="목업 API 데이터를 불러오지 못했습니다."
      description={message}
      action={
        <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
          다시 시도
        </Button>
      }
    />
  );
}

type EmptyStateProps = {
  description: string;
};

export function EmptyState({ description }: EmptyStateProps) {
  return <Empty description={description} />;
}
