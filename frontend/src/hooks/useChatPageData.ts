import { useAppDataQuery } from './useAppDataQuery';

export function useChatPageData() {
  const { data } = useAppDataQuery();

  return {
    analysisReport: data?.analysisReport,
    analysisReports: data?.analysisReports ?? [],
    interviewQuestions: data?.interviewQuestions ?? [],
    jdList: data?.jdList ?? [],
    resumes: data?.resumes ?? [],
  };
}
