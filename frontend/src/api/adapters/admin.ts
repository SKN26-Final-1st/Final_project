import type { StatusCode } from '../../data/backendTypes';
import type { DashboardSource } from './types';
import {
  average,
  creditToPercent,
  formatDateTime,
  gradeToScore,
  isActiveAnalysis,
  isFutureDate,
  latestReportsByResume,
  toStringList,
} from './common';

export type AdminSummaryItem = {
  label: string;
  value: number;
  suffix: string;
  helper: string;
  tone: 'primary' | 'accent' | 'warning';
};
export type AdminMember = {
  key: string;
  name: string;
  email: string;
  role: string;
  scope: string;
  status: string;
  statusCode: StatusCode;
  lastActive: string;
};
export type AdminPermission = { key: string; role: string; description: string; permissions: string[] };
export type AdminData = {
  companyName: string;
  ownerName: string;
  summary: AdminSummaryItem[];
  members: AdminMember[];
  permissions: AdminPermission[];
  operatingStatus: { activeJobs: number; pendingReviews: number; processingResumes: number; averageScore: number };
  credit: {
    percent: number;
    remaining: number;
    subscriptionStatus: string;
    expiresAt: string;
    expiresAtIso: string;
    isSubscriptionActive: boolean;
  };
};

export function mapAdmin(data: DashboardSource): AdminData {
  const reportsByResume = latestReportsByResume(data.analysis_reports);
  const applicantScores = data.resumes.map((resume) => gradeToScore(reportsByResume.get(resume.id)?.overall_grade));
  const averageScore = average(applicantScores);
  const activeJobs = data.job_descriptions.filter((job) => job.status === 'on_going').length;
  const pendingReviews = data.resumes.filter((resume) => !resume.reviewed).length;
  const processingResumes = data.resumes.filter((resume) => isActiveAnalysis(reportsByResume.get(resume.id))).length;
  const creditPercent = creditToPercent(data.account.credit);
  const teams = toStringList(data.company_info.team_composition);
  const isSubscriptionActive = isFutureDate(data.account.subscribe_expiration);

  return {
    companyName: data.company_info.company_name,
    ownerName: data.account.name,
    summary: [
      { label: '진행 중 JD', value: activeJobs, suffix: '건', helper: `전체 JD ${data.job_descriptions.length}건`, tone: 'accent' },
      {
        label: '등록 지원서',
        value: data.resumes.length,
        suffix: '명',
        helper: `미검토 ${pendingReviews}명`,
        tone: pendingReviews ? 'warning' : 'primary',
      },
      {
        label: '분석 중',
        value: processingResumes,
        suffix: '명',
        helper: processingResumes ? '분석 완료 후 리포트가 갱신됩니다.' : '처리 중인 지원서가 없습니다.',
        tone: processingResumes ? 'warning' : 'accent',
      },
      {
        label: '분석 크레딧',
        value: data.account.credit,
        suffix: 'pt',
        helper: `${data.account.credit}pt 보유`,
        tone: creditPercent < 30 ? 'warning' : 'primary',
      },
    ],
    members: [
      {
        key: 'owner',
        name: data.account.name,
        email: data.account.username,
        role: '계정 소유자',
        scope: teams[0] ?? '전체 워크스페이스',
        status: data.account.subscribe ? '구독 활성' : '구독 만료',
        statusCode: data.account.subscribe ? 'subscribe_active' : 'subscribe_expired',
        lastActive: formatDateTime(data.job_descriptions[0]?.updated_at ?? data.account.subscribe_expiration),
      },
    ],
    permissions: [
      {
        key: 'backend-gap',
        role: '멤버/역할 관리',
        description: '조직 멤버와 역할 권한은 추후 운영 설정에서 관리할 수 있습니다.',
        permissions: ['준비 중'],
      },
    ],
    operatingStatus: { activeJobs, pendingReviews, processingResumes, averageScore },
    credit: {
      percent: creditPercent,
      remaining: data.account.credit,
      subscriptionStatus: isSubscriptionActive ? '구독 중' : '구독 만료',
      expiresAt: formatDateTime(data.account.subscribe_expiration),
      expiresAtIso: data.account.subscribe_expiration,
      isSubscriptionActive,
    },
  };
}
