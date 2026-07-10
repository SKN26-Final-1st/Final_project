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
  queryable: boolean;
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
  { key: 'guide', label: '사용 가이드' },
];

function recentItems<T>(items: T[], limit: number) {
  return items.slice(-limit).reverse();
}

export function buildChatContextData({
  jdList,
  analysisReports,
  interviewQuestions,
}: ChatContextInput) {
  const collections: ChatContextCollection[] = [
    {
      key: 'jd',
      icon: <FileTextOutlined />,
      title: 'JD',
      detail: 'AI 채팅이 실제로 참조할 수 있는 JD',
      count: `${jdList.length}개`,
      queryable: true,
    },
    {
      key: 'report',
      icon: <FileSearchOutlined />,
      title: '분석 리포트',
      detail: '리포트 화면에서 확인하는 관련 기록',
      count: `${analysisReports.length}개`,
      queryable: false,
    },
    {
      key: 'question',
      icon: <QuestionOutlined />,
      title: '면접 질문',
      detail: '리포트 화면에서 확인하는 추천 질문',
      count: `${interviewQuestions.length}개`,
      queryable: false,
    },
    {
      key: 'guide',
      icon: <BookOutlined />,
      title: '사용 가이드',
      detail: '앱 사용법 검색 가능',
      queryable: true,
    },
  ];

  const jdSources: ChatContextSource[] = recentItems(jdList, 3).map((jd) => ({
    key: `jd-${jd.id}`,
    title: jd.title,
    description: jd.stack.length ? `필수 기술: ${jd.stack.join(', ')}` : '등록된 JD',
    icon: <HistoryOutlined />,
    scope: 'jd',
  }));

  const sources = jdSources;

  const prompts: ChatContextPrompt[] = [
    ...recentItems(jdList, 2).map((jd) => ({
      key: `prompt-jd-${jd.id}`,
      label: `${jd.title} JD에서 확인해야 할 핵심 조건을 정리해줘`,
      scope: 'jd' as const,
    })),
  ];

  return { collections, sources, prompts };
}

export function filterChatContextItems<T extends { scope: ChatContextScope }>(items: T[], scope: ChatContextScope) {
  return scope === 'all' ? items : items.filter((item) => item.scope === scope);
}
