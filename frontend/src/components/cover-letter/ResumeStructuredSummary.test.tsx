import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResumeStructuredSummary } from './ResumeStructuredSummary';
import type { Resume } from '../../data/backendTypes';

const resume: Resume = {
  id: 1,
  job_description_id: 10,
  name: '홍길동',
  skill: ['React'],
  education_level: {
    final_degree: 'bachelor',
    bachelor: '한국대학교',
    master: '',
    doctoral: '',
  },
  experience: [
    {
      company_name: '휴머',
      length: '6개월',
      position: '인턴',
      experience_description: '데이터 분석 업무',
    },
  ],
  self_intoduction: [{ question: '지원 동기', answer: '답변' }],
  certification: ['SQLD'],
  language: [{ language_name: '영어', test_name: 'OPIC', score: 'IH' }],
  award: [{ award_name: '해커톤 우수상', award_from: '서울시', time: '2024' }],
  training: [
    {
      education_name: 'AI 부트캠프',
      education_from: '패스트캠퍼스',
      education_description: '프로젝트 교육',
      start: '2024-01',
      end: '2024-03',
    },
  ],
  other_activity: [
    {
      activity_name: '오픈소스 기여',
      activity_description: '문서 개선',
      start: '2023-01',
      end: '2023-12',
    },
  ],
  reviewed: false,
  reviewed_at: '',
  created_at: '',
  updated_at: '',
};

describe('ResumeStructuredSummary', () => {
  it('이력서 dict/list[dict] 필드를 사람이 읽기 좋은 텍스트로 표시한다', () => {
    render(<ResumeStructuredSummary resume={resume} />);

    expect(screen.getByText('최종 학위: 학사')).toBeInTheDocument();
    expect(screen.getByText('휴머 · 6개월 · 인턴')).toBeInTheDocument();
    expect(screen.getByText('데이터 분석 업무')).toBeInTheDocument();
    expect(screen.getByText('영어 · OPIC · IH')).toBeInTheDocument();
    expect(screen.getByText('해커톤 우수상 · 서울시 · 2024')).toBeInTheDocument();
    expect(screen.getByText('AI 부트캠프 · 패스트캠퍼스 · 2024-01~2024-03')).toBeInTheDocument();
    expect(screen.getByText('오픈소스 기여 · 2023-01~2023-12')).toBeInTheDocument();
  });
});
