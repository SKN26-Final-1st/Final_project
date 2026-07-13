import type { AnalysisReport, JobDescription, Resume, StatusCode } from '../../data/backendTypes';
import {
  findJob,
  findLatestReport,
  formatDateTime,
  gradeToScore,
  mapAnalysisStatus,
  toDisplayText,
  toStringList,
} from './common';

export type CoverLetterDraft = {
  applicantName: string;
  body: string;
  sampleFileName: string;
  uploadHint: string;
};
export type CoverLetterRow = {
  key: string;
  applicant: string;
  jd: string;
  status: string;
  statusCode: StatusCode;
  score: number;
  skills: string[];
  experienceCount: number;
  updatedAt: string;
  updatedAtIso?: string;
  reviewed: boolean;
  jdId?: string;
  resumeStatus?: StatusCode;
};

function getFirstIntro(resume?: Resume | null) {
  const [firstIntro] = Array.isArray(resume?.self_intoduction) ? resume.self_intoduction : [];
  if (!firstIntro || typeof firstIntro !== 'object') return { question: '', answer: '' };
  const intro = firstIntro as Partial<{ question: unknown; answer: unknown }>;
  return { question: toDisplayText(intro.question), answer: toDisplayText(intro.answer) };
}

export function mapCoverLetterDraft(data?: Resume | null): CoverLetterDraft {
  const firstIntro = getFirstIntro(data);
  return {
    applicantName: data?.name ?? '',
    body: firstIntro.question || firstIntro.answer ? `${firstIntro.question}\n\n${firstIntro.answer}`.trim() : '',
    sampleFileName: 'resume_schema_sample.json',
    uploadHint: 'Resume 컬럼 구조에 맞춰 지원자 정보와 자기소개 문항을 입력하세요.',
  };
}

export function mapCoverLetterRows(
  data: Resume[],
  jobDescriptions: JobDescription[],
  analysisReports: AnalysisReport[],
): CoverLetterRow[] {
  return data.map((resume) => {
    const job = findJob(jobDescriptions, resume);
    const report = findLatestReport(analysisReports, resume);
    const status = mapAnalysisStatus(report);
    return {
      key: String(resume.id),
      applicant: resume.name,
      jd: job?.job_name ?? '연결된 JD 없음',
      status: status.label,
      statusCode: status.code,
      score: gradeToScore(report?.overall_grade),
      skills: toStringList(resume.skill).slice(0, 4),
      experienceCount: Array.isArray(resume.experience) ? resume.experience.length : 0,
      updatedAt: formatDateTime(resume.updated_at),
      updatedAtIso: resume.updated_at,
      reviewed: resume.reviewed,
      jdId: job ? String(job.id) : String(resume.job_description_id),
      resumeStatus: status.code,
    };
  });
}
