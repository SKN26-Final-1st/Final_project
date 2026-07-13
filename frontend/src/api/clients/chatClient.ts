import type { ChatMessage } from '../../data/appConfig';
import { requestAction } from '../httpClient';
import { getJobDescriptionsRaw } from './jdChecklistClient';
import { getReportsQuestions, toApiResponse, toBackendChatMessages } from './clientCore';
import { getReportsForResumeRaw, getResumeByIdRaw } from './resumeReportClient';
import type { BackendChatMessage, RequestControlOptions } from './clientContracts';

async function chatRequest(messages: ChatMessage[], apiKey?: string, options: RequestControlOptions = {}) {
  const payload = await requestAction('chat', { chat: toBackendChatMessages(messages) }, { ...options, apiKey });
  const response = payload.response;
  if (!response || typeof response !== 'object') throw new Error('채팅 응답을 불러오지 못했습니다.');

  const chatResponse = response as Partial<BackendChatMessage>;
  if (typeof chatResponse.message !== 'string') throw new Error('채팅 응답 메시지를 불러오지 못했습니다.');
  return {
    role: chatResponse.role === 'user' ? 'user' : 'assistant',
    text: chatResponse.message,
  } satisfies ChatMessage;
}

async function getSharedResumeBundleRaw(
  resumeId: number,
  apiKey: string,
  options: RequestControlOptions = {},
) {
  const resume = await getResumeByIdRaw(resumeId, apiKey, options);
  if (!resume) throw new Error('공유 지원서 정보를 찾을 수 없습니다.');

  const [jobDescriptions, reports] = await Promise.all([
    getJobDescriptionsRaw(apiKey, options),
    getReportsForResumeRaw(resume.id, apiKey, options),
  ]);
  return {
    resume,
    jobDescription: jobDescriptions.find((item) => item.id === resume.job_description_id) ?? null,
    jobDescriptions,
    reports,
    questions: getReportsQuestions(reports),
  };
}

export const chatClient = {
  sendChatMessage: async (
    question: string,
    messages: ChatMessage[] = [],
    apiKey?: string,
    options: RequestControlOptions = {},
  ) => {
    const chatMessages = messages.length ? messages : [{ role: 'user', text: question } satisfies ChatMessage];
    return toApiResponse('AI 응답이 추가되었습니다.', await chatRequest(chatMessages, apiKey, options));
  },

  getSharedResumeBundle: async (
    resumeId: number,
    apiKey: string,
    options: RequestControlOptions = {},
  ) =>
    toApiResponse(
      '공유 분석 결과를 불러왔습니다.',
      await getSharedResumeBundleRaw(resumeId, apiKey, { ...options, authFailurePolicy: 'local' }),
    ),
};
