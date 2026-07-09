// Types mirrored from the current Django API response contract.
export type ApiResponse<T> = {
  error: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    page_size?: number;
    total_count?: number;
    requested_at: string;
  };
};

export type DateTimeString = string;

export type JobDescriptionStatus = 'prepare' | 'on_going' | 'closed';

export type JobDescriptionChecklistStatus = 'onqueue' | 'processing' | 'done' | 'fail';

export type AnalysisReportStatus = 'onqueue' | 'processing' | 'done' | 'fail';

export type StatusCode =
  | JobDescriptionStatus
  | AnalysisReportStatus
  | 'reviewed'
  | 'needs_review'
  | 'subscribe_active'
  | 'subscribe_expired'
  | 'grade_a'
  | 'grade_b'
  | 'grade_c'
  | 'grade_d'
  | 'grade_f'
  | 'normal';

export type Account = {
  id: number;
  username: string;
  account_hash: string;
  name: string;
  verification_question: string;
  verification_answer: string;
  credit: number;
  subscribe: boolean;
  subscribe_expiration: DateTimeString;
};

export type AuthKey = {
  id: number;
  name: string;
  description: string;
  credit_limit: number;
  value: string;
  authorized_resume: number[];
};

export type CompanyInfo = {
  id: number;
  company_name: string;
  employee_count: number;
  team_composition: unknown[];
  company_description: string;
  employ_style: unknown[];
};

export type JobDescription = {
  id: number;
  job_name: string;
  education_level: string;
  major: string;
  career_level: string;
  required_skill: unknown[];
  preferred_skill: unknown[];
  main_task: string;
  hiring_reason: string;
  work_type: string;
  status: JobDescriptionStatus;
  checklist_status: JobDescriptionChecklistStatus;
  created_at: DateTimeString;
  updated_at: DateTimeString;
};

export type Checklist = {
  id: number;
  job_description_id: number;
  content: string;
};

export type Resume = {
  id: number;
  job_description_id: number;
  name: string;
  skill: unknown[];
  education_level: Record<string, unknown>;
  experience: unknown[];
  self_intoduction: unknown[];
  certification: unknown[];
  language: unknown[];
  award: unknown[];
  training: unknown[];
  other_activity: unknown[];
  reviewed: boolean;
  reviewed_at: DateTimeString;
  created_at: DateTimeString;
  updated_at: DateTimeString;
};

export type AnalysisReport = {
  id: number;
  resume_id: number;
  overall_grade: string;
  overall_summary: string;
  candidate_summary: string;
  checklist: unknown[];
  competency_analysis: string[];
  fit_analysis: string;
  motive: string;
  collaboration: string;
  strength: string[];
  concern: string[];
  check_point: string[];
  final_comment: string;
  review_text?: string | null;
  interview_question: InterviewQuestion[];
  status: AnalysisReportStatus;
  created_at: DateTimeString;
  version?: string | null;
  user_feedback?: number | null;
};

export type InterviewQuestion = {
  id?: number;
  resume_id?: number;
  question: string;
  answer: string;
  purpose: string;
};
