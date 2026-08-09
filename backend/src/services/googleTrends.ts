// Free, unofficial wrapper around Google Trends. See docs/tech-stack.md — Stage 1.
// No `geo` is set on purpose — worldwide interest, not scoped to any one country.
// Real signal only: whatever Trends actually returns is what gets stored, nothing invented.

// @ts-expect-error — no published types for this package
import googleTrends from "google-trends-api";

export interface TrendsResult {
  keyword: string;
  avgInterest: number; // 0-100, relative interest averaged over the window
  relatedQueries: string[]; // "adjacent phrases" — top related queries, if any
  error?: string; // set only when the real request failed; never fabricated data
}

const TWELVE_MONTHS_MS = 1000 * 60 * 60 * 24 * 365;

export async function fetchGoogleTrends(keyword: string): Promise<TrendsResult> {
  const startTime = new Date(Date.now() - TWELVE_MONTHS_MS);

  try {
    const [interestRaw, relatedRaw] = await Promise.all([
      googleTrends.interestOverTime({ keyword, startTime }),
      googleTrends.relatedQueries({ keyword, startTime }).catch(() => null),
    ]);

    const interest = JSON.parse(interestRaw);
    const timeline: Array<{ value: number[] }> =
      interest?.default?.timelineData ?? [];
    const values = timeline
      .map((point) => point.value?.[0])
      .filter((v): v is number => typeof v === "number");
    const avgInterest =
      values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;

    let relatedQueries: string[] = [];
    if (relatedRaw) {
      const related = JSON.parse(relatedRaw);
      const rankedLists = related?.default?.rankedList ?? [];
      // rankedList[0] = top, rankedList[1] = rising — pull real query strings only
      relatedQueries = rankedLists
        .flatMap(
          (list: { rankedKeyword?: Array<{ query?: string }> }) =>
            list.rankedKeyword ?? []
        )
        .map((k: { query?: string }) => k.query)
        .filter((q: unknown): q is string => typeof q === "string")
        .slice(0, 10);
    }

    return { keyword, avgInterest, relatedQueries };
  } catch (err) {
    return {
      keyword,
      avgInterest: 0,
      relatedQueries: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
