// Reddit's public JSON search — append .json to reddit.com/search, no auth
// needed for read-only, low-volume personal use (tech-stack.md). Not scoped
// to any one subreddit, so results follow whatever the keyword actually is.

import type { DiscoveryCandidate } from "./discovery.js";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export async function searchReddit(keyword: string): Promise<DiscoveryCandidate[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    keyword
  )}&sort=relevance&limit=15`;

  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) {
    // Reddit is known to block non-residential IPs regardless of UA — a real,
    // reportable failure, not silently swallowed. routes/sources.ts surfaces
    // this per-platform rather than failing the whole discovery run.
    throw new Error(`Reddit search failed: HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    data?: { children?: Array<{ data?: { permalink?: string; title?: string; author?: string } }> };
  };
  const children = data?.data?.children ?? [];

  return children
    .map((c) => c.data)
    .filter(
      (d): d is { permalink: string; title: string; author?: string } =>
        !!d?.permalink && !!d?.title
    )
    .map((d) => ({
      url: `https://www.reddit.com${d.permalink}`,
      title: d.title,
      author: d.author ?? null,
      platform: "reddit" as const,
    }));
}
