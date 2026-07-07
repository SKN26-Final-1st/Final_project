import type {
  Account,
  AnalysisReport,
  AnalysisReportStatus,
  CompanyInfo,
  JobDescription,
  InterviewQuestion,
  Resume,
  StatusCode,
} from '../data/backendTypes';
import type { ChatMessage } from '../data/appConfig';
export { mapJdList } from './adapters/jd';
export type { JdItem } from './adapters/jd';
export { mapCompany, mapUserProfile } from './adapters/user';
export type { CompanyProfile, UserProfile } from './adapters/user';

export type DashboardSource = {
  account: Account;
  company_info: CompanyInfo;
  job_descriptions: JobDescription[];
  resumes: Resume[];
  analysis_reports: AnalysisReport[];
  interview_questions: InterviewQuestion[];
};

export type MetricItem = {
  label: string;
  value: number;
  suffix: string;
  change: string;
};

export type ApplicantRow = {
  key: string;
  name: string;
  role: string;
  fit: number;
  stage: string;
  status: string;
  statusCode: StatusCode;
};

export type InsightCard = {
  title: string;
  detail: string;
  tone: 'primary' | 'accent' | 'warning';
};

export type AnalysisSummary = {
  centerValue: number;
  centerLabel: string;
  segments: {
    label: string;
    value: number;
    colorKey: 'primary' | 'accent' | 'track' | 'warning';
  }[];
};

export type DashboardData = {
  metrics: MetricItem[];
  applicants: ApplicantRow[];
  insightCards: InsightCard[];
  analysisSummary: AnalysisSummary;
  tasks: string[];
  creditPercent: number;
};

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

export type AdminPermission = {
  key: string;
  role: string;
  description: string;
  permissions: string[];
};

export type AdminData = {
  companyName: string;
  ownerName: string;
  summary: AdminSummaryItem[];
  members: AdminMember[];
  permissions: AdminPermission[];
  operatingStatus: {
    activeJobs: number;
    pendingReviews: number;
    processingResumes: number;
    averageScore: number;
  };
  credit: {
    percent: number;
    remaining: number;
    subscriptionStatus: string;
    expiresAt: string;
    expiresAtIso: string;
    isSubscriptionActive: boolean;
  };
};

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

export type AnalysisReportData = {
  reportId: string;
  applicantName: string;
  jobTitle: string;
  tabs: {
    key: string;
    label: string;
    title: string;
    content: string;
  }[];
  exampleQuestions: string[];
  chatMessages: ChatMessage[];
};

export type RecruitmentPreview = {
  title: string;
  sections: string[];
};

export type TemplateQuestion = {
  title: string;
  guide: string;
};

const ANALYSIS_STATUS_LABEL: Record<AnalysisReportStatus, string> = {
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

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function creditToPercent(credit: number) {
  return Math.min(100, Math.round((credit / 200) * 100));
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

function gradeToStatusCode(grade?: string): StatusCode {
  const normalized = grade?.toLowerCase();

  return normalized && ['a', 'b', 'c', 'd', 'f'].includes(normalized)
    ? (`grade_${normalized}` as StatusCode)
    : 'normal';
}

function findJob(jobDescriptions: JobDescription[], resume: Resume) {
  return jobDescriptions.find((job) => job.id === resume.job_description_id);
}

function reportTime(report: AnalysisReport) {
  const time = report.created_at ? new Date(report.created_at).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function compareReportRecent(left: AnalysisReport, right: AnalysisReport) {
  const timeDiff = reportTime(right) - reportTime(left);
  return timeDiff || right.id - left.id;
}

function findLatestReport(analysisReports: AnalysisReport[], resume: Resume) {
  return analysisReports
    .filter((report) => report.resume_id === resume.id)
    .sort(compareReportRecent)[0];
}

function latestReportsByResume(analysisReports: AnalysisReport[]) {
  const reportsByResume = new Map<number, AnalysisReport>();

  analysisReports.forEach((report) => {
    const current = reportsByResume.get(report.resume_id);
    if (!current || compareReportRecent(report, current) < 0) {
      reportsByResume.set(report.resume_id, report);
    }
  });

  return reportsByResume;
}

function formatList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '등록된 항목이 없습니다.';
}

function formatChecklist(report: AnalysisReport) {
  const rows = Array.isArray(report.checklist) ? report.checklist : [];
  const lines = rows
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return '';
      }

      const checklistItem = item as Partial<{ content: unknown; result: unknown }>;
      const content = toDisplayText(checklistItem.content);

      if (!content) {
        return '';
      }

      return `${checklistItem.result ? '충족' : '미충족'} · ${content}`;
    })
    .filter(Boolean);

  return lines.length ? lines.join('\n') : '체크리스트가 없습니다.';
}

function formatDateTime(isoDate: string) {
  if (!isoDate) {
    return '미설정';
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isFutureDate(isoDate: string) {
  const time = isoDate ? new Date(isoDate).getTime() : Number.NaN;
  return !Number.isNaN(time) && time > Date.now();
}

function mapAnalysisStatus(report?: AnalysisReport): { label: string; code: StatusCode } {
  if (!report) {
    return { label: '분석 전', code: 'normal' };
  }

  return { label: ANALYSIS_STATUS_LABEL[report.status], code: report.status };
}

function isActiveAnalysis(report?: AnalysisReport) {
  return report?.status === 'onqueue' || report?.status === 'processing';
}

function getFirstIntro(resume?: Resume | null) {
  const [firstIntro] = Array.isArray(resume?.self_intoduction) ? resume.self_intoduction : [];

  if (!firstIntro || typeof firstIntro !== 'object') {
    return { question: '', answer: '' };
  }

  const intro = firstIntro as Partial<{ question: unknown; answer: unknown }>;

  return {
    question: toDisplayText(intro.question),
    answer: toDisplayText(intro.answer),
  };
}

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
      {
        label: '진행 중 JD',
        value: activeJobs,
        suffix: '건',
        change: `전체 ${data.job_descriptions.length}건`,
      },
      {
        label: '등록 지원서',
        value: data.resumes.length,
        suffix: '명',
        change: `미검토 ${unreviewedCount}명`,
      },
      {
        label: '분석 리포트',
        value: data.analysis_reports.length,
        suffix: '개',
        change: `평균 ${averageScore}점`,
      },
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
      {
        label: '진행 중 JD',
        value: activeJobs,
        suffix: '건',
        helper: `전체 JD ${data.job_descriptions.length}건`,
        tone: 'accent',
      },
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
    operatingStatus: {
      activeJobs,
      pendingReviews,
      processingResumes,
      averageScore,
    },
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

export function mapRecruitmentPreview(companyInfo: CompanyInfo, jobDescription?: JobDescription): RecruitmentPreview {
  if (!jobDescription) {
    return {
      title: '모집 공고 미리보기',
      sections: [
        `${companyInfo.company_name || '회사'} 정보를 불러왔습니다.`,
        '선택한 JD를 바탕으로 공고 초안을 미리 확인할 수 있습니다.',
      ],
    };
  }

  const requiredSkills = toStringList(jobDescription.required_skill).join(', ') || '입력 없음';
  const preferredSkills = toStringList(jobDescription.preferred_skill).join(', ') || '입력 없음';

  return {
    title: jobDescription.job_name,
    sections: [
      `${companyInfo.company_name}는 ${companyInfo.company_description}`,
      `주요 업무는 ${jobDescription.main_task || '입력되지 않았습니다.'}`,
      `필수 역량은 ${requiredSkills}이며, 우대 역량은 ${preferredSkills}입니다.`,
      `근무 형태는 ${jobDescription.work_type || '입력 없음'}, 요구 경력은 ${
        jobDescription.career_level
      }입니다.`,
      '공고 생성과 PDF 다운로드는 준비 중입니다.',
    ],
  };
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

export function mapAnalysisReport(
  data: AnalysisReport | null | undefined,
  resumes: Resume[],
  jobDescriptions: JobDescription[],
  interviewQuestions: InterviewQuestion[],
): AnalysisReportData {
  if (!data) {
    return {
      reportId: '',
      applicantName: '분석 리포트 없음',
      jobTitle: '분석 완료 후 표시됩니다.',
      tabs: [
        {
          key: 'empty',
          label: '대기',
          title: '분석 결과가 없습니다.',
          content: '지원서를 저장하고 분석 요청을 완료하면 리포트와 면접 질문이 표시됩니다.',
        },
      ],
      exampleQuestions: [],
      chatMessages: [
        {
          role: 'assistant',
          text: '아직 분석 리포트가 없습니다. JD와 지원서를 등록한 뒤 분석을 요청하세요.',
        },
      ],
    };
  }

  const resume = resumes.find((item) => item.id === data.resume_id);
  const job = resume ? findJob(jobDescriptions, resume) : undefined;
  const questions = interviewQuestions.filter((question) => question.resume_id === data.resume_id);

  return {
    reportId: String(data.id),
    applicantName: resume?.name ?? '지원자 정보 없음',
    jobTitle: job?.job_name ?? '연결된 JD 없음',
    tabs: [
      {
        key: 'summary',
        label: '요약',
        title: `${data.overall_grade} 등급 · 종합 요약`,
        content: `${data.overall_summary}\n\n${data.candidate_summary}`,
      },
      {
        key: 'checklist',
        label: '체크리스트',
        title: 'JD 기준 충족 여부',
        content: formatChecklist(data),
      },
      {
        key: 'competency',
        label: '역량',
        title: '역량 분석',
        content: formatList(data.competency_analysis),
      },
      {
        key: 'fit',
        label: '적합성',
        title: '직무/조직 적합성',
        content: data.fit_analysis || '등록된 항목이 없습니다.',
      },
      {
        key: 'risk',
        label: '검토',
        title: '강점·우려·확인 포인트',
        content: `강점\n${formatList(data.strength)}\n\n우려\n${formatList(data.concern)}\n\n확인 포인트\n${formatList(
          data.check_point,
        )}`,
      },
      {
        key: 'comment',
        label: '코멘트',
        title: '최종 코멘트',
        content: data.final_comment,
      },
    ],
    exampleQuestions: questions.map((question) => question.question),
    chatMessages: [
      {
        role: 'assistant',
        text: 'JD와 사용 가이드를 중심으로 답변할 수 있습니다. 리포트와 면접 질문은 화면에서 확인 가능한 참고 자료입니다.',
      },
      {
        role: 'user',
        text: '이 지원자의 추가 검증 포인트를 알려줘.',
      },
      {
        role: 'assistant',
        text: data.check_point.join(' '),
      },
    ],
  };
}

export function mapTemplateQuestions(data: InterviewQuestion[]): TemplateQuestion[] {
  return data.map((question) => ({
    title: question.question,
    guide: question.purpose,
  }));
}
