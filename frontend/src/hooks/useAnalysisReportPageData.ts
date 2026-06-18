import { useMemo } from 'react';
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

export function useAnalysisReportPageData() {
  const { data } = useAppDataQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const reports = useMemo(() => data?.analysisReports ?? [], [data?.analysisReports]);
  const questions = useMemo(() => data?.interviewQuestions ?? [], [data?.interviewQuestions]);
  const resumes = useMemo(() => data?.resumes ?? [], [data?.resumes]);
  const jdList = useMemo(() => data?.jdList ?? [], [data?.jdList]);
  const selectedReportResumeId = searchParams.get('resumeId');
  const reportItems = useMemo<AnalysisReportItem[]>(
    () =>
      reports.map((report) => {
        const resume = resumes.find((item) => item.id === report.resume_id) ?? null;
        const jd = resume ? jdList.find((item) => Number(item.id) === resume.job_description_id) ?? null : null;

        return {
          report,
          resume,
          jd,
          questions: questions.filter((item) => item.resume_id === report.resume_id),
        };
      }),
    [jdList, questions, reports, resumes],
  );
  const selectedItem =
    reportItems.find((item) => String(item.report.resume_id) === selectedReportResumeId) ?? reportItems[0] ?? null;
  const setSelectedReportResumeId = (id: string) => {
    setSearchParams({ resumeId: id });
  };

  return {
    reportItems,
    selectedItem,
    selectedReportResumeId,
    setSelectedReportResumeId,
  };
}
