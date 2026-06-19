import { describe, expect, it } from 'vitest';
import { parseAccount, parseAnalysisReports, parseAuthKeys, parseJobDescriptions, parseResumes } from './backendSchemas';

describe('backendSchemas', () => {
  it('핵심 backend 응답을 타입 안정적으로 정규화한다', () => {
    expect(
      parseAccount({
        id: 1,
        username: 'min',
        account_hash: 'hash',
        name: '민',
        verification_question: '질문',
        verification_answer: '답',
        credit: 10,
        subscribe: false,
        subscribe_expiration: '',
      }).username,
    ).toBe('min');

    expect(
      parseJobDescriptions([
        {
          id: 1,
          job_name: '백엔드',
          education_level: '',
          major: '',
          career_level: '3년',
          required_skill: ['Python'],
          preferred_skill: [],
          main_task: '',
          hiring_reason: '',
          work_type: '',
          status: 'prepare',
          created_at: '',
          updated_at: '',
        },
      ]),
    ).toHaveLength(1);

    expect(
      parseResumes([
        {
          id: 1,
          job_description_id: 1,
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
          status: 'onqueue',
          reviewed: false,
          reviewed_at: '',
          created_at: '',
          updated_at: '',
        },
      ])[0].self_intoduction,
    ).toEqual([]);

    expect(
      parseAnalysisReports([
        {
          id: 1,
          resume_id: 1,
          overall_grade: 'A',
          overall_summary: '요약',
          candidate_summary: '지원자 요약',
          checklist: [],
          competency_analysis: [],
          fit_analysis: 'JD 적합도가 높습니다.',
          motive: '지원 동기가 구체적입니다.',
          collaboration: '협업 경험이 확인됩니다.',
          strength: [],
          concern: [],
          check_point: [],
          final_comment: '',
          interview_question: [],
        },
      ])[0],
    ).toMatchObject({
      fit_analysis: 'JD 적합도가 높습니다.',
      motive: '지원 동기가 구체적입니다.',
      collaboration: '협업 경험이 확인됩니다.',
    });
    expect(parseAuthKeys([])).toEqual([]);
  });

  it('계약과 다른 응답은 명확히 거부한다', () => {
    expect(() => parseJobDescriptions([{ id: 1, status: 'invalid' }])).toThrow();
  });
});
