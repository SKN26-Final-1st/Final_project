import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { JdItem } from '../api/adapters';
import type { AnalysisReport, InterviewQuestion, Resume } from '../data/backendTypes';
import { useAppDataQuery } from './useAppDataQuery';

export type AnalysisReportItem = {
  report: AnalysisReport;
  resume: Resume | null;
  jd: JdItem | null;
  questions: InterviewQuestion[];
};

export type AnalysisReportTreeItem = {
  resume: Resume | null;
  jd: JdItem | null;
  reports: AnalysisReportItem[];
};

function compareReportRecent(left: AnalysisReportItem, right: AnalysisReportItem) {
  const leftTime = left.report.created_at ? new Date(left.report.created_at).getTime() : 0;
  const rightTime = right.report.created_at ? new Date(right.report.created_at).getTime() : 0;
  const normalizedLeft = Number.isNaN(leftTime) ? 0 : leftTime;
  const normalizedRight = Number.isNaN(rightTime) ? 0 : rightTime;

  if (normalizedRight !== normalizedLeft) {
    return normalizedRight - normalizedLeft;
  }

  return right.report.id - left.report.id;
}

export function useAnalysisReportPageData() {
  const { data, isFetching, refetch } = useAppDataQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const reports = useMemo(() => data?.analysisReports ?? [], [data?.analysisReports]);
  const resumes = useMemo(() => data?.resumes ?? [], [data?.resumes]);
  const jdList = useMemo(() => data?.jdList ?? [], [data?.jdList]);
  const requestedReportId = searchParams.get('reportId');
  const legacyResumeId = searchParams.get('resumeId');
  const reportItems = useMemo<AnalysisReportItem[]>(
    () =>
      reports.map((report) => {
        const resume = resumes.find((item) => item.id === report.resume_id) ?? null;
        const jd = resume ? jdList.find((item) => Number(item.id) === resume.job_description_id) ?? null : null;

        return {
          report,
          resume,
          jd,
          questions: report.interview_question.map((question, index) => ({
            ...question,
            id: question.id ?? index + 1,
            resume_id: question.resume_id ?? report.resume_id,
          })),
        };
      }),
    [jdList, reports, resumes],
  );
  const sortedReportItems = useMemo(() => [...reportItems].sort(compareReportRecent), [reportItems]);
  const reportTreeItems = useMemo<AnalysisReportTreeItem[]>(() => {
    const itemsByResumeId = new Map<number, AnalysisReportItem[]>();

    sortedReportItems.forEach((item) => {
      const nextItems = itemsByResumeId.get(item.report.resume_id) ?? [];
      nextItems.push(item);
      itemsByResumeId.set(item.report.resume_id, nextItems);
    });

    const resumeGroups = resumes.map((resume) => {
      const jd = jdList.find((item) => Number(item.id) === resume.job_description_id) ?? null;

      return {
        resume,
        jd,
        reports: itemsByResumeId.get(resume.id) ?? [],
      };
    });
    const orphanGroups = Array.from(itemsByResumeId.entries())
      .filter(([resumeId]) => !resumes.some((resume) => resume.id === resumeId))
      .map(([, groupedReports]) => ({
        resume: groupedReports[0]?.resume ?? null,
        jd: groupedReports[0]?.jd ?? null,
        reports: groupedReports,
      }));

    return [...resumeGroups, ...orphanGroups].filter((item) => item.reports.length > 0);
  }, [jdList, resumes, sortedReportItems]);
  const legacySelectedItem = legacyResumeId
    ? sortedReportItems.find((item) => String(item.report.resume_id) === legacyResumeId)
    : null;
  const selectedItem =
    sortedReportItems.find((item) => String(item.report.id) === requestedReportId) ??
    legacySelectedItem ??
    sortedReportItems[0] ??
    null;
  const selectedReportId = selectedItem ? String(selectedItem.report.id) : null;
  const selectedReportResumeId = selectedItem ? String(selectedItem.report.resume_id) : null;
  const setSelectedReportId = useCallback((id: string) => {
    setSearchParams({ reportId: id });
  }, [setSearchParams]);
  const setSelectedReportResumeId = useCallback((id: string) => {
    const nextItem = sortedReportItems.find((item) => String(item.report.resume_id) === id);

    if (nextItem) {
      setSelectedReportId(String(nextItem.report.id));
      return;
    }

    setSearchParams({ resumeId: id });
  }, [setSearchParams, setSelectedReportId, sortedReportItems]);

  return {
    reportItems,
    reportTreeItems,
    reloadData: refetch,
    selectedItem,
    selectedReportId,
    selectedReportResumeId,
    setSelectedReportId,
    setSelectedReportResumeId,
    refreshing: isFetching,
  };
}
