import type { ChatMessage } from '../../data/appConfig';
import type { Checklist, JobDescription } from '../../data/backendTypes';
import {
  parseChecklist,
  parseChecklists,
  parseJobDescription,
  parseJobDescriptions,
} from '../backendSchemas';
import { requestAction, requestBackend } from '../httpClient';
import { toApiResponse, toBackendChatMessages } from './clientCore';
import type {
  BackendChatMessage,
  ChecklistAddBody,
  ChecklistModifyBody,
  GenerateJdChecklistOptions,
  JdChatRequest,
  JdChatState,
  JobDescriptionAddBody,
  JobDescriptionModifyBody,
  RequestControlOptions,
} from './clientContracts';

export async function getJobDescriptionsRaw(apiKey?: string, options: RequestControlOptions = {}) {
  return parseJobDescriptions(await requestBackend<JobDescription[]>('jd/get', {}, { ...options, apiKey }));
}

async function jdChatRequest({ jobDescriptionId, messages = [], state, apiKey, signal }: JdChatRequest) {
  const body: Record<string, unknown> = {
    job_description_id: jobDescriptionId,
    chat: toBackendChatMessages(messages),
  };
  if (state) body.state = state;

  const payload = await requestAction('jd_chat', body, { apiKey, signal });
  const response = payload.response;
  if (!response || typeof response !== 'object') throw new Error('JD 채팅 응답을 불러오지 못했습니다.');

  const chatResponse = response as Partial<BackendChatMessage>;
  if (typeof chatResponse.message !== 'string') throw new Error('JD 채팅 응답 메시지를 불러오지 못했습니다.');

  return {
    response: {
      role: chatResponse.role === 'user' ? 'user' : 'agent',
      message: chatResponse.message,
    },
    state: payload.state && typeof payload.state === 'object' ? (payload.state as JdChatState) : {},
  };
}

export const jdChecklistClient = {
  getJobDescriptions: async (apiKey?: string) =>
    toApiResponse('JD 목록을 불러왔습니다.', await getJobDescriptionsRaw(apiKey)),

  getChecklist: async (jobDescriptionId: number, apiKey?: string) => {
    const data = parseChecklists(
      await requestBackend<Checklist[]>('checklist/get', { job_description_id: jobDescriptionId }, { apiKey }),
    );
    return toApiResponse('체크리스트를 불러왔습니다.', data);
  },

  generateJdChecklist: async (
    jdId: number | string,
    apiKey?: string,
    options: GenerateJdChecklistOptions = {},
  ) => {
    const body: { id: number; query?: string; cnt?: number } = { id: Number(jdId) };
    const query = options.query?.trim();
    if (query) body.query = query;
    if (typeof options.cnt === 'number' && Number.isFinite(options.cnt)) {
      body.cnt = Math.max(0, Math.min(10, Math.trunc(options.cnt)));
    }
    const data = parseJobDescription(await requestBackend<JobDescription>('jd/analyze', body, { apiKey }));
    return toApiResponse('체크리스트 생성 요청을 보냈습니다.', data);
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

  addJobDescription: async (body: JobDescriptionAddBody) => {
    const data = parseJobDescription(await requestBackend<JobDescription>('jd/add', body));
    return toApiResponse('JD를 등록했습니다.', data);
  },

  saveJobDescription: async (body: JobDescriptionModifyBody, apiKey?: string) => {
    const data = parseJobDescription(await requestBackend<JobDescription>('jd/modify', body, { apiKey }));
    return toApiResponse('JD를 저장했습니다.', data);
  },

  refreshJdChecklistFailure: async (id: number, apiKey?: string) => {
    const data = parseJobDescription(
      await requestBackend<JobDescription>('jd/modify', { id, refresh_fail: true }, { apiKey }),
    );
    return toApiResponse('체크리스트 실패 상태를 확인했습니다.', data);
  },

  deleteJobDescription: async (id: number, apiKey?: string) => {
    const data = parseJobDescription(
      await requestBackend<JobDescription>('jd/modify', { id, delete: true }, { apiKey }),
    );
    return toApiResponse('JD를 삭제했습니다.', data ?? { id });
  },

  sendJdChatMessage: async (request: JdChatRequest) => {
    const payload = await jdChatRequest(request);
    return toApiResponse('JD 채팅 응답을 추가했습니다.', {
      response: {
        role: payload.response.role === 'user' ? 'user' : 'assistant',
        text: payload.response.message,
      } satisfies ChatMessage,
      state: payload.state,
    });
  },
};
