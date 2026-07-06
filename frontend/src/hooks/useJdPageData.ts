import { useMemo, useState } from 'react';
import { useAppDataQuery } from './useAppDataQuery';

export function useJdPageData() {
  const { data, refetch } = useAppDataQuery();
  const jdList = useMemo(() => data?.jdList ?? [], [data?.jdList]);
  const resumes = useMemo(() => data?.resumes ?? [], [data?.resumes]);
  const userProfile = data?.userProfile ?? null;
  const [selectedJdIdOverride, setSelectedJdId] = useState<string | null>(null);
  const jdIds = useMemo(() => jdList.map((item) => item.id), [jdList]);
  const selectedJdId =
    selectedJdIdOverride && jdIds.includes(selectedJdIdOverride) ? selectedJdIdOverride : jdList[0]?.id ?? null;
  const selectedJd = jdList.find((item) => item.id === selectedJdId) ?? jdList[0] ?? null;

  return {
    jdList,
    reloadData: refetch,
    resumes,
    selectedJd,
    selectedJdId,
    setSelectedJdId,
    userProfile,
  };
}
