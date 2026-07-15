import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AnalysisReport } from '../../data/backendTypes';
import { ReportReadOnlyContent } from './ReportReadOnlyContent';

const report = {
  overall_grade: 'A',
  overall_summary: '전체 요약',
  candidate_summary: '지원자 핵심 요약',
  checklist: [{ content: '기준 충족', result: true }],
  competency_analysis: ['역량 분석'],
  fit_analysis: ['적합도 분석'],
  motive: '지원 동기 분석',
  collaboration: '협업 분석',
  strength: ['강점'],
  concern: ['우려'],
  check_point: ['확인 포인트'],
  final_comment: '최종 채용 코멘트',
} as unknown as AnalysisReport;

describe('ReportReadOnlyContent', () => {
  it.each(['internal', 'shared'] as const)('renders the complete report in %s mode', (variant) => {
    const { container } = render(<ReportReadOnlyContent report={report} variant={variant} />);

    expect(screen.getByText('전체 요약')).toBeInTheDocument();
    expect(screen.getByText('지원자 핵심 요약')).toBeInTheDocument();
    expect(screen.getByText('기준 충족')).toBeInTheDocument();
    expect(screen.getByText('지원 동기 분석')).toBeInTheDocument();
    expect(screen.getByText('협업 분석')).toBeInTheDocument();
    expect(screen.getByText('최종 채용 코멘트')).toBeInTheDocument();
    expect(container.querySelector(variant === 'shared' ? '.shared-report-copy' : '.analysis-report-hero')).not.toBeNull();
  });
});
