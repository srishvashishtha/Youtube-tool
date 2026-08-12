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

// This endpoint isn't an authenticated API — it's the same unofficial request
// trends.google.com's own front end makes. Firing it in bursts gets the *IP*
// blocked with Google's general "unusual traffic" page (verified directly: a
// plain curl during heavy testing came back HTTP 429 with the standard
// robot.png "Error 429 (Too Many Requests)!!1" body — that's Google's anti-abuse
// block, not a per-call rate limit). The fix is to stop causing it: never have
// more than one real request in flight, and space every one out. This does not
// try to get around a block that's already in effect — see the reuse-recent-
// result cache in routes/keywordChecks.ts for the other half of that.
const MIN_INTERVAL_MS = 20_000;
let queue: Promise<void> = Promise.resolve();

function throttledCall<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const result = await fn();
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
    return result;
  });
  // Keep the queue moving even if this call failed, so later calls still wait
  // their turn instead of piling up right behind a rejection.
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function fetchGoogleTrends(keyword: string): Promise<TrendsResult> {
  const startTime = new Date(Date.now() - TWELVE_MONTHS_MS);

  try {
    // Sequential, throttled — not Promise.all — so these two real requests to
    // Google never overlap and are always MIN_INTERVAL_MS apart.
    const interestRaw = await throttledCall<string>(() =>
      googleTrends.interestOverTime({ keyword, startTime })
    );
    const relatedRaw = await throttledCall<string | null>(() =>
      googleTrends.relatedQueries({ keyword, startTime }).catch(() => null)
    );

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
