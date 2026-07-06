import {
  type Account,
  type AnalysisReport,
  type ApiResponse,
  type AuthKey,
  type Checklist,
  type CompanyInfo,
  type InterviewQuestion,
  type JobDescription,
  type Resume,
} from '../data/backendTypes';
import type { ChatMessage } from '../data/appConfig';
import {
  parseAccount,
  parseAnalysisReport,
  parseAnalysisReports,
  parseAuthKey,
  parseAuthKeys,
  parseChecklist,
  parseChecklists,
  parseCompanyInfo,
  parseInterviewQuestions,
  parseJobDescription,
  parseJobDescriptions,
  parseResume,
  parseResumes,
} from './backendSchemas';
import {
  getRequestErrorMessage,
  httpClient,
  normalizePayload,
  requestAction,
  requestBackend,
  type BackendEnvelope,
} from './httpClient';

type BackendChatMessage = {
  role: 'user' | 'agent';
  message: string;
};

type DashboardPayload = {
  account: Account;
  company_info: CompanyInfo;
  job_descriptions: JobDescription[];
  resumes: Resume[];
  analysis_reports: AnalysisReport[];
  interview_questions: InterviewQuestion[];
};

type SignupBody = {
  username: string;
  password: string;
  name: string;
  verification_question: string;
  verification_answer: string;
};

type AccountModifyBody = Partial<Omit<Account, 'id' | 'username' | 'account_hash'>> & {
  delete?: boolean;
  formal_password?: string;
  password?: string;
} & Partial<Pick<Account, 'id' | 'username' | 'account_hash'>>;

type AuthKeyAddBody = {
  name: string;
  description?: string;
  credit_limit?: number;
  authorized_resume?: number[];
};

type AuthKeyModifyBody = Partial<Omit<AuthKey, 'value'>> & {
  id: number;
  delete?: boolean;
};

type ChecklistGetBody = {
  job_description_id: number;
};

type ChecklistAddBody = {
  job_description_id: number;
  content: string;
};

type ChecklistModifyBody = {
  id: number;
  content: string;
};

type GenerateJdChecklistOptions = {
  query?: string;
  cnt?: number;
};

type CompanyInfoModifyBody = Partial<Omit<CompanyInfo, 'id'>>;

type JobDescriptionAddBody = {
  job_name: string;
  education_level?: string;
  major?: string;
  career_level: string;
  required_skill: string[];
  preferred_skill?: string[];
  main_task?: string;
  hiring_reason?: string;
  work_type?: string;
  status?: JobDescription['status'];
};

type JobDescriptionModifyBody = Partial<JobDescriptionAddBody> & {
  id: number;
  delete?: boolean;
};

type ResumeAddBody = Partial<
  Pick<
    Resume,
    | 'name'
    | 'skill'
    | 'education_level'
    | 'experience'
    | 'self_intoduction'
    | 'certification'
    | 'language'
    | 'award'
    | 'training'
    | 'other_activity'
  >
> & {
  job_description_id: number;
};

type ResumeModifyBody = Partial<Omit<ResumeAddBody, 'job_description_id'>> & {
  id: number;
  delete?: boolean;
};

type ReportModifyBody = Partial<
  Omit<AnalysisReport, 'resume_id' | 'status' | 'created_at' | 'version' | 'interview_question'>
> & {
  id: number;
  delete?: boolean;
};

type QuestionModifyBody = Partial<Omit<InterviewQuestion, 'resume_id'>> & {
  id: number;
};

type ResumeAnalysisResult = {
  report: AnalysisReport;
  questions: InterviewQuestion[];
};

type ResumeAnalysisPayload = ResumeAnalysisResult & {
  jd_id: string;
  resume_id: number;
};

type PingPayload = {
  ok: true;
};

type ApiKeyCreditPayload = {
  credit: number;
};

function toTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item : item === null || item === undefined ? '' : String(item)))
    .filter(Boolean);
}

function toApiResponse<T>(message: string, data: T): ApiResponse<T> {
  return {
    error: false,
    message,
    data,
    meta: {
      requested_at: new Date().toISOString(),
    },
  };
}

const INVALID_LOGIN_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다.';

function getLoginErrorMessage(error: unknown) {
  const message = getRequestErrorMessage(error, '로그인에 실패했습니다.');

  if (/invalid credentials/i.test(message)) {
    return INVALID_LOGIN_MESSAGE;
  }

  return message;
}

function getReportQuestions(report: AnalysisReport): InterviewQuestion[] {
  return parseInterviewQuestions(
    report.interview_question.map((question, index) => ({
      ...question,
      id: question.id ?? index + 1,
      resume_id: question.resume_id ?? report.resume_id,
    })),
  );
}

function getReportsQuestions(reports: AnalysisReport[]): InterviewQuestion[] {
  return reports.flatMap((report) => getReportQuestions(report));
}

async function loginRequest(username: string, password: string) {
  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>('/login/', { username, password });
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw new Error(payload.message || '로그인에 실패했습니다.');
    }

    return payload;
  } catch (error) {
    throw new Error(getLoginErrorMessage(error));
  }
}

async function checkUserRequest(username: string) {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    throw new Error('아이디를 입력하세요.');
  }

  const payload = await requestAction('checkuser', { username: trimmedUsername });

  if (typeof payload.valid !== 'boolean') {
    throw new Error('아이디 중복 확인 응답이 올바르지 않습니다.');
  }

  return payload.valid;
}

async function passwordQuestionRequest(username: string) {
  const payload = await requestAction('passqestion', { username });
  const verificationQuestion = payload.verification_question;

  if (typeof verificationQuestion !== 'string') {
    throw new Error('본인확인 질문을 불러오지 못했습니다.');
  }

  return verificationQuestion;
}

async function passwordResetRequest(username: string, verificationAnswer: string) {
  const payload = await requestAction('passreset', {
    username,
    verification_answer: verificationAnswer,
  });
  const password = payload.password;

  if (typeof password !== 'string') {
    throw new Error('재설정된 비밀번호를 불러오지 못했습니다.');
  }

  return password;
}

function toBackendChatMessages(messages: ChatMessage[]): BackendChatMessage[] {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'agent' : 'user',
    message: message.text,
  }));
}

async function chatRequest(messages: ChatMessage[], apiKey?: string) {
  const payload = await requestAction('chat', {
    chat: toBackendChatMessages(messages),
  }, { apiKey });
  const response = payload.response;

  if (!response || typeof response !== 'object') {
    throw new Error('채팅 응답을 불러오지 못했습니다.');
  }

  const chatResponse = response as Partial<BackendChatMessage>;

  if (typeof chatResponse.message !== 'string') {
    throw new Error('채팅 응답 메시지를 불러오지 못했습니다.');
  }

  return {
    role: chatResponse.role === 'user' ? 'user' : 'assistant',
    text: chatResponse.message,
  } satisfies ChatMessage;
}

async function signinRequest(body: {
  username: string;
  password: string;
  name: string;
  verification_question: string;
  verification_answer: string;
}) {
  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>('/signin/', body);
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw new Error(payload.message || '회원가입에 실패했습니다.');
    }

    return payload;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error, '회원가입에 실패했습니다.'));
  }
}

async function pingRequest(): Promise<PingPayload> {
  const response = await httpClient.get<unknown>('/ping/');
  const payload = response.data;

  if (!payload || typeof payload !== 'object' || (payload as Partial<PingPayload>).ok !== true) {
    throw new Error('백엔드 healthcheck 응답이 올바르지 않습니다.');
  }

  return { ok: true };
}

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function getAccount() {
  return parseAccount(await requestBackend<Account>('account/get'));
}

async function getCompanyInfo() {
  return parseCompanyInfo(await requestBackend<CompanyInfo>('compinfo/get'));
}

async function getJobDescriptions(apiKey?: string) {
  return parseJobDescriptions(await requestBackend<JobDescription[]>('jd/get', {}, { apiKey }));
}

async function getResumesForJob(jobDescriptionId: number, apiKey?: string) {
  const data = await requestBackend<Resume[] | Resume>('resume/get', { job_description_id: jobDescriptionId }, { apiKey });
  return parseResumes(ensureArray(data));
}

async function getReportsForResume(resumeId: number, apiKey?: string) {
  return parseAnalysisReports(await requestBackend<AnalysisReport[]>('report/get', { resume_id: resumeId }, { apiKey }));
}

async function getDashboardData(): Promise<DashboardPayload> {
  const [account, companyInfo, jobDescriptions] = await Promise.all([
    getAccount(),
    getCompanyInfo(),
    getJobDescriptions(),
  ]);
  const resumes = (await Promise.all(jobDescriptions.map((job) => getResumesForJob(job.id)))).flat();
  const analysisReports = (await Promise.all(resumes.map((resume) => getReportsForResume(resume.id)))).flat();

  return {
    account,
    company_info: companyInfo,
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports,
    interview_questions: getReportsQuestions(analysisReports),
  };
}

function buildApiKeyAccount(credit: number): Account {
  return {
    id: 0,
    username: 'api-key-user',
    account_hash: '',
    name: 'API Key 사용자',
    verification_question: '',
    verification_answer: '',
    credit,
    subscribe: false,
    subscribe_expiration: '',
  };
}

function buildApiKeyCompanyInfo(): CompanyInfo {
  return {
    id: 0,
    company_name: 'API Key Workspace',
    employee_count: 0,
    team_composition: [],
    company_description: 'API Key로 허용된 JD와 지원서를 조회합니다.',
    employ_style: [],
  };
}

async function getApiKeyDashboardData(apiKey: string): Promise<DashboardPayload> {
  const [jobDescriptions, creditData] = await Promise.all([
    getJobDescriptions(apiKey),
    requestBackend<ApiKeyCreditPayload>('authkey/credit', {}, { apiKey }),
  ]);
  const resumes = (await Promise.all(jobDescriptions.map((job) => getResumesForJob(job.id, apiKey)))).flat();
  const analysisReports = (await Promise.all(resumes.map((resume) => getReportsForResume(resume.id, apiKey)))).flat();

  return {
    account: buildApiKeyAccount(creditData.credit),
    company_info: buildApiKeyCompanyInfo(),
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports,
    interview_questions: getReportsQuestions(analysisReports),
  };
}

function buildRecruitmentPreview(companyInfo: CompanyInfo, jobDescription?: JobDescription) {
  if (!jobDescription) {
    return {
      title: '모집 공고 미리보기',
      sections: [
        `${companyInfo.company_name || '회사'}의 회사 정보를 기준으로 표시합니다.`,
        '모집 공고 생성/다운로드는 현재 backend API가 없어 준비중입니다.',
      ],
    };
  }

  return {
    title: jobDescription.job_name,
    sections: [
      `${companyInfo.company_name} - ${companyInfo.company_description}`,
      `주요 업무는 ${jobDescription.main_task}입니다.`,
      `필수 역량은 ${toTextList(jobDescription.required_skill).join(', ')}이며, 우대 역량은 ${toTextList(
        jobDescription.preferred_skill,
      ).join(', ')}입니다.`,
      `근무 형태는 ${jobDescription.work_type}, 요구 경력은 ${jobDescription.career_level}입니다.`,
    ],
  };
}

async function getDashboardSource() {
  return getDashboardData();
}

async function getResumeSourceForJob(jobDescriptionId: number) {
  return getResumesForJob(jobDescriptionId);
}

async function deprecatedRequestResumeAnalysisForJob(jdId: string): Promise<ResumeAnalysisPayload> {
  throw new Error(`JD ${jdId} 분석은 지원자가 모호할 수 있습니다. requestResumeAnalysis(resumeId)를 사용해 주세요.`);
  const resumes = await getResumeSourceForJob(Number(jdId));
  const resume = resumes[0];

  if (!resume) {
    throw new Error('분석 요청할 지원서가 없습니다.');
  }

  const report = parseAnalysisReport(await requestBackend<AnalysisReport>('resume/analyze', { id: resume.id }));

  return {
    jd_id: jdId,
    resume_id: resume.id,
    report,
    questions: getReportQuestions(report),
  };
}

async function requestResumeAnalysisById(resumeId: number, apiKey?: string): Promise<ResumeAnalysisPayload> {
  const resumes = parseResumes(
    ensureArray(await requestBackend<Resume[] | Resume>('resume/get', { id: resumeId }, { apiKey })),
  );
  const resume = resumes.find((item) => item.id === resumeId) ?? resumes[0];

  if (!resume) {
    throw new Error('분석 요청할 지원서를 찾을 수 없습니다.');
  }

  const report = parseAnalysisReport(
    await requestBackend<AnalysisReport>('resume/analyze', { id: resume.id }, { apiKey }),
  );

  return {
    jd_id: String(resume.job_description_id),
    resume_id: resume.id,
    report,
    questions: getReportQuestions(report),
  };
}

function getResumeAnalysisMessage(report: AnalysisReport) {
  return report.status === 'done' ? '지원서 분석을 완료했습니다.' : '지원서 분석 요청이 접수되었습니다.';
}

function sanitizeAccountModifyBody(body: AccountModifyBody): Record<string, unknown> {
  const allowedBody: Record<string, unknown> = { ...body };
  delete allowedBody.id;
  delete allowedBody.username;
  delete allowedBody.account_hash;
  return allowedBody;
}

async function getSharedResumeBundle(resumeId: number, apiKey: string) {
  const resumes = parseResumes(
    ensureArray(await requestBackend<Resume[] | Resume>('resume/get', { id: resumeId }, { apiKey })),
  );
  const resume = resumes.find((item) => item.id === resumeId) ?? resumes[0];

  if (!resume) {
    throw new Error('공유 지원서 정보를 찾을 수 없습니다.');
  }

  const [jobDescriptions, reports] = await Promise.all([
    getJobDescriptions(apiKey),
    getReportsForResume(resume.id, apiKey),
  ]);
  const jobDescription = jobDescriptions.find((item) => item.id === resume.job_description_id) ?? null;

  return {
    resume,
    jobDescription,
    jobDescriptions,
    reports,
    questions: getReportsQuestions(reports),
  };
}

function unsupportedBackendFeature(featureName: string): never {
  throw new Error(`${featureName}은 현재 backend API가 없어 준비중입니다.`);
}

export const apiClient = {
  ping: async () => toApiResponse('백엔드 연결을 확인했습니다.', await pingRequest()),

  getDashboard: async () => toApiResponse('대시보드 데이터를 불러왔습니다.', await getDashboardSource()),

  getApiKeyDashboard: async (apiKey: string) =>
    toApiResponse('API Key 접근 데이터를 불러왔습니다.', await getApiKeyDashboardData(apiKey)),

  loginWithApiKey: async (apiKey: string) => {
    try {
      await getApiKeyDashboardData(apiKey);
    } catch {
      throw new Error('API Key가 유효하지 않거나 접근 권한이 없습니다.');
    }

    return toApiResponse('API Key로 로그인했습니다.', { authenticated: true });
  },

  getCompanyProfile: async () =>
    toApiResponse('회사 정보를 불러왔습니다.', await getCompanyInfo()),

  getJobDescriptions: async (apiKey?: string) =>
    toApiResponse('JD 목록을 불러왔습니다.', await getJobDescriptions(apiKey)),

  getChecklist: async (jobDescriptionId: number, apiKey?: string) => {
    const body: ChecklistGetBody = { job_description_id: jobDescriptionId };
    const data = parseChecklists(await requestBackend<Checklist[]>('checklist/get', body, { apiKey }));

    return toApiResponse('체크리스트를 불러왔습니다.', data);
  },

  generateJdChecklist: async (jdId: number | string, apiKey?: string, options: GenerateJdChecklistOptions = {}) => {
    const body: { id: number; query?: string; cnt?: number } = { id: Number(jdId) };
    const query = options.query?.trim();

    if (query) {
      body.query = query;
    }

    if (typeof options.cnt === 'number' && Number.isFinite(options.cnt)) {
      body.cnt = Math.max(0, Math.min(10, Math.trunc(options.cnt)));
    }

    const data = parseChecklists(await requestBackend<Checklist[]>('jd/analyze', body, { apiKey }));

    return toApiResponse('체크리스트를 생성했습니다.', data);
  },

  addChecklist: async (body: ChecklistAddBody, apiKey?: string) => {
    const data = parseChecklist(await requestBackend<Checklist>('checklist/add', body, { apiKey }));

    return toApiResponse('체크리스트를 추가했습니다.', data);
  },

  updateChecklist: async (body: ChecklistModifyBody, apiKey?: string) => {
    const data = parseChecklist(await requestBackend<Checklist>('checklist/modify', body, { apiKey }));

    return toApiResponse('체크리스트를 수정했습니다.', data);
  },

  deleteChecklist: async (id: number, apiKey?: string) => {
    const data = parseChecklist(await requestBackend<Checklist>('checklist/modify', { id, delete: true }, { apiKey }));

    return toApiResponse('체크리스트를 삭제했습니다.', data);
  },

  getCoverLetterDraft: async () => {
    const dashboard = await getDashboardSource();
    return toApiResponse('지원서 입력 초안을 불러왔습니다.', dashboard.resumes[0] ?? null);
  },

  getCoverLetters: async () => {
    const dashboard = await getDashboardSource();
    return toApiResponse('지원서 목록을 불러왔습니다.', dashboard.resumes);
  },

  getAnalysisReport: async () => {
    const dashboard = await getDashboardSource();
    return toApiResponse('분석 리포트를 불러왔습니다.', dashboard.analysis_reports[0] ?? null);
  },

  getRecruitmentPreview: async () => {
    const dashboard = await getDashboardSource();
    return toApiResponse(
      '모집 공고 미리보기를 생성했습니다.',
      buildRecruitmentPreview(
        dashboard.company_info,
        dashboard.job_descriptions[0],
      ),
    );
  },

  getCoverLetterTemplate: async () => {
    const dashboard = await getDashboardSource();
    return toApiResponse('면접 질문 목록을 불러왔습니다.', dashboard.interview_questions);
  },

  getUserProfile: async () => toApiResponse('계정 정보를 불러왔습니다.', await getAccount()),

  login: async (username: string, password: string) => {
    await loginRequest(username, password);
    const account = await getAccount();

    return toApiResponse('로그인되었습니다.', { authenticated: true, account });
  },

  logout: async () => {
    await requestAction('logout');

    return toApiResponse('로그아웃되었습니다.', { logout: true });
  },

  saveCompanyProfile: async (body: CompanyInfoModifyBody = {}) => {
    await requestAction('compinfo/modify', body);

    return toApiResponse('회사 정보가 저장되었습니다.', { updated_at: new Date().toISOString() });
  },

  getAuthKeys: async () =>
    toApiResponse(
      '인증 키 목록을 불러왔습니다.',
      parseAuthKeys(await requestBackend<AuthKey[]>('authkey/get')),
    ),

  addAuthKey: async (body: AuthKeyAddBody) => {
    const data = parseAuthKey(await requestBackend<AuthKey>('authkey/add', body));

    return toApiResponse('인증 키를 생성했습니다.', data);
  },

  saveAuthKey: async (body: AuthKeyModifyBody) => {
    await requestAction('authkey/modify', body);

    return toApiResponse('인증 키를 저장했습니다.', { updated_at: new Date().toISOString() });
  },

  deleteAuthKey: async (id: number) => {
    await requestAction('authkey/modify', { id, delete: true });

    return toApiResponse('인증 키를 삭제했습니다.', { id });
  },

  addJobDescription: async (body: JobDescriptionAddBody) => {
    const data = parseJobDescription(await requestBackend<JobDescription>('jd/add', body));

    return toApiResponse('JD를 등록했습니다.', data);
  },

  saveJobDescription: async (body: JobDescriptionModifyBody, apiKey?: string) => {
    const data = parseJobDescription(await requestBackend<JobDescription>('jd/modify', body, { apiKey }));

    return toApiResponse('JD를 저장했습니다.', data);
  },

  deleteJobDescription: async (id: number, apiKey?: string) => {
    const data = parseJobDescription(await requestBackend<JobDescription>('jd/modify', { id, delete: true }, { apiKey }));

    return toApiResponse('JD를 삭제했습니다.', data ?? { id });
  },

  requestJobAnalysis: async (jdId: string) => {
    const data = await deprecatedRequestResumeAnalysisForJob(jdId);
    return toApiResponse('지원서 분석 요청이 완료되었습니다.', data);
  },

  addResume: async (body: ResumeAddBody) => {
    const data = parseResume(await requestBackend<Resume>('resume/add', body));

    return toApiResponse('지원서를 저장했습니다.', data);
  },

  saveResume: async (body: ResumeModifyBody, apiKey?: string) => {
    const data = parseResume(await requestBackend<Resume>('resume/modify', body, { apiKey }));

    return toApiResponse('지원서를 수정했습니다.', data);
  },

  deleteResume: async (id: number, apiKey?: string) => {
    const data = parseResume(await requestBackend<Resume>('resume/modify', { id, delete: true }, { apiKey }));

    return toApiResponse('지원서를 삭제했습니다.', data ?? { id });
  },

  uploadCoverLetters: async (body?: ResumeAddBody) => {
    if (body) {
      return apiClient.addResume(body);
    }

    const dashboard = await getDashboardSource();
    return toApiResponse('지원서 데이터를 불러왔습니다.', { uploaded_count: dashboard.resumes.length });
  },

  requestCoverLetterAnalysis: async (jdId: string) => {
    const data = await deprecatedRequestResumeAnalysisForJob(jdId);
    return toApiResponse('지원서 분석이 완료되었습니다.', data);
  },

  requestResumeAnalysis: async (resumeId: number, apiKey?: string) => {
    const data = await requestResumeAnalysisById(resumeId, apiKey);
    return toApiResponse(getResumeAnalysisMessage(data.report), data);
  },

  sendChatMessage: async (
    question: string,
    messages: ChatMessage[] = [],
    apiKey?: string,
  ): Promise<ApiResponse<ChatMessage>> => {
    const chatMessages = messages.length ? messages : [{ role: 'user', text: question } satisfies ChatMessage];
    return toApiResponse('AI 응답이 추가되었습니다.', await chatRequest(chatMessages, apiKey));
  },

  saveUserProfile: async (body: AccountModifyBody = {}) => {
    await requestAction('account/modify', sanitizeAccountModifyBody(body));

    return toApiResponse('계정 수정사항을 저장했습니다.', { updated_at: new Date().toISOString() });
  },

  saveReport: async (body: ReportModifyBody, apiKey?: string) => {
    const data = parseAnalysisReport(await requestBackend<AnalysisReport>('report/modify', body, { apiKey }));

    return toApiResponse('분석 리포트를 저장했습니다.', data);
  },

  deleteReport: async (id: number, apiKey?: string) => {
    const data = parseAnalysisReport(
      await requestBackend<AnalysisReport>('report/modify', { id, delete: true }, { apiKey }),
    );

    return toApiResponse('분석 리포트를 삭제했습니다.', data);
  },

  saveQuestion: async (body: QuestionModifyBody) => {
    void body;
    return unsupportedBackendFeature('면접 질문 개별 수정');
  },

  checkSignupId: async (username: string) => {
    const available = await checkUserRequest(username);
    return toApiResponse(available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.', { available });
  },

  completeSignup: async (body: SignupBody) => {
    await signinRequest({
      username: body.username,
      password: body.password,
      name: body.name,
      verification_question: body.verification_question,
      verification_answer: body.verification_answer,
    });

    return toApiResponse('가입이 완료되었습니다.', { created: true });
  },

  getPasswordQuestion: async (username: string) => {
    const verificationQuestion = await passwordQuestionRequest(username);

    return toApiResponse('본인확인 질문을 불러왔습니다.', { verification_question: verificationQuestion });
  },

  resetPassword: async (username: string, verificationAnswer: string) => {
    const password = await passwordResetRequest(username, verificationAnswer);
    return toApiResponse('비밀번호 재설정을 완료했습니다.', { password });
  },

  generateRecruitmentPost: async (_jdIds: string[]) => {
    void _jdIds;
    return unsupportedBackendFeature('모집 공고 생성');
  },

  downloadRecruitmentPdf: async () => unsupportedBackendFeature('모집 공고 PDF 다운로드'),

  generateCoverLetterTemplate: async (_jdId: string) => {
    void _jdId;
    return unsupportedBackendFeature('자기소개서 포맷 생성');
  },

  downloadTemplateDocument: async () => unsupportedBackendFeature('템플릿 문서 다운로드'),

  getSharedResumeBundle: async (resumeId: number, apiKey: string) =>
    toApiResponse('공유 분석 결과를 불러왔습니다.', await getSharedResumeBundle(resumeId, apiKey)),
};
