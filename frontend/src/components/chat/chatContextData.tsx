import {
  BookOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  QuestionOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { JdItem } from '../../api/adapters';
import type { AnalysisReport, InterviewQuestion, Resume } from '../../data/backendTypes';

export type ChatContextScope = 'all' | 'jd' | 'report' | 'question' | 'guide';

export type ChatContextInput = {
  jdList: JdItem[];
  resumes: Resume[];
  analysisReports: AnalysisReport[];
  interviewQuestions: InterviewQuestion[];
};

export type ChatContextCollection = {
  key: ChatContextScope;
  icon: ReactNode;
  title: string;
  detail: string;
  count?: string;
};

export type ChatContextSource = {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  scope: ChatContextScope;
};

export type ChatContextPrompt = {
  key: string;
  label: string;
  scope: ChatContextScope;
};

export const chatScopeOptions: { key: ChatContextScope; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'jd', label: 'JD' },
  { key: 'report', label: '분석 리포트' },
  { key: 'question', label: '면접 질문' },
  { key: 'guide', label: '사용 가이드' },
];

function findResume(resumes: Resume[], resumeId: number) {
  return resumes.find((resume) => resume.id === resumeId) ?? null;
}

function findJd(jdList: JdItem[], resume?: Resume | null) {
  return resume ? jdList.find((jd) => Number(jd.id) === resume.job_description_id) ?? null : null;
}

function applicantJdLabel(resume: Resume | null, jd: JdItem | null) {
  const applicant = resume?.name || '지원자 정보 없음';
  const jdTitle = jd?.title || '연결 JD 없음';
  return `${applicant} · ${jdTitle}`;
}

function recentItems<T>(items: T[], limit: number) {
  return items.slice(-limit).reverse();
}

export function buildChatContextData({
  jdList,
  resumes,
  analysisReports,
  interviewQuestions,
}: ChatContextInput) {
  const collections: ChatContextCollection[] = [
    {
      key: 'jd',
      icon: <FileTextOutlined />,
      title: 'JD',
      detail: '현재 계정에서 조회 가능한 JD',
      count: `${jdList.length}개`,
    },
    {
      key: 'report',
      icon: <FileSearchOutlined />,
      title: '분석 리포트',
      detail: '저장된 지원자 분석 리포트',
      count: `${analysisReports.length}개`,
    },
    {
      key: 'question',
      icon: <QuestionOutlined />,
      title: '면접 질문',
      detail: '분석 결과에서 생성된 추천 질문',
      count: `${interviewQuestions.length}개`,
    },
    {
      key: 'guide',
      icon: <BookOutlined />,
      title: '사용 가이드',
      detail: '앱 사용 매뉴얼 검색 가능',
    },
  ];

  const jdSources: ChatContextSource[] = recentItems(jdList, 3).map((jd) => ({
    key: `jd-${jd.id}`,
    title: jd.title,
    description: jd.stack.length ? `필수 기술: ${jd.stack.join(', ')}` : '등록된 JD',
    icon: <HistoryOutlined />,
    scope: 'jd',
  }));
  const reportSources: ChatContextSource[] = recentItems(analysisReports, 3).map((report) => {
    const resume = findResume(resumes, report.resume_id);
    const jd = findJd(jdList, resume);

    return {
      key: `report-${report.id}`,
      title: applicantJdLabel(resume, jd),
      description: `${report.overall_grade || 'N/A'} 등급 · ${report.overall_summary || '요약 없음'}`,
      icon: <HistoryOutlined />,
      scope: 'report',
    };
  });
  const questionSources: ChatContextSource[] = recentItems(interviewQuestions, 3).map((question) => {
    const resume = findResume(resumes, question.resume_id);
    const jd = findJd(jdList, resume);

    return {
      key: `question-${question.id}`,
      title: question.question,
      description: applicantJdLabel(resume, jd),
      icon: <HistoryOutlined />,
      scope: 'question',
    };
  });
  const sources = [...jdSources, ...reportSources, ...questionSources];

  const prompts: ChatContextPrompt[] = [
    ...recentItems(jdList, 2).map((jd) => ({
      key: `prompt-jd-${jd.id}`,
      label: `${jd.title} JD에서 확인해야 할 핵심 조건을 정리해줘`,
      scope: 'jd' as const,
    })),
    ...recentItems(analysisReports, 2).map((report) => {
      const resume = findResume(resumes, report.resume_id);
      const jd = findJd(jdList, resume);

      return {
        key: `prompt-report-${report.id}`,
        label: `${applicantJdLabel(resume, jd)} 분석 리포트의 우려 사항을 정리해줘`,
        scope: 'report' as const,
      };
    }),
    ...recentItems(interviewQuestions, 2).map((question) => ({
      key: `prompt-question-${question.id}`,
      label: `${question.question} 질문의 의도와 후속 질문을 정리해줘`,
      scope: 'question' as const,
    })),
  ];

  return { collections, sources, prompts };
}

export function filterChatContextItems<T extends { scope: ChatContextScope }>(items: T[], scope: ChatContextScope) {
  return scope === 'all' ? items : items.filter((item) => item.scope === scope);
}
