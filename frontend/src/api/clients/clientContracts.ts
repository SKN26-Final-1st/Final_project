import type {
  Account,
  AnalysisReport,
  AuthKey,
  CompanyInfo,
  InterviewQuestion,
  JobDescription,
  Resume,
} from '../../data/backendTypes';
import type { ChatMessage } from '../../data/appConfig';
import type { RequestOptions } from '../httpClient';

export type BackendChatMessage = {
  role: 'user' | 'agent';
  message: string;
};

export type JdChatState = {
  ignored_field?: string[];
  focus_field?: string;
  end_chat?: boolean;
} & Record<string, unknown>;

export type JdChatRequest = {
  jobDescriptionId: number;
  messages?: ChatMessage[];
  state?: JdChatState;
  apiKey?: string;
  signal?: AbortSignal;
};

export type RequestControlOptions = Pick<RequestOptions, 'authFailurePolicy' | 'signal'>;

export type DashboardPayload = {
  account: Account;
  company_info: CompanyInfo;
  job_descriptions: JobDescription[];
  resumes: Resume[];
  analysis_reports: AnalysisReport[];
  interview_questions: InterviewQuestion[];
};

export type SignupBody = {
  username: string;
  password: string;
  name: string;
  verification_question: string;
  verification_answer: string;
};

export type AccountModifyBody = Partial<Omit<Account, 'id' | 'username' | 'account_hash'>> & {
  delete?: boolean;
  formal_password?: string;
  password?: string;
} & Partial<Pick<Account, 'id' | 'username' | 'account_hash'>>;

export type AuthKeyAddBody = {
  name: string;
  description?: string;
  credit_limit?: number;
  authorized_resume?: number[];
};

export type AuthKeyModifyBody = Partial<Omit<AuthKey, 'value'>> & {
  id: number;
  delete?: boolean;
};

export type ChecklistAddBody = {
  job_description_id: number;
  content: string;
};

export type ChecklistModifyBody = {
  id: number;
  content: string;
};

export type GenerateJdChecklistOptions = {
  query?: string;
  cnt?: number;
};

export type CompanyInfoModifyBody = Partial<Omit<CompanyInfo, 'id'>>;

export type JobDescriptionAddBody = {
  job_name: string;
  education_level?: string;
  major?: string;
  career_level: string;
  required_skill: string[];
  preferred_skill?: string[];
  main_task?: string;
  hiring_reason?: string;
  work_type?: string;
  status?: JobDescription['status'];
};

export type JobDescriptionModifyBody = Partial<JobDescriptionAddBody> & {
  id: number;
  delete?: boolean;
  refresh_fail?: boolean;
};

export type ResumeAddBody = Partial<
  Pick<
    Resume,
    | 'name'
    | 'skill'
    | 'education_level'
    | 'experience'
    | 'self_intoduction'
    | 'certification'
    | 'language'
    | 'award'
    | 'training'
    | 'other_activity'
  >
> & {
  job_description_id: number;
};

export type ResumeModifyBody = Partial<Omit<ResumeAddBody, 'job_description_id'>> & {
  id: number;
  delete?: boolean;
};

export type ReportModifyBody = Partial<
  Omit<AnalysisReport, 'resume_id' | 'status' | 'created_at' | 'version' | 'interview_question'>
> & {
  id: number;
  delete?: boolean;
};

export type ResumeAnalysisPayload = {
  jd_id: string;
  resume_id: number;
  report: AnalysisReport;
  questions: InterviewQuestion[];
};
