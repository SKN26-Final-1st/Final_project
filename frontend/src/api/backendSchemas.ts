import { z } from 'zod';
import type {
  Account,
  AnalysisReport,
  AuthKey,
  Checklist,
  CompanyInfo,
  InterviewQuestion,
  JobDescription,
  Resume,
} from '../data/backendTypes';

const unknownArraySchema = z.array(z.unknown());
const stringArraySchema = z.array(z.string());
const textFieldSchema = z.union([z.string(), stringArraySchema]).transform((value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('\n');
  }

  return value;
});

export const accountSchema = z.object({
  id: z.number(),
  username: z.string(),
  account_hash: z.string(),
  name: z.string(),
  verification_question: z.string(),
  verification_answer: z.string(),
  credit: z.number(),
  subscribe: z.boolean(),
  subscribe_expiration: z.string(),
}) satisfies z.ZodType<Account>;

export const companyInfoSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  employee_count: z.number(),
  team_composition: unknownArraySchema,
  company_description: z.string(),
  employ_style: unknownArraySchema,
}) satisfies z.ZodType<CompanyInfo>;

export const authKeySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  credit_limit: z.number(),
  value: z.string(),
  authorized_resume: z.array(z.number()),
}) satisfies z.ZodType<AuthKey>;

export const jobDescriptionSchema = z.object({
  id: z.number(),
  job_name: z.string(),
  education_level: z.string(),
  major: z.string(),
  career_level: z.string(),
  required_skill: unknownArraySchema,
  preferred_skill: unknownArraySchema,
  main_task: z.string(),
  hiring_reason: z.string(),
  work_type: z.string(),
  status: z.enum(['prepare', 'on_going', 'closed']),
  created_at: z.string(),
  updated_at: z.string(),
}) satisfies z.ZodType<JobDescription>;

export const checklistSchema = z.object({
  id: z.number(),
  job_description_id: z.number(),
  content: z.string(),
}) satisfies z.ZodType<Checklist>;

export const resumeSchema = z.object({
  id: z.number(),
  job_description_id: z.number(),
  name: z.string(),
  skill: unknownArraySchema,
  education_level: z.record(z.string(), z.unknown()),
  experience: unknownArraySchema,
  self_intoduction: unknownArraySchema,
  certification: unknownArraySchema,
  language: unknownArraySchema,
  award: unknownArraySchema,
  training: unknownArraySchema,
  other_activity: unknownArraySchema,
  status: z.enum(['onqueue', 'processing', 'done']),
  reviewed: z.boolean(),
  reviewed_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
}) satisfies z.ZodType<Resume>;

export const interviewQuestionSchema = z.object({
  id: z.number().optional(),
  resume_id: z.number().optional(),
  question: z.string(),
  answer: z.string(),
  purpose: z.string(),
}) satisfies z.ZodType<InterviewQuestion>;

export const analysisReportSchema = z.object({
  id: z.number(),
  resume_id: z.number(),
  overall_grade: z.string(),
  overall_summary: z.string(),
  candidate_summary: z.string(),
  checklist: unknownArraySchema,
  competency_analysis: stringArraySchema,
  fit_analysis: textFieldSchema,
  motive: textFieldSchema.default(''),
  collaboration: textFieldSchema.default(''),
  strength: stringArraySchema,
  concern: stringArraySchema,
  check_point: stringArraySchema,
  final_comment: z.string(),
  interview_question: z.array(interviewQuestionSchema).default([]),
}) satisfies z.ZodType<AnalysisReport>;

export const parseAccount = (value: unknown) => accountSchema.parse(value);
export const parseCompanyInfo = (value: unknown) => companyInfoSchema.parse(value);
export const parseAuthKey = (value: unknown) => authKeySchema.parse(value);
export const parseAuthKeys = (value: unknown) => z.array(authKeySchema).parse(value);
export const parseChecklists = (value: unknown) => z.array(checklistSchema).parse(value);
export const parseJobDescription = (value: unknown) => jobDescriptionSchema.parse(value);
export const parseJobDescriptions = (value: unknown) => z.array(jobDescriptionSchema).parse(value);
export const parseResume = (value: unknown) => resumeSchema.parse(value);
export const parseResumes = (value: unknown) => z.array(resumeSchema).parse(value);
export const parseAnalysisReport = (value: unknown) => analysisReportSchema.parse(value);
export const parseAnalysisReports = (value: unknown) => z.array(analysisReportSchema).parse(value);
export const parseInterviewQuestion = (value: unknown) => interviewQuestionSchema.parse(value);
export const parseInterviewQuestions = (value: unknown) => z.array(interviewQuestionSchema).parse(value);
