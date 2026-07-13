import { useMemo, useState } from 'react';
import type { AnalysisReportItem, AnalysisReportTreeItem } from './useAnalysisReportPageData';
import { gradeScore, REPORT_STATUS_LABEL, toDisplayList } from '../components/analysis-report/reportPresentation';
import {
  REPORT_CONTENT_SUGGESTIONS,
  REPORT_GRADE_SUGGESTIONS,
  REPORT_SEARCH_SUGGESTIONS,
} from '../components/analysis-report/reportFilterConfig';
import { includesSearchText } from '../utils/searchText';
import {
  getSearchTextWithoutSuggestions,
  getSelectedSuggestionLabels,
  getSuggestionQueryFragment,
  toggleSuggestionInSearchText,
} from '../utils/searchSuggestions';

function hasListContent(value: unknown) {
  return toDisplayList(value).length > 0;
}

function matchesReportSuggestion(item: AnalysisReportItem, suggestion: string) {
  const grade = item.report.overall_grade.toUpperCase();

  if (suggestion === 'A/B 등급') return grade === 'A' || grade === 'B';
  if (suggestion === 'C 이하') return ['C', 'D', 'F'].includes(grade);
  if (suggestion === '질문 있음') return item.questions.length > 0 || item.report.interview_question.length > 0;
  if (suggestion === '확인 포인트 있음') return hasListContent(item.report.check_point);
  if (suggestion === '우려사항 있음') return hasListContent(item.report.concern);
  return true;
}

function matchesReportSuggestionFilters(item: AnalysisReportItem, selectedSuggestions: string[]) {
  const gradeSelections = selectedSuggestions.filter((suggestion) => REPORT_GRADE_SUGGESTIONS.includes(suggestion));
  const contentSelections = selectedSuggestions.filter((suggestion) => REPORT_CONTENT_SUGGESTIONS.includes(suggestion));
  const matchesGrade =
    !gradeSelections.length || gradeSelections.some((suggestion) => matchesReportSuggestion(item, suggestion));
  const matchesContent = contentSelections.every((suggestion) => matchesReportSuggestion(item, suggestion));
  return matchesGrade && matchesContent;
}

type UseReportFiltersOptions = {
  reportItems: AnalysisReportItem[];
  reportTreeItems: AnalysisReportTreeItem[];
  selectedReportId: string | null;
};

export function useReportFilters({ reportItems, reportTreeItems, selectedReportId }: UseReportFiltersOptions) {
  const [searchText, setSearchText] = useState('');
  const selectedSuggestions = useMemo(
    () => getSelectedSuggestionLabels(searchText, REPORT_SEARCH_SUGGESTIONS),
    [searchText],
  );
  const textSearch = useMemo(
    () => getSearchTextWithoutSuggestions(searchText, REPORT_SEARCH_SUGGESTIONS),
    [searchText],
  );
  const suggestionQuery = useMemo(() => getSuggestionQueryFragment(searchText), [searchText]);
  const filteredReportItems = useMemo(() => {
    const filtered = reportItems.filter((item) => {
      const questionText = item.questions
        .map((question) => [question.question, question.answer, question.purpose].join(' '))
        .join(' ');
      const report = item.report;

      return (
        matchesReportSuggestionFilters(item, selectedSuggestions) &&
        includesSearchText(
          [
            item.resume?.name,
            item.jd?.title,
            report.overall_grade,
            `${report.overall_grade} 등급`,
            report.status,
            REPORT_STATUS_LABEL[report.status],
            report.overall_summary,
            report.candidate_summary,
            report.fit_analysis,
            report.motive,
            report.collaboration,
            report.final_comment,
            report.review_text,
            toDisplayList(report.check_point).join(' '),
            toDisplayList(report.concern).join(' '),
            questionText,
          ],
          textSearch,
        )
      );
    });

    return [...filtered].sort(
      (left, right) => gradeScore(right.report.overall_grade) - gradeScore(left.report.overall_grade),
    );
  }, [reportItems, selectedSuggestions, textSearch]);
  const filteredReportIds = useMemo(
    () => new Set(filteredReportItems.map((item) => item.report.id)),
    [filteredReportItems],
  );
  const filteredReportTreeItems = useMemo(
    () =>
      reportTreeItems
        .map((group) => ({
          ...group,
          reports: group.reports.filter((item) => filteredReportIds.has(item.report.id)),
        }))
        .filter((group) => group.reports.length > 0),
    [filteredReportIds, reportTreeItems],
  );
  const displaySelectedItem =
    filteredReportItems.find((item) => String(item.report.id) === selectedReportId) ?? filteredReportItems[0] ?? null;

  const toggleSuggestion = (suggestion: string) => {
    setSearchText((current) =>
      toggleSuggestionInSearchText(current, REPORT_SEARCH_SUGGESTIONS, suggestion),
    );
  };

  return {
    displaySelectedItem,
    filteredReportItems,
    filteredReportTreeItems,
    searchText,
    selectedSuggestions,
    setSearchText,
    suggestionQuery,
    toggleSuggestion,
  };
}
