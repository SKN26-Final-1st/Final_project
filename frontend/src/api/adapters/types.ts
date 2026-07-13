import type { Account, AnalysisReport, CompanyInfo, InterviewQuestion, JobDescription, Resume } from '../../data/backendTypes';

export type DashboardSource = {
  account: Account;
  company_info: CompanyInfo;
  job_descriptions: JobDescription[];
  resumes: Resume[];
  analysis_reports: AnalysisReport[];
  interview_questions: InterviewQuestion[];
};
