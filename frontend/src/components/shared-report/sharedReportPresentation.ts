import type { AnalysisReport } from '../../data/backendTypes';
import type { SharedBundle } from './sharedReportTypes';

const SHARED_REPORT_STATUS_LABEL: Record<AnalysisReport['status'], string> = {
  onqueue: '분석 대기',
  processing: '분석 중',
  done: '분석 완료',
  fail: '분석 실패',
};

export function toSharedTextList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : item === null || item === undefined ? '' : String(item)))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function getSharedReportStatus(report: AnalysisReport | undefined) {
  if (!report) return { label: '분석 전', color: 'default' };
  return {
    label: SHARED_REPORT_STATUS_LABEL[report.status],
    color: report.status === 'done' ? 'green' : report.status === 'fail' ? 'red' : 'gold',
  };
}

export function formatReportContext(bundle: SharedBundle) {
  const report = bundle.reports[0];
  const questions = bundle.questions.map((item) => item.question).join(' / ');
  const jobDescription = bundle.jobDescription;
  const requiredSkills = jobDescription ? toSharedTextList(jobDescription.required_skill).join(', ') : '';

  return [
    jobDescription ? `JD: ${jobDescription.job_name}` : '',
    requiredSkills ? `JD 필수 역량: ${requiredSkills}` : '',
    `지원자: ${bundle.resume.name}`,
    report ? `리포트 요약: ${report.overall_summary}` : '',
    report ? `확인 포인트: ${report.check_point.join(', ')}` : '',
    questions ? `면접 질문: ${questions}` : '',
  ].filter(Boolean).join('\n');
}
