import { useMemo } from 'react';
import type { JdItem } from '../api/adapters';
import { compareRecent, includesSearchText } from '../utils/searchText';

export function useJdFilters(jdList: JdItem[], searchText: string) {
  return useMemo(() => {
    const filtered = jdList.filter((item) => includesSearchText(
      [
        item.title, item.summary, item.stack.join(' '), item.preferredStack.join(' '),
        item.employmentType, item.status, item.statusCode, item.requiredExperience,
        item.educationLevel, item.major, item.hiringReason,
      ],
      searchText,
    ));
    return [...filtered].sort((left, right) => compareRecent(left.updatedAt, right.updatedAt));
  }, [jdList, searchText]);
}
