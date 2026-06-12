import type {
  analysisReportApiResponse,
  authDefaultsApiResponse,
  companyApiResponse,
  coverLetterDraftApiResponse,
  coverLettersApiResponse,
  coverLetterTemplateApiResponse,
  dashboardApiResponse,
  jobDescriptionsApiResponse,
  recruitmentPostApiResponse,
  StatusCode,
  userProfileApiResponse,
} from '../data/apiMockData';
import type { AnalysisReport, CompanyInfo, JobDescription, InterviewQuestion, Resume } from '../data/apiMockData';
import type { ChatMessage } from '../data/mockData';

type ApiData<T> = T extends { data: infer Data } ? Data : never;

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
  };
};

export type CompanyProfile = {
  name: string;
  employeeCount: number;
  teamComposition: string[];
  description: string;
  employStyle: string[];
  completion: number;
};

export type JdItem = {
  id: string;
  title: string;
  team: string;
  status: string;
  statusCode: StatusCode;
  fit: number;
  stack: string[];
  preferredStack: string[];
  summary: string;
  requiredExperience: string;
  employmentType: string;
  educationLevel: string;
  major: string;
  hiringReason: string;
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

export type RecruitmentPreview = ApiData<typeof recruitmentPostApiResponse>;

export type TemplateQuestion = {
  title: string;
  guide: string;
};

export type UserProfile = {
  displayName: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  roleName: string;
  companyName: string;
  credit: number;
  subscribe: boolean;
  subscribeExpirationText: string;
  verificationQuestion: string;
};

export type AuthDefaults = ApiData<typeof authDefaultsApiResponse>;

const JOB_STATUS_LABEL: Record<JobDescription['status'], string> = {
  prepare: '준비 중',
  on_going: '진행 중',
  closed: '마감',
};

const RESUME_STATUS_LABEL: Record<Resume['status'], string> = {
  onqueue: '분석 대기',
  processing: '분석 중',
  done: '분석 완료',
};

const GRADE_SCORE: Record<AnalysisReport['overall_grade'], number> = {
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

function gradeToScore(grade?: AnalysisReport['overall_grade']) {
  return grade ? GRADE_SCORE[grade] : 0;
}

function gradeToStatusCode(grade?: AnalysisReport['overall_grade']): StatusCode {
  return grade ? (`grade_${grade.toLowerCase()}` as StatusCode) : 'normal';
}

function findJob(jobDescriptions: JobDescription[], resume: Resume) {
  return jobDescriptions.find((job) => job.id === resume.job_description_id);
}

function findReport(analysisReports: AnalysisReport[], resume: Resume) {
  return analysisReports.find((report) => report.resume_id === resume.id);
}

function formatList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '등록된 항목이 없습니다.';
}

function formatChecklist(report: AnalysisReport) {
  return report.checklist
    .map((item) => `${item.result ? '충족' : '미충족'} · ${item.content}`)
    .join('\n');
}

function formatDateTime(isoDate: string) {
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

function mapResumeStatus(resume: Resume): { label: string; code: StatusCode } {
  if (resume.reviewed) {
    return { label: '검토 완료', code: 'reviewed' };
  }

  return { label: RESUME_STATUS_LABEL[resume.status], code: resume.status };
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

export function mapDashboard(data: ApiData<typeof dashboardApiResponse>): DashboardData {
  const reportsByResume = new Map(data.analysis_reports.map((report) => [report.resume_id, report]));
  const applicantScores = data.resumes.map((resume) => gradeToScore(reportsByResume.get(resume.id)?.overall_grade));
  const averageScore = average(applicantScores);
  const activeJobs = data.job_descriptions.filter((job) => job.status === 'on_going').length;
  const reviewedCount = data.resumes.filter((resume) => resume.reviewed).length;
  const processingCount = data.resumes.filter((resume) => resume.status === 'processing').length;
  const unreviewedCount = data.resumes.length - reviewedCount;

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
      const status = mapResumeStatus(resume);

      return {
        key: String(resume.id),
        name: resume.name,
        role: job?.job_name ?? '연결된 JD 없음',
        fit: gradeToScore(report?.overall_grade),
        stage: RESUME_STATUS_LABEL[resume.status],
        status: report ? `${report.overall_grade} 등급` : status.label,
        statusCode: report ? gradeToStatusCode(report.overall_grade) : status.code,
      };
    }),
    insightCards: [
      {
        title: '채용 기준',
        detail: `${data.company_info.company_name}는 ${data.company_info.employ_style.join(', ')}를 중요하게 봅니다.`,
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
      `인증 키 허용 지원서 ${data.resumes.length}건 기준 확인`,
    ],
    creditPercent: creditToPercent(data.account.credit),
  };
}

export function mapAdmin(data: ApiData<typeof dashboardApiResponse>): AdminData {
  const reportsByResume = new Map(data.analysis_reports.map((report) => [report.resume_id, report]));
  const applicantScores = data.resumes.map((resume) => gradeToScore(reportsByResume.get(resume.id)?.overall_grade));
  const averageScore = average(applicantScores);
  const activeJobs = data.job_descriptions.filter((job) => job.status === 'on_going').length;
  const pendingReviews = data.resumes.filter((resume) => !resume.reviewed).length;
  const processingResumes = data.resumes.filter((resume) => resume.status === 'processing').length;
  const creditPercent = creditToPercent(data.account.credit);
  const teams = data.company_info.team_composition.length ? data.company_info.team_composition : ['HR'];
  const ownerUsername = data.account.username ?? 'account';

  return {
    companyName: data.company_info.company_name,
    ownerName: data.account.name,
    summary: [
      {
        label: 'HR 담당자',
        value: 4,
        suffix: '명',
        helper: '관리자 1명 · 리뷰어 1명 포함',
        tone: 'primary',
      },
      {
        label: '진행 중 JD',
        value: activeJobs,
        suffix: '건',
        helper: `전체 JD ${data.job_descriptions.length}건`,
        tone: 'accent',
      },
      {
        label: '검토 대기',
        value: pendingReviews,
        suffix: '명',
        helper: processingResumes ? `분석 중 ${processingResumes}명` : '분석 대기 없음',
        tone: pendingReviews ? 'warning' : 'accent',
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
        email: `${ownerUsername}@${data.company_info.company_name.toLowerCase()}.hr`,
        role: '최고 관리자',
        scope: '전체 워크스페이스',
        status: '활성',
        statusCode: 'subscribe_active',
        lastActive: formatDateTime(data.job_descriptions[0]?.updated_at ?? data.account.subscribe_expiration),
      },
      {
        key: 'lead',
        name: '정다은',
        email: 'daeun.jung@humour.ai',
        role: 'HR 리드',
        scope: teams[0] ?? 'HR',
        status: '활성',
        statusCode: 'normal',
        lastActive: formatDateTime(data.resumes[0]?.updated_at ?? data.account.subscribe_expiration),
      },
      {
        key: 'recruiter',
        name: '김민재',
        email: 'minjae.kim@humour.ai',
        role: '채용 담당자',
        scope: teams[1] ?? teams[0] ?? 'HR',
        status: processingResumes ? '분석 확인 중' : '활성',
        statusCode: processingResumes ? 'processing' : 'normal',
        lastActive: formatDateTime(data.resumes[1]?.updated_at ?? data.account.subscribe_expiration),
      },
      {
        key: 'reviewer',
        name: '박서연',
        email: 'seoyeon.park@humour.ai',
        role: '리뷰어',
        scope: teams[2] ?? teams[0] ?? 'HR',
        status: '초대 대기',
        statusCode: 'onqueue',
        lastActive: '초대 메일 발송 대기',
      },
    ],
    permissions: [
      {
        key: 'admin',
        role: '최고 관리자',
        description: '회사 정보, 결제, 담당자 권한까지 전체 운영 설정을 관리합니다.',
        permissions: ['회사 설정', '멤버 초대', '권한 변경', '크레딧 관리'],
      },
      {
        key: 'lead',
        role: 'HR 리드',
        description: '채용 운영 기준과 JD, 지원자 분석 흐름을 관리합니다.',
        permissions: ['JD 승인', '지원자 검토', '리포트 공유', '공고 생성'],
      },
      {
        key: 'reviewer',
        role: '리뷰어',
        description: '배정된 지원자의 분석 리포트와 면접 질문만 확인합니다.',
        permissions: ['리포트 열람', '후보 메모', '검토 상태 변경'],
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
      subscriptionStatus: data.account.subscribe ? '구독 활성' : '구독 만료',
      expiresAt: formatDateTime(data.account.subscribe_expiration),
    },
  };
}

export function mapCompany(data: ApiData<typeof companyApiResponse>): CompanyProfile {
  const completedFields = [
    Boolean(data.company_name),
    data.employee_count > 0,
    data.team_composition.length > 0,
    Boolean(data.company_description),
    data.employ_style.length > 0,
  ].filter(Boolean).length;

  return {
    name: data.company_name,
    employeeCount: data.employee_count,
    teamComposition: data.team_composition,
    description: data.company_description,
    employStyle: data.employ_style,
    completion: Math.round((completedFields / 5) * 100),
  };
}

export function mapJdList(
  data: ApiData<typeof jobDescriptionsApiResponse>,
  resumes: Resume[],
  analysisReports: AnalysisReport[],
): JdItem[] {
  return data.map((item) => ({
    id: String(item.id),
    title: item.job_name,
    team: `${item.education_level} · ${item.career_level}`,
    status: JOB_STATUS_LABEL[item.status],
    statusCode: item.status,
    fit: getJobFit(item, resumes, analysisReports),
    stack: item.required_skill,
    preferredStack: item.preferred_skill,
    summary: item.main_task,
    requiredExperience: item.career_level,
    employmentType: item.work_type,
    educationLevel: item.education_level,
    major: item.major,
    hiringReason: item.hiring_reason,
  }));
}

export function mapCoverLetterDraft(data: ApiData<typeof coverLetterDraftApiResponse>): CoverLetterDraft {
  const firstIntro = data.self_intoduction[0];

  return {
    applicantName: data.name,
    body: firstIntro ? `${firstIntro.question}\n\n${firstIntro.answer}` : '',
    sampleFileName: 'resume_schema_sample.json',
    uploadHint: 'Resume 컬럼 구조 기준의 목업 지원서 데이터가 표시됩니다.',
  };
}

export function mapCoverLetterRows(
  data: ApiData<typeof coverLettersApiResponse>,
  jobDescriptions: JobDescription[],
  analysisReports: AnalysisReport[],
): CoverLetterRow[] {
  return data.map((resume) => {
    const job = findJob(jobDescriptions, resume);
    const report = findReport(analysisReports, resume);
    const status = mapResumeStatus(resume);

    return {
      key: String(resume.id),
      applicant: resume.name,
      jd: job?.job_name ?? '연결된 JD 없음',
      status: status.label,
      statusCode: status.code,
      score: gradeToScore(report?.overall_grade),
    };
  });
}

export function mapAnalysisReport(
  data: ApiData<typeof analysisReportApiResponse>,
  resumes: Resume[],
  jobDescriptions: JobDescription[],
  interviewQuestions: InterviewQuestion[],
): AnalysisReportData {
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
        content: formatList(data.fit_analysis),
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
        text: '지원서, JD, 분석 리포트, 면접 질문 데이터를 기준으로 답변할 수 있습니다.',
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

export function mapTemplateQuestions(data: ApiData<typeof coverLetterTemplateApiResponse>): TemplateQuestion[] {
  return data.map((question) => ({
    title: question.question,
    guide: question.purpose,
  }));
}

export function mapUserProfile(data: ApiData<typeof userProfileApiResponse>, company?: CompanyInfo): UserProfile {
  return {
    displayName: data.name,
    username: data.username ?? 'account',
    roleName: data.subscribe ? '구독 활성' : '구독 만료',
    companyName: company?.company_name ?? '회사 정보 없음',
    credit: data.credit,
    subscribe: data.subscribe,
    subscribeExpirationText: formatDateTime(data.subscribe_expiration),
    verificationQuestion: data.verification_question,
  };
}
