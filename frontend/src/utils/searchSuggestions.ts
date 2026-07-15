import type { SearchSuggestion } from '../components/common/SearchSuggestions';

function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function suggestionBoundaryPattern(label: string) {
  return new RegExp(`(^|[\\s,])${escapeRegExp(label)}(?=$|[\\s,])`, 'g');
}

function hasSuggestionLabel(value: string, label: string) {
  return suggestionBoundaryPattern(label).test(value);
}

function removeSuggestionLabel(value: string, label: string) {
  return value.replace(suggestionBoundaryPattern(label), ' ');
}

function normalizeSearchInputText(value: string) {
  return value
    .split(',')
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ');
}

function matchesSuggestionText(suggestion: SearchSuggestion, query: string) {
  const normalizedQuery = normalizeSuggestionText(query);

  if (!normalizedQuery) {
    return false;
  }

  return [suggestion.label, ...(suggestion.keywords ?? [])].some((value) =>
    normalizeSuggestionText(value).includes(normalizedQuery),
  );
}

export function getSelectedSuggestionLabels(query: string, suggestions: SearchSuggestion[]) {
  return suggestions
    .filter((suggestion) => hasSuggestionLabel(query, suggestion.label))
    .map((suggestion) => suggestion.label);
}

export function getSearchTextWithoutSuggestions(query: string, suggestions: SearchSuggestion[]) {
  const withoutSuggestions = suggestions.reduce(
    (current, suggestion) => removeSuggestionLabel(current, suggestion.label),
    query,
  );

  return withoutSuggestions.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getSuggestionQueryFragment(query: string) {
  const segments = query.split(',');
  return segments[segments.length - 1]?.trim() ?? '';
}

export function toggleSuggestionInSearchText(query: string, suggestions: SearchSuggestion[], label: string) {
  const selectedLabels = getSelectedSuggestionLabels(query, suggestions);

  if (selectedLabels.includes(label)) {
    return normalizeSearchInputText(removeSuggestionLabel(query, label));
  }

  const targetSuggestion = suggestions.find((suggestion) => suggestion.label === label);
  const segments = query
    .split(',')
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const lastSegmentIndex = segments.length - 1;

  if (
    targetSuggestion &&
    lastSegmentIndex >= 0 &&
    matchesSuggestionText(targetSuggestion, segments[lastSegmentIndex])
  ) {
    segments[lastSegmentIndex] = label;
  } else {
    segments.push(label);
  }

  const seenLabels = new Set<string>();
  const dedupedSegments = segments.filter((segment) => {
    const matchingSuggestion = suggestions.find((suggestion) => suggestion.label === segment);

    if (!matchingSuggestion) {
      return true;
    }

    if (seenLabels.has(matchingSuggestion.label)) {
      return false;
    }

    seenLabels.add(matchingSuggestion.label);
    return true;
  });

  return normalizeSearchInputText(dedupedSegments.join(', '));
}
