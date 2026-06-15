import { Button, Tag, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { JdItem } from '../../api/adapters';
import { statusTag } from '../../utils/statusTag';

type JdListPanelProps = {
  jdList: JdItem[];
  selectedJdId: string | null;
  setSelectedJdId: (id: string) => void;
  onDeleteJd: (id: string) => void;
};

export function JdListPanel({ jdList, selectedJdId, setSelectedJdId, onDeleteJd }: JdListPanelProps) {
  return (
    <div className="jd-list">
      {jdList.map((item) => (
        <div
          role="button"
          tabIndex={0}
          className={`jd-card ${selectedJdId === item.id ? 'active' : ''}`}
          key={item.id}
          onClick={() => setSelectedJdId(item.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setSelectedJdId(item.id);
            }
          }}
        >
          <Tooltip title="JD 삭제">
            <Button
              aria-label={`${item.title} 삭제`}
              className="jd-card-delete-button"
              icon={<CloseOutlined />}
              size="small"
              type="text"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteJd(item.id);
              }}
            />
          </Tooltip>
          <strong>{item.title}</strong>
          <span>{item.team}</span>
          <div className="jd-card-meta">
            {statusTag(item.status, item.statusCode)}
            <Tag color="blue">평균 {item.fit}점</Tag>
          </div>
        </div>
      ))}
    </div>
  );
}
