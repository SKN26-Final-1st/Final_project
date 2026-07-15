import type { AnalysisReport, ApiResponse, InterviewQuestion } from '../../data/backendTypes';
import type { ChatMessage } from '../../data/appConfig';
import { parseInterviewQuestions } from '../backendSchemas';
import type { BackendChatMessage } from './clientContracts';

export function toApiResponse<T>(message: string, data: T): ApiResponse<T> {
  return {
    error: false,
    message,
    data,
    meta: { requested_at: new Date().toISOString() },
  };
}

export function ensureArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getReportQuestions(report: AnalysisReport): InterviewQuestion[] {
  return parseInterviewQuestions(
    report.interview_question.map((question, index) => ({
      ...question,
      id: question.id ?? index + 1,
      resume_id: question.resume_id ?? report.resume_id,
    })),
  );
}

export function getReportsQuestions(reports: AnalysisReport[]): InterviewQuestion[] {
  return reports.flatMap((report) => getReportQuestions(report));
}

export function toBackendChatMessages(messages: ChatMessage[]): BackendChatMessage[] {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'agent' : 'user',
    message: message.text,
  }));
}
