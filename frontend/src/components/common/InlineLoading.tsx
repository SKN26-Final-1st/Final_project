import { Spin } from 'antd';

export function InlineLoading({ label }: { label: string }) {
  return (
    <span className="inline-loading">
      <Spin size="small" />
      {label}
    </span>
  );
}
