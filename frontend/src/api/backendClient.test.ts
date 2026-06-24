import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { server } from '../test/server';

const resumeWithoutStatus = {
  id: 1,
  job_description_id: 10,
  name: '홍길동',
  skill: [],
  education_level: {},
  experience: [],
  self_intoduction: [],
  certification: [],
  language: [],
  award: [],
  training: [],
  other_activity: [],
  reviewed: false,
  reviewed_at: '',
  created_at: '',
  updated_at: '',
};

const queuedReport = {
  id: 30,
  resume_id: 1,
  overall_grade: '',
  overall_summary: '',
  candidate_summary: '',
  checklist: [],
  competency_analysis: [],
  fit_analysis: '',
  motive: '',
  collaboration: '',
  strength: [],
  concern: [],
  check_point: [],
  final_comment: '',
  interview_question: [],
  status: 'onqueue',
  created_at: '2026-06-24T00:00:00+09:00',
};

describe('backendClient', () => {
  beforeEach(() => {
    document.cookie = 'csrftoken=test-csrf; path=/';
  });

  test('shows a Korean message when login credentials are invalid', async () => {
    server.use(
      http.post('/api/login/', () =>
        HttpResponse.json({
          error: true,
          message: '403: Authentication is required.\ndetailed_message: Invalid credentials',
        }),
      ),
    );

    const { apiClient } = await import('./backendClient');

    await expect(apiClient.login('unknown-user', 'wrong-password')).rejects.toThrow(
      '아이디 또는 비밀번호가 올바르지 않습니다.',
    );
  });

  test('queued resume analysis returns a request accepted message', async () => {
    server.use(
      http.post('/api/resume/get/', () => HttpResponse.json({ error: false, data: [resumeWithoutStatus] })),
      http.post('/api/resume/analyze/', () => HttpResponse.json({ error: false, data: queuedReport })),
    );

    const { apiClient } = await import('./backendClient');

    await expect(apiClient.requestResumeAnalysis(1)).resolves.toMatchObject({
      message: '지원서 분석 요청이 접수되었습니다.',
      data: {
        report: {
          status: 'onqueue',
          created_at: '2026-06-24T00:00:00+09:00',
        },
      },
    });
  });

  test('jd checklist generation calls jd/analyze with only id', async () => {
    let requestBody: unknown = null;
    server.use(
      http.post('/api/jd/analyze/', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          error: false,
          data: [{ id: 1, job_description_id: 10, content: 'React 실무 경험 확인' }],
        });
      }),
    );

    const { apiClient } = await import('./backendClient');
    const response = await apiClient.generateJdChecklist(10);

    expect(requestBody).toEqual({ id: 10 });
    expect(response.data).toEqual([{ id: 1, job_description_id: 10, content: 'React 실무 경험 확인' }]);
  });

  test('checklist add calls checklist/add with job description id and content', async () => {
    let requestBody: unknown = null;
    server.use(
      http.post('/api/checklist/add/', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          error: false,
          data: { id: 2, job_description_id: 10, content: 'TypeScript 이해도 확인' },
        });
      }),
    );

    const { apiClient } = await import('./backendClient');
    const response = await apiClient.addChecklist({ job_description_id: 10, content: 'TypeScript 이해도 확인' });

    expect(requestBody).toEqual({ job_description_id: 10, content: 'TypeScript 이해도 확인' });
    expect(response.data).toEqual({ id: 2, job_description_id: 10, content: 'TypeScript 이해도 확인' });
  });

  test('checklist update calls checklist/modify with id and content', async () => {
    let requestBody: unknown = null;
    server.use(
      http.post('/api/checklist/modify/', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          error: false,
          data: { id: 1, job_description_id: 10, content: 'React 프로젝트 경험 확인' },
        });
      }),
    );

    const { apiClient } = await import('./backendClient');
    const response = await apiClient.updateChecklist({ id: 1, content: 'React 프로젝트 경험 확인' });

    expect(requestBody).toEqual({ id: 1, content: 'React 프로젝트 경험 확인' });
    expect(response.data).toEqual({ id: 1, job_description_id: 10, content: 'React 프로젝트 경험 확인' });
  });

  test('checklist delete calls checklist/modify with delete flag', async () => {
    let requestBody: unknown = null;
    server.use(
      http.post('/api/checklist/modify/', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          error: false,
          data: { id: 1, job_description_id: 10, content: 'React 실무 경험 확인' },
        });
      }),
    );

    const { apiClient } = await import('./backendClient');
    const response = await apiClient.deleteChecklist(1);

    expect(requestBody).toEqual({ id: 1, delete: true });
    expect(response.data).toEqual({ id: 1, job_description_id: 10, content: 'React 실무 경험 확인' });
  });
});
