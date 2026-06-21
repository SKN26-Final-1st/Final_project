export type SearchSuggestion = {
  label: string;
  keywords?: string[];
};

type SearchSuggestionsProps = {
  ariaLabel: string;
  query: string;
  suggestions: SearchSuggestion[];
  selectedValues?: string[];
  onToggle?: (value: string) => void;
};

function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase();
}

export function SearchSuggestions({
  ariaLabel,
  query,
  selectedValues = [],
  suggestions,
  onToggle,
}: SearchSuggestionsProps) {
  const normalizedQuery = normalizeSuggestionText(query);
  const selectedSet = new Set(selectedValues);

  const matchedSuggestions = normalizedQuery
    ? suggestions.filter((suggestion) =>
        [suggestion.label, ...(suggestion.keywords ?? [])].some((value) =>
          normalizeSuggestionText(value).includes(normalizedQuery),
        ),
      )
    : [];

  if (!matchedSuggestions.length) {
    return null;
  }

  return (
    <div className="search-suggestion-stack">
      <div className="search-suggestions" role="group" aria-label={ariaLabel}>
        {matchedSuggestions.map((suggestion) => {
          const selected = selectedSet.has(suggestion.label);

          return (
            <button
              aria-pressed={selected}
              className={`search-suggestion-chip ${selected ? 'selected' : ''}`}
              key={suggestion.label}
              type="button"
              onClick={() => onToggle?.(suggestion.label)}
            >
              {suggestion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
