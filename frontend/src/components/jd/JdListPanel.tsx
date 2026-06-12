import { Tag } from 'antd';
import type { JdItem } from '../../api/adapters';
import { statusTag } from '../../utils/statusTag';

type JdListPanelProps = {
  jdList: JdItem[];
  selectedJdId: string | null;
  setSelectedJdId: (id: string) => void;
};

export function JdListPanel({ jdList, selectedJdId, setSelectedJdId }: JdListPanelProps) {
  return (
    <div className="jd-list">
      {jdList.map((item) => (
        <button
          className={`jd-card ${selectedJdId === item.id ? 'active' : ''}`}
          key={item.id}
          onClick={() => setSelectedJdId(item.id)}
        >
          <strong>{item.title}</strong>
          <span>{item.team}</span>
          <div>
            {statusTag(item.status, item.statusCode)}
            <Tag color="blue">평균 {item.fit}점</Tag>
          </div>
        </button>
      ))}
    </div>
  );
}
