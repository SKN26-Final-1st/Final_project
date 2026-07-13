import type { AnalysisReport, AnalysisReportStatus, JobDescription, Resume, StatusCode } from '../../data/backendTypes';

const ANALYSIS_STATUS_LABEL: Record<AnalysisReportStatus, string> = {
  onqueue: '분석 대기',
  processing: '분석 중',
  done: '분석 완료',
  fail: '분석 실패',
};

const GRADE_SCORE: Record<string, number> = { A: 94, B: 82, C: 68, D: 46, F: 20 };

export function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function creditToPercent(credit: number) {
  return Math.min(100, Math.round((credit / 200) * 100));
}

export function toDisplayText(value: unknown) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toDisplayText).filter(Boolean);
}

export function gradeToScore(grade?: string) {
  return grade ? GRADE_SCORE[grade.toUpperCase()] ?? 0 : 0;
}

export function gradeToStatusCode(grade?: string): StatusCode {
  const normalized = grade?.toLowerCase();
  return normalized && ['a', 'b', 'c', 'd', 'f'].includes(normalized)
    ? (`grade_${normalized}` as StatusCode)
    : 'normal';
}

export function findJob(jobDescriptions: JobDescription[], resume: Resume) {
  return jobDescriptions.find((job) => job.id === resume.job_description_id);
}

function reportTime(report: AnalysisReport) {
  const time = report.created_at ? new Date(report.created_at).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

export function compareReportRecent(left: AnalysisReport, right: AnalysisReport) {
  return reportTime(right) - reportTime(left) || right.id - left.id;
}

export function findLatestReport(analysisReports: AnalysisReport[], resume: Resume) {
  return analysisReports.filter((report) => report.resume_id === resume.id).sort(compareReportRecent)[0];
}

export function latestReportsByResume(analysisReports: AnalysisReport[]) {
  const reportsByResume = new Map<number, AnalysisReport>();
  analysisReports.forEach((report) => {
    const current = reportsByResume.get(report.resume_id);
    if (!current || compareReportRecent(report, current) < 0) reportsByResume.set(report.resume_id, report);
  });
  return reportsByResume;
}

export function formatDateTime(isoDate: string) {
  if (!isoDate) return '미설정';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isFutureDate(isoDate: string) {
  const time = isoDate ? new Date(isoDate).getTime() : Number.NaN;
  return !Number.isNaN(time) && time > Date.now();
}

export function mapAnalysisStatus(report?: AnalysisReport): { label: string; code: StatusCode } {
  return report ? { label: ANALYSIS_STATUS_LABEL[report.status], code: report.status } : { label: '분석 전', code: 'normal' };
}

export function isActiveAnalysis(report?: AnalysisReport) {
  return report?.status === 'onqueue' || report?.status === 'processing';
}
