import { useMemo, useState } from 'react';
import { useAppDataQuery } from './useAppDataQuery';

export function useCoverLetterPageData() {
  const { data, refetch } = useAppDataQuery();
  const jdList = useMemo(() => data?.jdList ?? [], [data?.jdList]);
  const resumes = useMemo(() => data?.resumes ?? [], [data?.resumes]);
  const coverRows = useMemo(() => data?.coverLetterRows ?? [], [data?.coverLetterRows]);
  const userProfile = data?.userProfile ?? null;
  const [selectedJdIdOverride, setSelectedJdId] = useState<string | null>(null);
  const [selectedResumeIdOverride, setSelectedResumeId] = useState<string | null>(null);
  const jdIds = useMemo(() => jdList.map((item) => item.id), [jdList]);
  const resumeIds = useMemo(() => resumes.map((item) => String(item.id)), [resumes]);
  const selectedResumeId =
    selectedResumeIdOverride && resumeIds.includes(selectedResumeIdOverride)
      ? selectedResumeIdOverride
      : resumes[0]
        ? String(resumes[0].id)
        : null;
  const selectedJdId =
    selectedJdIdOverride && jdIds.includes(selectedJdIdOverride) ? selectedJdIdOverride : jdList[0]?.id ?? null;

  return {
    coverRows,
    jdList,
    reloadData: refetch,
    resumes,
    selectedJdId,
    selectedResumeId,
    setSelectedJdId,
    setSelectedResumeId,
    userProfile,
  };
}
