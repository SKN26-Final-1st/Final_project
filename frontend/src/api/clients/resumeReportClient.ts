import type { AnalysisReport, Resume } from '../../data/backendTypes';
import { parseAnalysisReport, parseAnalysisReports, parseResume, parseResumes } from '../backendSchemas';
import { requestBackend } from '../httpClient';
import { ensureArray, getReportQuestions, toApiResponse } from './clientCore';
import type {
  ReportModifyBody,
  RequestControlOptions,
  ResumeAddBody,
  ResumeAnalysisPayload,
  ResumeModifyBody,
} from './clientContracts';

export async function getResumesForJobRaw(
  jobDescriptionId: number,
  apiKey?: string,
  options: RequestControlOptions = {},
) {
  const data = await requestBackend<Resume[] | Resume>(
    'resume/get',
    { job_description_id: jobDescriptionId },
    { ...options, apiKey },
  );
  return parseResumes(ensureArray(data));
}

export async function getResumeByIdRaw(resumeId: number, apiKey?: string, options: RequestControlOptions = {}) {
  const resumes = parseResumes(
    ensureArray(await requestBackend<Resume[] | Resume>('resume/get', { id: resumeId }, { ...options, apiKey })),
  );
  return resumes.find((item) => item.id === resumeId) ?? resumes[0] ?? null;
}

export async function getReportsForResumeRaw(
  resumeId: number,
  apiKey?: string,
  options: RequestControlOptions = {},
) {
  return parseAnalysisReports(
    await requestBackend<AnalysisReport[]>('report/get', { resume_id: resumeId }, { ...options, apiKey }),
  );
}

async function requestResumeAnalysisById(resumeId: number, apiKey?: string): Promise<ResumeAnalysisPayload> {
  const resume = await getResumeByIdRaw(resumeId, apiKey);
  if (!resume) throw new Error('분석 요청할 지원서를 찾을 수 없습니다.');

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

export const resumeReportClient = {
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

  requestResumeAnalysis: async (resumeId: number, apiKey?: string) => {
    const data = await requestResumeAnalysisById(resumeId, apiKey);
    return toApiResponse(getResumeAnalysisMessage(data.report), data);
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
};
