import type { SearchSuggestion } from '../common/SearchSuggestions';

export const REPORT_SEARCH_SUGGESTIONS = [
  { label: 'A/B 등급', keywords: ['등급', '상위', '우수'] },
  { label: 'C 이하', keywords: ['등급', '낮은 등급', 'c등급', 'd등급', 'f등급'] },
  { label: '질문 있음', keywords: ['면접 질문', 'interview'] },
  { label: '확인 포인트 있음', keywords: ['확인', '체크 포인트', 'check point'] },
  { label: '우려사항 있음', keywords: ['우려', '검증 필요', 'concern'] },
] satisfies SearchSuggestion[];

export const REPORT_GRADE_SUGGESTIONS = ['A/B 등급', 'C 이하'];
export const REPORT_CONTENT_SUGGESTIONS = ['질문 있음', '확인 포인트 있음', '우려사항 있음'];
