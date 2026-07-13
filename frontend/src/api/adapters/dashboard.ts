import type { StatusCode } from '../../data/backendTypes';
import type { DashboardSource } from './types';
import {
  average,
  creditToPercent,
  findJob,
  gradeToScore,
  gradeToStatusCode,
  isActiveAnalysis,
  latestReportsByResume,
  mapAnalysisStatus,
  toStringList,
} from './common';

export type MetricItem = { label: string; value: number; suffix: string; change: string };
export type ApplicantRow = {
  key: string;
  name: string;
  role: string;
  fit: number;
  stage: string;
  status: string;
  statusCode: StatusCode;
};
export type InsightCard = { title: string; detail: string; tone: 'primary' | 'accent' | 'warning' };
export type AnalysisSummary = {
  centerValue: number;
  centerLabel: string;
  segments: { label: string; value: number; colorKey: 'primary' | 'accent' | 'track' | 'warning' }[];
};
export type DashboardData = {
  metrics: MetricItem[];
  applicants: ApplicantRow[];
  insightCards: InsightCard[];
  analysisSummary: AnalysisSummary;
  tasks: string[];
  creditPercent: number;
};

export function mapDashboard(data: DashboardSource): DashboardData {
  const reportsByResume = latestReportsByResume(data.analysis_reports);
  const applicantScores = data.resumes.map((resume) => gradeToScore(reportsByResume.get(resume.id)?.overall_grade));
  const averageScore = average(applicantScores);
  const activeJobs = data.job_descriptions.filter((job) => job.status === 'on_going').length;
  const reviewedCount = data.resumes.filter((resume) => resume.reviewed).length;
  const processingCount = data.resumes.filter((resume) => isActiveAnalysis(reportsByResume.get(resume.id))).length;
  const unreviewedCount = data.resumes.length - reviewedCount;
  const employStyle = toStringList(data.company_info.employ_style);

  return {
    metrics: [
      { label: '진행 중 JD', value: activeJobs, suffix: '건', change: `전체 ${data.job_descriptions.length}건` },
      { label: '등록 지원서', value: data.resumes.length, suffix: '명', change: `미검토 ${unreviewedCount}명` },
      { label: '분석 리포트', value: data.analysis_reports.length, suffix: '개', change: `평균 ${averageScore}점` },
      {
        label: '분석 크레딧',
        value: data.account.credit,
        suffix: 'pt',
        change: data.account.subscribe ? '구독 활성' : '구독 만료',
      },
    ],
    applicants: data.resumes.map((resume) => {
      const job = findJob(data.job_descriptions, resume);
      const report = reportsByResume.get(resume.id);
      const status = mapAnalysisStatus(report);
      const hasDoneGrade = report?.status === 'done' && Boolean(report.overall_grade);
      return {
        key: String(resume.id),
        name: resume.name,
        role: job?.job_name ?? '연결된 JD 없음',
        fit: gradeToScore(report?.overall_grade),
        stage: status.label,
        status: hasDoneGrade ? `${report.overall_grade} 등급` : status.label,
        statusCode: hasDoneGrade ? gradeToStatusCode(report.overall_grade) : status.code,
      };
    }),
    insightCards: [
      {
        title: '채용 기준',
        detail: employStyle.length
          ? `${data.company_info.company_name}는 ${employStyle.join(', ')}를 중요하게 봅니다.`
          : '회사 정보에 채용 기준을 입력하면 분석 기준으로 함께 활용됩니다.',
        tone: 'primary',
      },
      {
        title: '분석 대기',
        detail: processingCount ? `${processingCount}명의 지원서가 분석 중입니다.` : '현재 분석 중인 지원서는 없습니다.',
        tone: 'accent',
      },
      {
        title: '검토 필요',
        detail: unreviewedCount ? `${unreviewedCount}명의 지원서 검토가 남아 있습니다.` : '모든 지원서가 검토되었습니다.',
        tone: unreviewedCount ? 'warning' : 'accent',
      },
    ],
    analysisSummary: {
      centerValue: averageScore,
      centerLabel: '평균 등급 점수',
      segments: [
        { label: '평균 점수', value: averageScore, colorKey: 'primary' },
        { label: '보완 여지', value: Math.max(0, 100 - averageScore), colorKey: 'track' },
      ],
    },
    tasks: [
      unreviewedCount ? `미검토 지원서 ${unreviewedCount}명 확인` : '검토 완료 지원서 상태 재확인',
      `진행 중 JD ${activeJobs}건 상태 점검`,
      `분석 크레딧 ${data.account.credit}pt 잔여`,
      `공유 인증 키에는 필요한 지원서만 허용하세요.`,
    ],
    creditPercent: creditToPercent(data.account.credit),
  };
}
