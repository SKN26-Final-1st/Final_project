import {
  type Account,
  type AnalysisReport,
  type ApiResponse,
  type AuthKey,
  type CompanyInfo,
  type InterviewQuestion,
  type JobDescription,
  type Resume,
} from '../data/backendTypes';
import type { ChatMessage } from '../data/appConfig';
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
};

type AuthKeyModifyBody = Partial<Omit<AuthKey, 'value'>> & {
  id: number;
  delete?: boolean;
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

type ReportModifyBody = Partial<Omit<AnalysisReport, 'resume_id'>> & {
  id: number;
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

async function loginRequest(username: string, password: string) {
  try {
    const response = await httpClient.post<BackendEnvelope<unknown> | string>('/login/', { username, password });
    const payload = normalizePayload<unknown>(response.data, response.status, response.statusText);

    if (payload.error) {
      throw new Error(payload.message || '로그인에 실패했습니다.');
    }

    return payload;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error, '로그인에 실패했습니다.'));
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

function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function getAccount() {
  return requestBackend<Account>('account/get');
}

async function getCompanyInfo() {
  return requestBackend<CompanyInfo>('compinfo/get');
}

async function getJobDescriptions(apiKey?: string) {
  return requestBackend<JobDescription[]>('jd/get', {}, { apiKey });
}

async function getResumesForJob(jobDescriptionId: number, apiKey?: string) {
  const data = await requestBackend<Resume[] | Resume>('resume/get', { job_description_id: jobDescriptionId }, { apiKey });
  return ensureArray(data);
}

async function getReportsForResume(resumeId: number, apiKey?: string) {
  try {
    return requestBackend<AnalysisReport[]>('report/get', { resume_id: resumeId }, { apiKey });
  } catch {
    return [];
  }
}

async function getQuestionsForResume(resumeId: number, apiKey?: string) {
  try {
    const data = await requestBackend<InterviewQuestion[] | InterviewQuestion>(
      'question/get',
      { resume_id: resumeId },
      { apiKey },
    );
    return ensureArray(data);
  } catch {
    return [];
  }
}

async function getDashboardData(): Promise<DashboardPayload> {
  const [account, companyInfo, jobDescriptions] = await Promise.all([
    getAccount(),
    getCompanyInfo(),
    getJobDescriptions(),
  ]);
  const resumes = (await Promise.all(jobDescriptions.map((job) => getResumesForJob(job.id)))).flat();
  const [analysisReports, interviewQuestions] = await Promise.all([
    Promise.all(resumes.map((resume) => getReportsForResume(resume.id))),
    Promise.all(resumes.map((resume) => getQuestionsForResume(resume.id))),
  ]);

  return {
    account,
    company_info: companyInfo,
    job_descriptions: jobDescriptions,
    resumes,
    analysis_reports: analysisReports.flat(),
    interview_questions: interviewQuestions.flat(),
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

async function requestResumeAnalysisForJob(jdId: string): Promise<ResumeAnalysisPayload> {
  const resumes = await getResumeSourceForJob(Number(jdId));
  const resume = resumes[0];

  if (!resume) {
    throw new Error('분석 요청할 지원서가 없습니다.');
  }

  const analysis = await requestBackend<{
        report: AnalysisReport;
        questions: InterviewQuestion[];
      }>('resume/analize', { id: resume.id });

  return {
    jd_id: jdId,
    resume_id: resume.id,
    ...analysis,
  };
}

async function requestResumeAnalysisById(resumeId: number): Promise<ResumeAnalysisPayload> {
  const resumes = ensureArray(await requestBackend<Resume[] | Resume>('resume/get', { id: resumeId }));
  const resume = resumes.find((item) => item.id === resumeId) ?? resumes[0];

  if (!resume) {
    throw new Error('분석 요청할 지원서를 찾을 수 없습니다.');
  }

  const analysis = await requestBackend<{
        report: AnalysisReport;
        questions: InterviewQuestion[];
      }>('resume/analize', { id: resume.id });

  return {
    jd_id: String(resume.job_description_id),
    resume_id: resume.id,
    ...analysis,
  };
}

function sanitizeAccountModifyBody(body: AccountModifyBody): Record<string, unknown> {
  const allowedBody: Record<string, unknown> = { ...body };
  delete allowedBody.id;
  delete allowedBody.username;
  delete allowedBody.account_hash;
  return allowedBody;
}

async function getSharedResumeBundle(resumeId: number, apiKey: string) {
  const resumes = ensureArray(await requestBackend<Resume[] | Resume>('resume/get', { id: resumeId }, { apiKey }));
  const resume = resumes.find((item) => item.id === resumeId) ?? resumes[0];

  if (!resume) {
    throw new Error('공유 지원서 정보를 찾을 수 없습니다.');
  }

  const [jobDescriptions, reports, questions] = await Promise.all([
    getJobDescriptions(apiKey),
    getReportsForResume(resume.id, apiKey),
    getQuestionsForResume(resume.id, apiKey),
  ]);
  const jobDescription = jobDescriptions.find((item) => item.id === resume.job_description_id) ?? null;

  return {
    resume,
    jobDescription,
    jobDescriptions,
    reports,
    questions,
  };
}

function unsupportedBackendFeature(featureName: string): never {
  throw new Error(`${featureName}은 현재 backend API가 없어 준비중입니다.`);
}

export const apiClient = {
  getDashboard: async () => toApiResponse('대시보드 데이터를 불러왔습니다.', await getDashboardSource()),

  getCompanyProfile: async () =>
    toApiResponse('회사 정보를 불러왔습니다.', await getCompanyInfo()),

  getJobDescriptions: async () =>
    toApiResponse('JD 목록을 불러왔습니다.', await getJobDescriptions()),

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
      await requestBackend<AuthKey[]>('authkey/get'),
    ),

  addAuthKey: async (body: AuthKeyAddBody) => {
    const data = await requestBackend<AuthKey>('authkey/add', body);

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
    const data = await requestBackend<JobDescription>('jd/add', body);

    return toApiResponse('JD를 등록했습니다.', data);
  },

  saveJobDescription: async (body: JobDescriptionModifyBody) => {
    const data = await requestBackend<JobDescription>('jd/modify', body);

    return toApiResponse('JD를 저장했습니다.', data);
  },

  deleteJobDescription: async (id: number) => {
    const data = await requestBackend<JobDescription>('jd/modify', { id, delete: true });

    return toApiResponse('JD를 삭제했습니다.', data ?? { id });
  },

  requestJobAnalysis: async (jdId: string) => {
    const data = await requestResumeAnalysisForJob(jdId);
    return toApiResponse('지원서 분석 요청이 완료되었습니다.', data);
  },

  addResume: async (body: ResumeAddBody) => {
    const data = await requestBackend<Resume>('resume/add', body);

    return toApiResponse('지원서를 저장했습니다.', data);
  },

  saveResume: async (body: ResumeModifyBody) => {
    const data = await requestBackend<Resume>('resume/modify', body);

    return toApiResponse('지원서를 수정했습니다.', data);
  },

  deleteResume: async (id: number) => {
    const data = await requestBackend<Resume>('resume/modify', { id, delete: true });

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
    const data = await requestResumeAnalysisForJob(jdId);
    return toApiResponse('지원서 분석이 완료되었습니다.', data);
  },

  requestResumeAnalysis: async (resumeId: number) => {
    const data = await requestResumeAnalysisById(resumeId);
    return toApiResponse('지원서 분석을 완료했습니다.', data);
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

  saveReport: async (body: ReportModifyBody) => {
    const data = await requestBackend<AnalysisReport>('report/modify', body);

    return toApiResponse('분석 리포트를 저장했습니다.', data);
  },

  saveQuestion: async (body: QuestionModifyBody) => {
    const data = await requestBackend<InterviewQuestion>('question/modify', body);

    return toApiResponse('면접 질문을 저장했습니다.', data);
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
