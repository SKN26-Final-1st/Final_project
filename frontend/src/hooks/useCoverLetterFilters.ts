import { useMemo } from 'react';
import type { CoverLetterRow } from '../api/adapters';
import type { SearchSuggestion } from '../components/common/SearchSuggestions';
import {
  getSearchTextWithoutSuggestions,
  getSelectedSuggestionLabels,
  getSuggestionQueryFragment,
} from '../utils/searchSuggestions';
import { compareRecent, includesSearchText, normalizeSearchText } from '../utils/searchText';

export const COVER_SEARCH_SUGGESTIONS = [
  { label: '분석 대기', keywords: ['대기', 'onqueue'] },
  { label: '분석 중', keywords: ['처리', 'processing'] },
  { label: '분석 완료', keywords: ['완료', 'done'] },
  { label: '미검토', keywords: ['검토 전', 'unreviewed'] },
  { label: '검토 완료', keywords: ['검토됨', 'reviewed'] },
] satisfies SearchSuggestion[];

const ANALYSIS_STATUS_SUGGESTIONS = ['분석 대기', '분석 중', '분석 완료'];
const REVIEW_STATUS_SUGGESTIONS = ['미검토', '검토 완료'];

function matchesSuggestion(row: CoverLetterRow, suggestion: string) {
  if (suggestion === '분석 대기') {
    return row.resumeStatus === 'onqueue' || row.statusCode === 'onqueue' || normalizeSearchText(row.status) === suggestion;
  }
  if (suggestion === '분석 중') {
    return row.resumeStatus === 'processing' || row.statusCode === 'processing' || normalizeSearchText(row.status) === suggestion;
  }
  if (suggestion === '분석 완료') {
    return row.resumeStatus === 'done' || row.statusCode === 'done' || normalizeSearchText(row.status) === suggestion;
  }
  if (suggestion === '미검토') return !row.reviewed;
  if (suggestion === '검토 완료') return row.reviewed;
  return true;
}

function matchesSuggestionFilters(row: CoverLetterRow, selectedSuggestions: string[]) {
  const analysisSelections = selectedSuggestions.filter((item) => ANALYSIS_STATUS_SUGGESTIONS.includes(item));
  const reviewSelections = selectedSuggestions.filter((item) => REVIEW_STATUS_SUGGESTIONS.includes(item));
  return (
    (!analysisSelections.length || analysisSelections.some((item) => matchesSuggestion(row, item))) &&
    (!reviewSelections.length || reviewSelections.some((item) => matchesSuggestion(row, item)))
  );
}

function matchesTextSearch(row: CoverLetterRow, query: string) {
  return includesSearchText(
    [
      row.applicant, row.jd, row.skills.join(' '), row.status, row.statusCode, row.resumeStatus,
      row.reviewed ? '검토 완료' : '미검토', row.score,
    ],
    query,
  );
}

export function useCoverLetterFilters(rows: CoverLetterRow[], searchText: string) {
  const selectedSuggestions = useMemo(
    () => getSelectedSuggestionLabels(searchText, COVER_SEARCH_SUGGESTIONS),
    [searchText],
  );
  const textSearch = useMemo(
    () => getSearchTextWithoutSuggestions(searchText, COVER_SEARCH_SUGGESTIONS),
    [searchText],
  );
  const suggestionQuery = useMemo(() => getSuggestionQueryFragment(searchText), [searchText]);
  const filteredRows = useMemo(() => {
    const filtered = rows.filter(
      (row) => matchesSuggestionFilters(row, selectedSuggestions) && matchesTextSearch(row, textSearch),
    );
    return [...filtered].sort((left, right) => compareRecent(left.updatedAtIso, right.updatedAtIso));
  }, [rows, selectedSuggestions, textSearch]);

  return { filteredRows, selectedSuggestions, suggestionQuery };
}
