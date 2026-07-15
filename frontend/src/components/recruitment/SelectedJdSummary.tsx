import type { Key } from 'react';
import { Space, Tag } from 'antd';
import { EmptyState } from '../common/PageState';
import type { JdItem } from '../../api/adapters';

type SelectedJdSummaryProps = {
  jdList: JdItem[];
  selectedRows: Key[];
};

export function SelectedJdSummary({ jdList, selectedRows }: SelectedJdSummaryProps) {
  const selectedItems = jdList.filter((item) => selectedRows.includes(item.id));

  if (!selectedItems.length) {
    return <EmptyState description="선택된 JD가 없습니다." />;
  }

  return (
    <Space className="selected-jd-summary" wrap>
      {selectedItems.map((item) => (
        <Tag className="large-tag" key={item.id}>
          {item.title}
        </Tag>
      ))}
    </Space>
  );
}
