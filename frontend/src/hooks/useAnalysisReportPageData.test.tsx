import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useAnalysisReportPageData } from './useAnalysisReportPageData';
import type { AppData } from '../api/appDataService';
import type { JdItem } from '../api/adapters';
import type { AnalysisReport, Resume } from '../data/backendTypes';

const resume: Resume = {
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

const jd: JdItem = {
  id: '10',
  title: '프론트엔드 JD',
  team: '',
  status: '준비 중',
  statusCode: 'prepare',
  fit: 0,
  stack: [],
  preferredStack: [],
  summary: '',
  requiredExperience: '',
  employmentType: '',
  educationLevel: '',
  major: '',
  hiringReason: '',
};

const olderReport: AnalysisReport = {
  id: 11,
  resume_id: 1,
  overall_grade: 'B',
  overall_summary: '이전 분석',
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
  status: 'done',
  created_at: '2026-06-23T10:00:00+09:00',
};

const newerReport: AnalysisReport = {
  ...olderReport,
  id: 12,
  overall_grade: 'A',
  overall_summary: '최신 분석',
  created_at: '2026-06-24T10:00:00+09:00',
};

const appData = {
  analysisReports: [olderReport, newerReport],
  resumes: [resume],
  jdList: [jd],
} as AppData;

vi.mock('./useAppDataQuery', () => ({
  useAppDataQuery: () => ({
    data: appData,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

function wrapperWithEntry(entry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
  };
}

describe('useAnalysisReportPageData', () => {
  it('reportId query로 선택된 리포트를 찾고 resume 하위 report 트리를 제공한다', () => {
    const { result } = renderHook(() => useAnalysisReportPageData(), {
      wrapper: wrapperWithEntry('/analysis-report?reportId=11'),
    });

    expect(result.current.selectedReportId).toBe('11');
    expect(result.current.selectedItem?.report.id).toBe(11);
    expect(result.current.reportTreeItems).toHaveLength(1);
    expect(result.current.reportTreeItems[0].resume?.name).toBe('홍길동');
    expect(result.current.reportTreeItems[0].reports.map((item) => item.report.id)).toEqual([12, 11]);
  });

  it('legacy resumeId query는 해당 resume의 최신 리포트로 fallback 선택한다', () => {
    const { result } = renderHook(() => useAnalysisReportPageData(), {
      wrapper: wrapperWithEntry('/analysis-report?resumeId=1'),
    });

    expect(result.current.selectedReportId).toBe('12');
    expect(result.current.selectedItem?.report.overall_summary).toBe('최신 분석');
  });
});
