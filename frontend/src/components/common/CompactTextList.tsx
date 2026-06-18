import { useState } from 'react';
import { Button } from 'antd';
import { toTrimmedStringList } from '../../utils/stringList';

type CompactTextListProps = {
  emptyText: string;
  items: string[];
  summaryLimit?: number;
};

export function CompactTextList({ emptyText, items, summaryLimit = 2 }: CompactTextListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedItems = toTrimmedStringList(items);

  if (!normalizedItems.length) {
    return <p className="muted">{emptyText}</p>;
  }

  const visibleItems = isExpanded ? normalizedItems : normalizedItems.slice(0, summaryLimit);
  const hiddenCount = Math.max(normalizedItems.length - visibleItems.length, 0);

  return (
    <div className="compact-text-list">
      <ul className="analysis-report-text-list compact-text-list-items">
        {visibleItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
      {normalizedItems.length > summaryLimit ? (
        <Button
          className="compact-text-list-toggle"
          size="small"
          type="link"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? '접기' : `전체 보기 (+${hiddenCount})`}
        </Button>
      ) : null}
    </div>
  );
}
