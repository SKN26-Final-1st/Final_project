export type ApiResponse<T> = {
  error: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    page_size?: number;
    total_count?: number;
    requested_at: string;
  };
};

export type DateTimeString = string;

export type JobDescriptionStatus = 'prepare' | 'on_going' | 'closed';

export type ResumeStatus = 'onqueue' | 'processing' | 'done';

export type StatusCode =
  | JobDescriptionStatus
  | ResumeStatus
  | 'reviewed'
  | 'needs_review'
  | 'subscribe_active'
  | 'subscribe_expired'
  | 'grade_a'
  | 'grade_b'
  | 'grade_c'
  | 'grade_d'
  | 'grade_f'
  | 'normal';

export type Account = {
  id?: number;
  username?: string;
  password?: string;
  name: string;
  verification_question: string;
  verification_answer: string;
  credit: number;
  subscribe: boolean;
  subscribe_expiration: DateTimeString;
};

export type AuthKey = {
  id: number;
  account_id?: number;
  name: string;
  description: string;
  value: string;
  authorized_resume: number[];
};

export type CompanyInfo = {
  id?: number;
  account_id?: number;
  company_name: string;
  employee_count: number;
  team_composition: string[];
  company_description: string;
  employ_style: string[];
};

export type JobDescription = {
  id: number;
  account_id?: number;
  job_name: string;
  education_level: string;
  major: string;
  career_level: string;
  required_skill: string[];
  preferred_skill: string[];
  main_task: string;
  hiring_reason: string;
  work_type: string;
  status: JobDescriptionStatus;
  created_at: DateTimeString;
  updated_at: DateTimeString;
};

export type Resume = {
  id: number;
  job_description_id: number;
  name: string;
  skill: string[];
  education_level: {
    final_degree: 'bachelor' | 'master' | 'doctoral';
    bachelor: string;
    master: string;
    doctoral: string;
  };
  experience: {
    company_name: string;
    length: string;
    position: string;
  }[];
  self_intoduction: {
    question: string;
    answer: string;
  }[];
  certification: string[];
  language: {
    language_name: string;
    test_name: string;
    score: string;
  }[];
  award: {
    award_name: string;
    award_from: string;
    time: string;
  }[];
  training: {
    education_name: string;
    education_from: string;
    education_description: string;
    start: string;
    end: string;
  }[];
  other_activity: {
    activity_name: string;
    activity_description: string;
    start: string;
    end: string;
  }[];
  status: ResumeStatus;
  reviewed: boolean;
  reviewed_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
};

export type AnalysisReport = {
  id: number;
  resume_id: number;
  overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overall_summary: string;
  candidate_summary: string;
  checklist: {
    content: string;
    result: boolean;
  }[];
  competency_analysis: string[];
  fit_analysis: string[];
  strength: string[];
  concern: string[];
  check_point: string[];
  final_comment: string;
};

export type InterviewQuestion = {
  id: number;
  resume_id: number;
  question: string;
  answer: string;
  purpose: string;
};

const account: Account = {
  name: 'administrator',
  verification_question: '좋아하는 색깔은?',
  verification_answer: '파랑',
  credit: 150,
  subscribe: true,
  subscribe_expiration: '2026-12-31T23:59:59+09:00',
};

const authDefaults: Account = {
  id: 1,
  username: 'admin',
  password: '1234',
  ...account,
};

const authKeys: AuthKey[] = [
  {
    id: 1,
    name: '정팀장 키값',
    description: '프론트엔드 JD 검토용 API 키',
    value: 'sk_live_****kLp3',
    authorized_resume: [1, 2, 3],
  },
];

const companyInfo: CompanyInfo = {
  company_name: '테크브릿지',
  employee_count: 100,
  team_composition: ['개발팀', '기획/PM팀', '영업팀'],
  company_description:
    '테크브릿지는 중소기업을 위한 SaaS 기반 업무 자동화 플랫폼을 개발하는 회사입니다. 문서 관리, 고객 관리, 내부 승인 프로세스 자동화 기능을 제공하며, 최근에는 AI를 활용한 데이터 분석 기능을 고도화하고 있습니다.',
  employ_style: ['협업이 가능한 인재', '자신의 일에 책임감을 가질 수 있는 사람'],
};

const jobDescriptions: JobDescription[] = [
  {
    id: 1,
    job_name: '잡코리아 2026 프론트엔드 팀 신규 채용',
    education_level: '대졸 이상',
    major: '컴퓨터 공학과 혹은 그에 준하는 관련 학과',
    career_level: '경력 3년 이상',
    required_skill: ['HTML', 'CSS', 'JavaScript'],
    preferred_skill: ['React', 'Vue', 'Vite'],
    main_task: 'SaaS 업무 자동화 플랫폼의 프론트엔드 개발과 사용자 경험 개선',
    hiring_reason: 'AI 데이터 분석 기능 고도화와 신규 고객 관리 화면 개발을 위한 인력 충원',
    work_type: '정규직',
    status: 'on_going',
    created_at: '2026-06-01T09:00:00+09:00',
    updated_at: '2026-06-08T15:20:00+09:00',
  },
  {
    id: 2,
    job_name: '백엔드 API 개발자 채용',
    education_level: '대졸 이상',
    major: '컴퓨터 공학, 소프트웨어 공학 또는 관련 전공',
    career_level: '경력 2년 이상',
    required_skill: ['Python', 'REST API', 'DB 설계'],
    preferred_skill: ['Django', 'FastAPI', 'Docker'],
    main_task: '지원서 분석 API와 인증/권한 서버 기능 개발',
    hiring_reason: '분석 요청 증가에 따른 백엔드 처리 안정화',
    work_type: '정규직',
    status: 'prepare',
    created_at: '2026-06-03T10:00:00+09:00',
    updated_at: '2026-06-08T11:30:00+09:00',
  },
  {
    id: 3,
    job_name: 'AI 데이터 분석 인턴 채용',
    education_level: '학력 무관',
    major: '데이터 분석, 통계, 컴퓨터 공학 우대',
    career_level: '신입 또는 인턴',
    required_skill: ['SQL', 'Python', '데이터 전처리'],
    preferred_skill: ['Pandas', '시각화', 'LLM 활용 경험'],
    main_task: '채용 데이터 정제, 리포트 품질 검토, 체크리스트 개선',
    hiring_reason: '분석 리포트 품질 관리 업무 보강',
    work_type: '인턴',
    status: 'closed',
    created_at: '2026-05-20T09:00:00+09:00',
    updated_at: '2026-06-05T17:00:00+09:00',
  },
];

const resumes: Resume[] = [
  {
    id: 1,
    job_description_id: 1,
    name: '이수진',
    skill: ['Java', 'Spring Boot', 'MySQL', 'Docker', 'JavaScript'],
    education_level: {
      final_degree: 'master',
      bachelor: '부산대학교 컴퓨터공학과',
      master: 'KAIST 전산학부',
      doctoral: '',
    },
    experience: [
      {
        company_name: 'ABC Tech',
        length: '2년 3개월',
        position: '백엔드 개발자',
      },
    ],
    self_intoduction: [
      {
        question: '갈등이 발생한 상황과 그걸 해결하기 위해 한 노력',
        answer:
          'ERP API 일정 지연 상황에서 담당 범위를 재조정하고 우선순위를 다시 세워 팀 일정에 맞춰 배포했습니다.',
      },
      {
        question: '지원 직무에 빠르게 적응하기 위한 계획',
        answer:
          'JavaScript 기본기를 보강하고 React, Vue 기반 사이드 프로젝트를 진행하며 프론트엔드 업무 흐름을 익히고 있습니다.',
      },
    ],
    certification: ['정보처리기사', 'AWS Developer Associate'],
    language: [
      {
        language_name: '영어',
        test_name: 'TOEIC',
        score: '925',
      },
      {
        language_name: '일본어',
        test_name: 'JLPT',
        score: 'N2',
      },
    ],
    award: [
      {
        award_name: '캡스톤 디자인 우수상',
        award_from: '부산대학교',
        time: '2021-11',
      },
    ],
    training: [
      {
        education_name: 'Family AI Camp',
        education_from: '플레이데이터',
        education_description: 'AI 서비스 기획과 데이터 분석 실습',
        start: '2025-03',
        end: '2025-08',
      },
    ],
    other_activity: [
      {
        activity_name: '오픈소스 프로젝트 기여',
        activity_description: '문서 자동화 도구 이슈 수정과 리뷰 참여',
        start: '2024-02',
        end: '2024-08',
      },
    ],
    status: 'done',
    reviewed: true,
    reviewed_at: '2026-06-08T16:20:00+09:00',
    created_at: '2026-06-06T09:30:00+09:00',
    updated_at: '2026-06-08T16:20:00+09:00',
  },
  {
    id: 2,
    job_description_id: 1,
    name: '김하늘',
    skill: ['HTML', 'CSS', 'JavaScript', 'React', 'Vite'],
    education_level: {
      final_degree: 'bachelor',
      bachelor: '홍익대학교 컴퓨터공학과',
      master: '',
      doctoral: '',
    },
    experience: [
      {
        company_name: 'UI Factory',
        length: '3년 1개월',
        position: '프론트엔드 개발자',
      },
    ],
    self_intoduction: [
      {
        question: '사용자 경험을 개선한 경험',
        answer: '고객 관리 화면의 입력 단계를 줄이고 유효성 검증 메시지를 개선해 이탈률을 낮췄습니다.',
      },
    ],
    certification: ['웹디자인기능사'],
    language: [
      {
        language_name: '영어',
        test_name: 'OPIc',
        score: 'IM2',
      },
    ],
    award: [],
    training: [],
    other_activity: [],
    status: 'processing',
    reviewed: false,
    reviewed_at: null,
    created_at: '2026-06-07T13:10:00+09:00',
    updated_at: '2026-06-08T13:00:00+09:00',
  },
  {
    id: 3,
    job_description_id: 2,
    name: '박민재',
    skill: ['Python', 'Django', 'PostgreSQL', 'Docker'],
    education_level: {
      final_degree: 'bachelor',
      bachelor: '숭실대학교 소프트웨어학부',
      master: '',
      doctoral: '',
    },
    experience: [
      {
        company_name: 'Cloud Nine',
        length: '2년 6개월',
        position: '서버 개발자',
      },
    ],
    self_intoduction: [
      {
        question: '장애 상황을 해결한 경험',
        answer: '배포 후 API 응답 지연을 로그와 지표로 추적해 쿼리 병목을 개선했습니다.',
      },
    ],
    certification: ['SQLD'],
    language: [],
    award: [],
    training: [
      {
        education_name: 'Backend Performance Lab',
        education_from: '사내 교육',
        education_description: 'API 성능 개선과 컨테이너 배포 실습',
        start: '2025-09',
        end: '2025-10',
      },
    ],
    other_activity: [],
    status: 'onqueue',
    reviewed: false,
    reviewed_at: null,
    created_at: '2026-06-08T10:40:00+09:00',
    updated_at: '2026-06-08T10:40:00+09:00',
  },
];

const analysisReports: AnalysisReport[] = [
  {
    id: 1,
    resume_id: 1,
    overall_grade: 'B',
    overall_summary:
      '이수진 지원자는 뛰어난 학력과 백엔드 개발 업무 경험을 갖추었으며, 문제 해결 능력과 팀워크가 강점입니다. 그러나 프론트엔드 기술 및 경험이 부족하여 해당 직무 요구사항에 다소 미흡한 점이 있습니다.',
    candidate_summary:
      '부산대학교 컴퓨터공학과 학사, KAIST 전산학부 석사 학력을 보유하고 있으며, ABC Tech에서 2년 3개월 동안 백엔드 개발자로 근무했습니다.',
    checklist: [
      {
        content: '컴퓨터 공학 또는 관련 전공 학사 학위 이상을 보유하고 있는가?',
        result: true,
      },
      {
        content: '프론트엔드 개발 분야에서 최소 3년 이상의 경력을 보유했는가?',
        result: false,
      },
      {
        content: 'HTML, CSS, JavaScript 기술스택에 능숙한가?',
        result: true,
      },
    ],
    competency_analysis: [
      '컴퓨터공학 관련 학사 및 석사 학위를 취득하여 전문 지식 기반이 탄탄함',
      'Java, Spring Boot, MySQL, Docker 등 다양한 백엔드 기술 스택 활용 가능',
      '프로젝트 일정 문제 발생 시 업무 재분배 및 우선순위 조정으로 문제 해결 능력 입증',
    ],
    fit_analysis: [
      '팀 내 원활한 커뮤니케이션과 협업 도구 활용 능력이 뛰어남',
      '프론트엔드 관련 요구사항은 충족하지 못해 직무 적합성에 일부 제한이 존재',
    ],
    strength: [
      '우수한 학력과 전문 자격을 통한 뛰어난 기술력',
      '백엔드 개발 경험과 문제 해결 능력',
      '협업 및 커뮤니케이션 능력이 우수하여 팀워크에 강점',
    ],
    concern: [
      '프론트엔드 개발 경력 및 기술 보유 부족',
      'SaaS 기반 업무 자동화 플랫폼 또는 AI 데이터 분석 기능 관련 경험 부재',
    ],
    check_point: [
      '프론트엔드 역량 강화 및 교육 추천',
      '서버 운영 및 인증/권한 부문 경험 추가 검증 필요',
    ],
    final_comment:
      '기술력과 협업 태도는 긍정적이나, 이번 포지션에 요구되는 프론트엔드 경험은 추가 검증이 필요합니다.',
  },
  {
    id: 2,
    resume_id: 2,
    overall_grade: 'A',
    overall_summary:
      '김하늘 지원자는 프론트엔드 개발 경력, 필수 기술 스택, SaaS 화면 개선 경험이 JD와 잘 맞습니다.',
    candidate_summary:
      '홍익대학교 컴퓨터공학과 학사이며 UI Factory에서 3년 1개월 동안 고객 관리 UI와 디자인 시스템 개선을 담당했습니다.',
    checklist: [
      {
        content: '프론트엔드 개발 분야에서 최소 3년 이상의 경력을 보유했는가?',
        result: true,
      },
      {
        content: 'React, Vue 또는 Vite 프레임워크를 사용한 프로젝트 경험이 있는가?',
        result: true,
      },
    ],
    competency_analysis: ['React와 Vite 기반 프로젝트 경험 보유', '고객 관리 화면 UX 개선 경험 보유'],
    fit_analysis: ['JD의 필수 기술과 주요 업무가 대부분 일치', '팀 협업 및 문서화 경험도 확인됨'],
    strength: ['프론트엔드 실무 경력', '사용자 흐름 개선 경험', '필수 기술 스택 보유'],
    concern: ['AI 데이터 분석 기능 구현 경험은 추가 확인 필요'],
    check_point: ['AI 기능과 연동되는 UI 구현 경험을 면접에서 확인'],
    final_comment: '직무 적합도가 높아 우선 면접 대상자로 추천합니다.',
  },
  {
    id: 3,
    resume_id: 3,
    overall_grade: 'B',
    overall_summary:
      '박민재 지원자는 백엔드 API 개발 경력과 서버 운영 경험이 JD와 잘 맞지만, 분석 도메인 경험은 추가 확인이 필요합니다.',
    candidate_summary:
      '숭실대학교 소프트웨어학부 학사이며 Cloud Nine에서 2년 6개월 동안 서버 개발자로 근무했습니다.',
    checklist: [
      {
        content: 'Python, REST API, DB 설계 경험을 보유했는가?',
        result: true,
      },
      {
        content: '인증/권한 또는 서버 배포 경험을 보유했는가?',
        result: true,
      },
    ],
    competency_analysis: ['Python과 Django 기반 API 개발 경험 보유', '쿼리 병목 개선과 배포 운영 경험 보유'],
    fit_analysis: ['백엔드 필수 역량은 충족', '지원서 분석 도메인과 LLM 연동 경험은 확인 필요'],
    strength: ['API 성능 개선 경험', 'DB 설계와 배포 운영 경험'],
    concern: ['LLM 분석 API 운영 경험은 명확하지 않음'],
    check_point: ['LLM 기반 비동기 분석 처리 경험 확인'],
    final_comment: '백엔드 개발자로서 기본 역량은 충분하며 도메인 경험 중심의 추가 검증이 필요합니다.',
  },
];

const interviewQuestions: InterviewQuestion[] = [
  {
    id: 1,
    resume_id: 1,
    question:
      '프론트엔드 개발 경력이 3년 이상은 아닌데, 부족한 경험을 어떻게 보완하고 빠르게 적응할 계획인가요?',
    answer:
      '백엔드 개발자로 2년 3개월간 Java와 Spring Boot를 활용한 API 개발 경험이 있으며, HTML, CSS, JavaScript 기본기를 집중적으로 학습하고 React와 Vue도 단계적으로 학습할 계획입니다.',
    purpose: '지원자의 프론트엔드 경력 부족을 어떻게 극복할지 학습 의지와 적응력 평가.',
  },
  {
    id: 2,
    resume_id: 1,
    question: 'SaaS 업무 자동화 플랫폼 또는 AI 데이터 분석 기능과 유사한 경험이 있나요?',
    answer:
      'ERP 시스템 API 개발과 데이터 처리 경험이 있으며, AI 분석 기능은 교육 과정과 개인 프로젝트를 통해 확장 중입니다.',
    purpose: '회사 도메인과 JD 주요 업무에 대한 이해도 검증.',
  },
  {
    id: 3,
    resume_id: 2,
    question: '고객 관리 화면의 이탈률을 낮춘 과정에서 어떤 지표를 보고 판단했나요?',
    answer:
      '단계별 이탈률과 입력 오류 발생 빈도를 확인했고, 유효성 검증 메시지와 폼 순서를 조정했습니다.',
    purpose: '프론트엔드 개선 경험의 실제 기여도와 판단 근거 확인.',
  },
  {
    id: 4,
    resume_id: 3,
    question: '분석 요청이 급증했을 때 API 안정성을 어떻게 확보할 수 있나요?',
    answer:
      '큐 기반 비동기 처리와 재시도 정책을 적용하고, 병목 구간을 메트릭으로 추적해 단계적으로 개선하겠습니다.',
    purpose: '백엔드 처리 안정화 역량과 운영 관점 확인.',
  },
];

export const accountApiResponse = {
  error: false,
  message: '계정 정보를 불러왔습니다.',
  data: account,
} satisfies ApiResponse<Account>;

export const authKeysApiResponse = {
  error: false,
  message: '인증 키 목록을 불러왔습니다.',
  data: authKeys,
} satisfies ApiResponse<AuthKey[]>;

export const companyApiResponse = {
  error: false,
  message: '회사 정보를 불러왔습니다.',
  data: companyInfo,
} satisfies ApiResponse<CompanyInfo>;

export const jobDescriptionsApiResponse = {
  error: false,
  message: 'JD 목록을 불러왔습니다.',
  meta: {
    page: 1,
    page_size: 20,
    total_count: jobDescriptions.length,
    requested_at: '2026-06-09T09:00:00+09:00',
  },
  data: jobDescriptions,
} satisfies ApiResponse<JobDescription[]>;

export const resumesApiResponse = {
  error: false,
  message: '지원서 목록을 불러왔습니다.',
  data: resumes,
} satisfies ApiResponse<Resume[]>;

export const analysisReportsApiResponse = {
  error: false,
  message: '분석 리포트 목록을 불러왔습니다.',
  data: analysisReports,
} satisfies ApiResponse<AnalysisReport[]>;

export const interviewQuestionsApiResponse = {
  error: false,
  message: '면접 질문 목록을 불러왔습니다.',
  data: interviewQuestions,
} satisfies ApiResponse<InterviewQuestion[]>;

export const dashboardApiResponse = {
  error: false,
  message: '대시보드 데이터를 불러왔습니다.',
  meta: {
    requested_at: '2026-06-09T09:00:00+09:00',
  },
  data: {
    account,
    company_info: companyInfo,
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports,
    interview_questions: interviewQuestions,
  },
} satisfies ApiResponse<{
  account: Account;
  company_info: CompanyInfo;
  job_descriptions: JobDescription[];
  resumes: Resume[];
  analysis_reports: AnalysisReport[];
  interview_questions: InterviewQuestion[];
}>;

export const coverLetterDraftApiResponse = {
  error: false,
  message: '지원서 입력 초안을 불러왔습니다.',
  data: resumes[0],
} satisfies ApiResponse<Resume>;

export const coverLettersApiResponse = resumesApiResponse;

export const analysisReportApiResponse = {
  error: false,
  message: '분석 리포트를 불러왔습니다.',
  data: analysisReports[0],
} satisfies ApiResponse<AnalysisReport>;

export const recruitmentPostApiResponse = {
  error: false,
  message: '모집 공고를 생성했습니다.',
  data: {
    title: jobDescriptions[0].job_name,
    sections: [
      `${companyInfo.company_name}는 ${companyInfo.company_description}`,
      `주요 업무는 ${jobDescriptions[0].main_task}입니다.`,
      `필수 역량은 ${jobDescriptions[0].required_skill.join(', ')}이며, 우대 역량은 ${jobDescriptions[0].preferred_skill.join(', ')}입니다.`,
      `근무 형태는 ${jobDescriptions[0].work_type}, 요구 경력은 ${jobDescriptions[0].career_level}입니다.`,
    ],
  },
} satisfies ApiResponse<{
  title: string;
  sections: string[];
}>;

export const coverLetterTemplateApiResponse = interviewQuestionsApiResponse;

export const userProfileApiResponse = accountApiResponse;

export const authDefaultsApiResponse = {
  error: false,
  message: '인증 화면 기본값을 불러왔습니다.',
  data: authDefaults,
} satisfies ApiResponse<Account>;
