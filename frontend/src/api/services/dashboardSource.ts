import type { Account, CompanyInfo } from '../../data/backendTypes';
import { getAccountRaw } from '../clients/authAccountClient';
import { getApiKeyCreditRaw, getCompanyInfoRaw } from '../clients/companyAuthKeyClient';
import { getReportsQuestions, toApiResponse } from '../clients/clientCore';
import type { DashboardPayload, RequestControlOptions } from '../clients/clientContracts';
import { getJobDescriptionsRaw } from '../clients/jdChecklistClient';
import { getReportsForResumeRaw, getResumesForJobRaw } from '../clients/resumeReportClient';

async function getDashboardData(options: RequestControlOptions = {}): Promise<DashboardPayload> {
  const [account, companyInfo, jobDescriptions] = await Promise.all([
    getAccountRaw(options),
    getCompanyInfoRaw(options),
    getJobDescriptionsRaw(undefined, options),
  ]);
  const resumes = (await Promise.all(jobDescriptions.map((job) => getResumesForJobRaw(job.id, undefined, options)))).flat();
  const analysisReports = (
    await Promise.all(resumes.map((resume) => getReportsForResumeRaw(resume.id, undefined, options)))
  ).flat();

  return {
    account,
    company_info: companyInfo,
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports,
    interview_questions: getReportsQuestions(analysisReports),
  };
}

function buildApiKeyAccount(credit: number): Account {
  return {
    id: 0,
    username: 'api-key-user',
    name: 'API Key 사용자',
    verification_question: '',
    credit,
    subscribe: false,
    subscribe_expiration: '',
  };
}

function buildApiKeyCompanyInfo(): CompanyInfo {
  return {
    id: 0,
    company_name: 'API Key Workspace',
    employee_count: 0,
    team_composition: [],
    company_description: 'API Key로 허용된 JD와 지원서를 조회합니다.',
    employ_style: [],
  };
}

async function getApiKeyDashboardData(apiKey: string, options: RequestControlOptions = {}): Promise<DashboardPayload> {
  const [jobDescriptions, creditData] = await Promise.all([
    getJobDescriptionsRaw(apiKey, options),
    getApiKeyCreditRaw(apiKey, options),
  ]);
  const resumes = (await Promise.all(jobDescriptions.map((job) => getResumesForJobRaw(job.id, apiKey, options)))).flat();
  const analysisReports = (
    await Promise.all(resumes.map((resume) => getReportsForResumeRaw(resume.id, apiKey, options)))
  ).flat();

  return {
    account: buildApiKeyAccount(creditData.credit),
    company_info: buildApiKeyCompanyInfo(),
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports,
    interview_questions: getReportsQuestions(analysisReports),
  };
}

export const dashboardSourceClient = {
  getDashboard: async (options: RequestControlOptions = {}) =>
    toApiResponse('대시보드 데이터를 불러왔습니다.', await getDashboardData(options)),

  getApiKeyDashboard: async (apiKey: string, options: RequestControlOptions = {}) =>
    toApiResponse('API Key 접근 데이터를 불러왔습니다.', await getApiKeyDashboardData(apiKey, options)),

  loginWithApiKey: async (apiKey: string) => {
    try {
      await getApiKeyDashboardData(apiKey, { authFailurePolicy: 'local' });
    } catch {
      throw new Error('API Key가 유효하지 않거나 접근 권한이 없습니다.');
    }
    return toApiResponse('API Key로 로그인했습니다.', { authenticated: true });
  },
};
