import { useMemo, useState } from 'react';
import { useAppDataQuery } from './useAppDataQuery';

export function useCoverLetterPageData() {
  const { data, refetch } = useAppDataQuery();
  const jdList = useMemo(() => data?.jdList ?? [], [data?.jdList]);
  const resumes = useMemo(() => data?.resumes ?? [], [data?.resumes]);
  const coverRows = useMemo(() => data?.coverLetterRows ?? [], [data?.coverLetterRows]);
  const [selectedJdIdOverride, setSelectedJdId] = useState<string | null>(null);
  const jdIds = useMemo(() => jdList.map((item) => item.id), [jdList]);
  const selectedJdId =
    selectedJdIdOverride && jdIds.includes(selectedJdIdOverride) ? selectedJdIdOverride : jdList[0]?.id ?? null;

  return {
    coverRows,
    jdList,
    reloadData: refetch,
    resumes,
    selectedJdId,
    setSelectedJdId,
  };
}
