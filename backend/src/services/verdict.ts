// Turns real fetched signal (autocomplete suggestions / trends numbers) into one of
// the four verdict labels from docs/database-schema.md. This is a deterministic,
// transparent heuristic over real data — never a model guess, never fabricated.
// It's a first-pass label, not the final word: Stage 1's gate is still you looking
// at the raw signal_notes and deciding go/no-go (see docs/architecture.md).

import type { KeywordCheckVerdict } from "../types.js";
import type { AutocompleteResult } from "./youtubeAutocomplete.js";
import type { TrendsResult } from "./googleTrends.js";

// Minimum average Trends interest (0-100 scale) to call it "proceed".
const TRENDS_PROCEED_THRESHOLD = 15;

export function verdictFromAutocomplete(result: AutocompleteResult): {
  verdict: KeywordCheckVerdict;
  signal_notes: string;
} {
  const { keyword, suggestions } = result;

  if (suggestions.length === 0) {
    return {
      verdict: "low-interest",
      signal_notes: "No YouTube autocomplete suggestions found for this phrase.",
    };
  }

  const exactMatch = suggestions.some(
    (s) => s.trim().toLowerCase() === keyword.trim().toLowerCase()
  );

  if (exactMatch) {
    return {
      verdict: "proceed",
      signal_notes: `Autocomplete suggestions: ${suggestions.join(" | ")}`,
    };
  }

  return {
    verdict: "reframe",
    signal_notes: `No exact-phrase match, but related searches exist: ${suggestions.join(
      " | "
    )}`,
  };
}

export function verdictFromTrends(result: TrendsResult): {
  verdict: KeywordCheckVerdict;
  signal_notes: string;
} {
  if (result.error) {
    return {
      verdict: "error",
      signal_notes: `Google Trends request failed: ${result.error}`,
    };
  }

  const { avgInterest, relatedQueries } = result;

  if (avgInterest === 0 && relatedQueries.length === 0) {
    return {
      verdict: "low-interest",
      signal_notes: "No measurable Trends interest and no related queries over the last 12 months.",
    };
  }

  if (avgInterest === 0 && relatedQueries.length > 0) {
    return {
      verdict: "reframe",
      signal_notes: `No direct interest for this phrase, but related queries show interest: ${relatedQueries.join(
        " | "
      )}`,
    };
  }

  if (avgInterest < TRENDS_PROCEED_THRESHOLD) {
    return {
      verdict: "underserved",
      signal_notes: `Average interest ${avgInterest}/100 over the last 12 months — thin but real signal.${
        relatedQueries.length ? ` Related queries: ${relatedQueries.join(" | ")}` : ""
      }`,
    };
  }

  return {
    verdict: "proceed",
    signal_notes: `Average interest ${avgInterest}/100 over the last 12 months.${
      relatedQueries.length ? ` Related queries: ${relatedQueries.join(" | ")}` : ""
    }`,
  };
}
