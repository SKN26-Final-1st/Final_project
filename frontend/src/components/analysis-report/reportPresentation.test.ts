import { describe, expect, it } from 'vitest';
import type { AnalysisReport } from '../../data/backendTypes';
import {
  checklistItems,
  createReportFeedbackDraft,
  formatReportTimestamp,
  getReportStatusLabel,
  isReportDeleteBlocked,
  isReportPending,
  reportEditInitialValues,
  reportEditPayload,
  toDisplayList,
} from './reportPresentation';

function createReport(overrides: Partial<AnalysisReport> = {}): AnalysisReport {
  return {
    id: 1,
    resume_id: 2,
    overall_grade: 'A',
    overall_summary: '전체 요약',
    candidate_summary: '지원자 요약',
    checklist: [{ content: 'React 경험', result: true }, { invalid: true }],
    competency_analysis: ['역량 1', '역량 2'],
    fit_analysis: '적합도 1\n적합도 2',
    motive: '지원 동기',
    collaboration: '협업 역량',
    strength: ['강점 1'],
    concern: ['우려 1'],
    check_point: ['확인 1'],
    interview_question: [],
    final_comment: '최종 코멘트',
    status: 'done',
    created_at: '2026-07-12T14:35:00+09:00',
    version: 'v1',
    user_feedback: 4,
    review_text: '유용했습니다.',
    ...overrides,
  };
}

describe('reportPresentation', () => {
  it('normalizes report values for read-only and edit views', () => {
    const report = createReport();

    expect(toDisplayList(report.fit_analysis)).toEqual(['적합도 1', '적합도 2']);
    expect(checklistItems(report)).toEqual([{ content: 'React 경험', result: true }]);
    expect(reportEditInitialValues(report)).toMatchObject({
      competency_analysis: '역량 1\n역량 2',
      fit_analysis: '적합도 1\n적합도 2',
    });
  });

  it('creates a report modify payload with editable fields only', () => {
    const values = reportEditInitialValues(createReport());
    const payload = reportEditPayload(7, {
      ...values,
      overall_summary: '  수정 요약  ',
      strength: '강점 A\n강점 B',
    });

    expect(payload).toMatchObject({
      id: 7,
      overall_summary: '수정 요약',
      strength: ['강점 A', '강점 B'],
    });
    expect(payload).not.toHaveProperty('resume_id');
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('version');
    expect(payload).not.toHaveProperty('review_text');
  });

  it('keeps status, deletion, timestamp, and feedback presentation rules unchanged', () => {
    expect(getReportStatusLabel('fail')).toBe('분석 실패');
    expect(isReportPending(createReport({ status: 'onqueue' }))).toBe(true);
    expect(isReportDeleteBlocked(createReport({ status: 'processing' }))).toBe(true);
    expect(isReportDeleteBlocked(createReport({ status: 'fail' }))).toBe(false);
    expect(formatReportTimestamp('2026-07-12T14:35:00+09:00')).toBe('2026-07-12 14:35');
    expect(createReportFeedbackDraft(createReport())).toMatchObject({
      reportId: 1,
      rating: 4,
      reviewText: '유용했습니다.',
    });
  });
});
