import type { AnalysisReport } from '../../data/backendTypes';

export type ReportEditFormValues = {
  overall_grade: string;
  overall_summary: string;
  candidate_summary: string;
  competency_analysis: string;
  fit_analysis: string;
  motive: string;
  collaboration: string;
  strength: string;
  concern: string;
  check_point: string;
  final_comment: string;
};

export type ReportFeedbackDraft = {
  reportId: number | null;
  sourceRating: number;
  sourceReviewText: string;
  rating: number;
  reviewText: string;
  savedRating: number;
  savedReviewText: string;
};

export type ReportChecklistItem = {
  content: string;
  result: boolean;
};

export const REPORT_STATUS_LABEL: Record<AnalysisReport['status'], string> = {
  onqueue: '분석 대기',
  processing: '분석 중',
  done: '분석 완료',
  fail: '분석 실패',
};

const GRADE_SCORE: Record<string, number> = {
  A: 94,
  B: 82,
  C: 68,
  D: 46,
  F: 20,
};

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

export function toDisplayList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const text = toDisplayText(value).trim();
  return text ? [text] : [];
}

function toTextareaValue(value: unknown) {
  return toDisplayList(value).join('\n');
}

function toTextareaList(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function gradeScore(grade: string) {
  return GRADE_SCORE[grade.toUpperCase()] ?? 0;
}

export function getReportStatusLabel(status: AnalysisReport['status']) {
  return REPORT_STATUS_LABEL[status];
}

export function isReportPending(report: AnalysisReport) {
  return report.status === 'onqueue' || report.status === 'processing';
}

export function isReportDeleteBlocked(report: AnalysisReport) {
  return report.status === 'processing';
}

export function canSaveReportFeedback(report: AnalysisReport) {
  return report.status === 'done';
}

export function getReportFeedbackValue(report: AnalysisReport) {
  const value = report.user_feedback;
  return typeof value === 'number' && value >= 1 && value <= 5 ? value : 0;
}

export function createReportFeedbackDraft(report?: AnalysisReport | null): ReportFeedbackDraft {
  const rating = report ? getReportFeedbackValue(report) : 0;
  const reviewText = report?.review_text ?? '';

  return {
    reportId: report?.id ?? null,
    sourceRating: rating,
    sourceReviewText: reviewText,
    rating,
    reviewText,
    savedRating: rating,
    savedReviewText: reviewText,
  };
}

export function getReportDeleteWarning(report: AnalysisReport) {
  if (report.status === 'onqueue') {
    return {
      title: '대기 중인 리포트도 삭제할 수 있습니다.',
      description: '대기 중인 리포트를 삭제하면 Credit 환급이 Celery 처리 이후 반영될 수 있습니다.',
    };
  }

  if (report.status === 'fail') {
    return {
      title: '실패한 리포트를 삭제합니다.',
      description: '실패 처리 과정에서 환급이 이미 반영되었거나 처리 중일 수 있습니다.',
    };
  }

  return {
    title: '리포트와 질문 추천이 함께 삭제됩니다.',
    description: '삭제한 리포트는 복구할 수 없습니다. 지원서와 JD 데이터는 삭제되지 않습니다.',
  };
}

export function formatReportTimestamp(value: string) {
  if (!value) {
    return '생성일 없음';
  }

  const [date = '', time = ''] = value.split('T');
  const normalizedTime = time.slice(0, 5);
  return [date, normalizedTime].filter(Boolean).join(' ');
}

export function reportEditInitialValues(report: AnalysisReport): ReportEditFormValues {
  return {
    overall_grade: report.overall_grade,
    overall_summary: report.overall_summary,
    candidate_summary: report.candidate_summary,
    competency_analysis: toTextareaValue(report.competency_analysis),
    fit_analysis: toTextareaValue(report.fit_analysis),
    motive: toTextareaValue(report.motive),
    collaboration: toTextareaValue(report.collaboration),
    strength: toTextareaValue(report.strength),
    concern: toTextareaValue(report.concern),
    check_point: toTextareaValue(report.check_point),
    final_comment: report.final_comment,
  };
}

export function reportEditPayload(id: number, values: ReportEditFormValues) {
  return {
    id,
    overall_grade: values.overall_grade.trim(),
    overall_summary: values.overall_summary.trim(),
    candidate_summary: values.candidate_summary.trim(),
    competency_analysis: toTextareaList(values.competency_analysis),
    fit_analysis: values.fit_analysis.trim(),
    motive: values.motive.trim(),
    collaboration: values.collaboration.trim(),
    strength: toTextareaList(values.strength),
    concern: toTextareaList(values.concern),
    check_point: toTextareaList(values.check_point),
    final_comment: values.final_comment.trim(),
  };
}

export function checklistItems(report: AnalysisReport): ReportChecklistItem[] {
  return Array.isArray(report.checklist)
    ? report.checklist
        .map((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const record = item as Record<string, unknown>;
          const content = toDisplayText(record.content);
          if (!content) return null;
          return { content, result: Boolean(record.result) };
        })
        .filter((item): item is ReportChecklistItem => Boolean(item))
    : [];
}
