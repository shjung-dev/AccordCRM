import Fuse from "fuse.js";
import { useMemo } from "react";

interface FuzzySearchResult<T> {
  /** Filtered items — exact matches when available, fuzzy matches otherwise */
  results: T[];
  /** Suggested correction when exact match fails but fuzzy match succeeds */
  suggestion: string | null;
}

/**
 * Fuzzy search hook with "Did you mean?" suggestions.
 *
 * Strategy (mirrors search-engine behaviour):
 *  1. If query is empty → return all items, no suggestion.
 *  2. Try exact substring match first (fast, deterministic).
 *  3. If no exact match → run Fuse.js fuzzy search.
 *  4. If fuzzy results found → return them alongside a "Did you mean ___?"
 *     suggestion derived from the highest-scored match.
 *  5. If nothing matches → return empty results, no suggestion.
 */
export function useFuzzySearch<T>(
  items: T[],
  query: string,
  config: {
    /** Dot-path keys for Fuse.js (e.g. ["firstName", "lastName"]) */
    keys: string[];
    /** Extract a single display string for substring matching & suggestion text */
    getText: (item: T) => string;
    /** Fuse.js threshold — 0 = exact, 1 = match anything. Default 0.4 */
    threshold?: number;
  },
): FuzzySearchResult<T> {
  const { keys, getText, threshold = 0.4 } = config;

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys,
        threshold,
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [items, keys, threshold],
  );

  return useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return { results: items, suggestion: null };
    }

    // ---- Fast path: exact substring match ----
    const exactMatches = items.filter((item) =>
      getText(item).toLowerCase().includes(trimmed),
    );

    if (exactMatches.length > 0) {
      return { results: exactMatches, suggestion: null };
    }

    // ---- Fuzzy fallback via Fuse.js ----
    const fuseResults = fuse.search(query.trim());

    if (fuseResults.length === 0) {
      return { results: [], suggestion: null };
    }

    const suggestion = getText(fuseResults[0].item);

    return {
      results: fuseResults.map((r) => r.item),
      suggestion,
    };
  }, [items, query, fuse, getText]);
}
