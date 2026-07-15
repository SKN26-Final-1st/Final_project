import type { Key } from 'react';
import { Table, Tag } from 'antd';
import type { JdItem } from '../../api/adapters';
import type { KeySetter } from '../../types/app';
import { statusTag } from '../../utils/statusTag';

type JdSelectionPanelProps = {
  jdList: JdItem[];
  selectedRows: Key[];
  setSelectedRows: KeySetter;
};

export function JdSelectionPanel({ jdList, selectedRows, setSelectedRows }: JdSelectionPanelProps) {
  const toggleSelectedRow = (id: string) => {
    setSelectedRows((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  };

  return (
    <>
      <div className="desktop-table-wrap">
        <Table
          rowKey="id"
          pagination={false}
          scroll={{ x: 560 }}
          dataSource={jdList}
          rowSelection={{
            selectedRowKeys: selectedRows,
            onChange: (keys) => setSelectedRows(keys),
          }}
          columns={[
            { title: 'JD', dataIndex: 'title', ellipsis: true },
            { title: '요건', dataIndex: 'team', ellipsis: true },
            {
              title: '상태',
              dataIndex: 'status',
              width: 112,
              render: (_value: string, record) => statusTag(record.status, record.statusCode),
            },
            { title: '평균 점수', dataIndex: 'fit', width: 96, render: (value: number) => `${value}점` },
          ]}
        />
      </div>
      <div className="mobile-selection-list">
        {jdList.map((item) => {
          const selected = selectedRows.includes(item.id);

          return (
            <button
              aria-pressed={selected}
              className={`selection-card ${selected ? 'active' : ''}`}
              key={item.id}
              onClick={() => toggleSelectedRow(item.id)}
              type="button"
            >
              <span className="selection-check">{selected ? '선택됨' : '선택'}</span>
              <strong>{item.title}</strong>
              <span>{item.team}</span>
              <div>
                {statusTag(item.status, item.statusCode)}
                <Tag color="blue">평균 {item.fit}점</Tag>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
