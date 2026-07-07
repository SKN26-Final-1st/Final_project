import type {
  AnalysisReport,
  JobDescription,
  JobDescriptionChecklistStatus,
  Resume,
  StatusCode,
} from '../../data/backendTypes';

export type JdItem = {
  id: string;
  title: string;
  team: string;
  status: string;
  statusCode: StatusCode;
  checklistStatus: JobDescriptionChecklistStatus;
  fit: number;
  stack: string[];
  preferredStack: string[];
  summary: string;
  requiredExperience: string;
  employmentType: string;
  educationLevel: string;
  major: string;
  hiringReason: string;
  updatedAt?: string;
};

const JOB_STATUS_LABEL: Record<JobDescription['status'], string> = {
  prepare: '준비 중',
  on_going: '진행 중',
  closed: '마감',
};

const GRADE_SCORE: Record<string, number> = {
  A: 94,
  B: 82,
  C: 68,
  D: 46,
  F: 20,
};

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function toDisplayText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(toDisplayText).filter(Boolean);
}

function gradeToScore(grade?: string) {
  return grade ? GRADE_SCORE[grade.toUpperCase()] ?? 0 : 0;
}

function getJobFit(job: JobDescription, resumes: Resume[], analysisReports: AnalysisReport[]) {
  const relatedResumeIds = resumes
    .filter((resume) => resume.job_description_id === job.id)
    .map((resume) => resume.id);
  const relatedScores = analysisReports
    .filter((report) => relatedResumeIds.includes(report.resume_id))
    .map((report) => gradeToScore(report.overall_grade));

  return average(relatedScores);
}

export function mapJdList(data: JobDescription[], resumes: Resume[], analysisReports: AnalysisReport[]): JdItem[] {
  return data.map((item) => ({
    id: String(item.id),
    title: item.job_name,
    team: `${item.education_level} · ${item.career_level}`,
    status: JOB_STATUS_LABEL[item.status],
    statusCode: item.status,
    checklistStatus: item.checklist_status,
    fit: getJobFit(item, resumes, analysisReports),
    stack: toStringList(item.required_skill),
    preferredStack: toStringList(item.preferred_skill),
    summary: item.main_task,
    requiredExperience: item.career_level,
    employmentType: item.work_type,
    educationLevel: item.education_level,
    major: item.major,
    hiringReason: item.hiring_reason,
    updatedAt: item.updated_at,
  }));
}
