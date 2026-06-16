import {
  mapAnalysisReport,
  mapAdmin,
  mapCompany,
  mapCoverLetterDraft,
  mapCoverLetterRows,
  mapDashboard,
  mapJdList,
  mapRecruitmentPreview,
  mapTemplateQuestions,
  mapUserProfile,
  type AnalysisReportData,
  type AdminData,
  type CompanyProfile,
  type CoverLetterDraft,
  type CoverLetterRow,
  type DashboardData,
  type DashboardSource,
  type JdItem,
  type RecruitmentPreview,
  type TemplateQuestion,
  type UserProfile,
} from './adapters';
import { apiClient } from './backendClient';
import type { AnalysisReport, AuthKey, InterviewQuestion, Resume } from '../data/backendTypes';

export type AppData = {
  admin: AdminData;
  dashboard: DashboardData;
  company: CompanyProfile;
  jdList: JdItem[];
  coverLetterDraft: CoverLetterDraft;
  coverLetterRows: CoverLetterRow[];
  analysisReport: AnalysisReportData;
  recruitmentPreview: RecruitmentPreview;
  templateQuestions: TemplateQuestion[];
  userProfile: UserProfile;
  authKeys: AuthKey[];
  resumes: Resume[];
  analysisReports: AnalysisReport[];
  interviewQuestions: InterviewQuestion[];
};

export async function loadAppData(): Promise<AppData> {
  const [dashboard, authKeys] = await Promise.all([
    apiClient.getDashboard(),
    apiClient.getAuthKeys().catch(() => ({ data: [] as AuthKey[] })),
  ]);
  const dashboardSource = dashboard.data;
  const account = dashboardSource.account;
  const company = dashboardSource.company_info;
  const jobDescriptions = dashboardSource.job_descriptions;
  const resumes = dashboardSource.resumes;
  const analysisReports = dashboardSource.analysis_reports;
  const interviewQuestions = dashboardSource.interview_questions;
  const normalizedDashboard: DashboardSource = {
    account,
    company_info: company,
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports,
    interview_questions: interviewQuestions,
  };
  const firstJob = jobDescriptions[0];
  const recruitmentPreview = mapRecruitmentPreview(company, firstJob);

  return {
    admin: mapAdmin(normalizedDashboard),
    dashboard: mapDashboard(normalizedDashboard),
    company: mapCompany(company),
    jdList: mapJdList(jobDescriptions, resumes, analysisReports),
    coverLetterDraft: mapCoverLetterDraft(resumes[0]),
    coverLetterRows: mapCoverLetterRows(resumes, jobDescriptions, analysisReports),
    analysisReport: mapAnalysisReport(analysisReports[0], resumes, jobDescriptions, interviewQuestions),
    recruitmentPreview,
    templateQuestions: mapTemplateQuestions(interviewQuestions),
    userProfile: mapUserProfile(account, company),
    authKeys: authKeys.data,
    resumes,
    analysisReports,
    interviewQuestions,
  };
}
