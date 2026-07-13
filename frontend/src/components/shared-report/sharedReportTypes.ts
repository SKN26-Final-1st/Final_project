import type { AnalysisReport, InterviewQuestion, JobDescription, Resume } from '../../data/backendTypes';

export type SharedBundle = {
  resume: Resume;
  jobDescription: JobDescription | null;
  jobDescriptions: JobDescription[];
  reports: AnalysisReport[];
  questions: InterviewQuestion[];
};

export type SharedLookupValues = {
  resumeId: number;
  apiKey: string;
};
