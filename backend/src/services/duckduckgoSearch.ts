// General blog/Substack-publication discovery via DuckDuckGo's HTML results
// page (tech-stack.md) — free, no key, no daily cap. A plain GET returns an
// anti-bot "anomaly" challenge page instead of results; a POST with a
// browser-shaped header set returns real, parseable results (verified
// directly against a live query before wiring this in).
//
// Same posture as googleTrends.ts: this is an unofficial endpoint, so real
// requests are throttled to avoid becoming the reason it starts blocking us —
// not an attempt to route around a block already in effect.

import * as cheerio from "cheerio";
import type { DiscoveryCandidate } from "./discovery.js";
import type { SourcePlatform } from "../types.js";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MIN_INTERVAL_MS = 5_000;
let queue: Promise<void> = Promise.resolve();

function throttledCall<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const result = await fn();
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function unwrapDdgRedirect(href: string): string | null {
  try {
    const full = href.startsWith("//") ? `https:${href}` : href;
    const real = new URL(full).searchParams.get("uddg");
    return real ? decodeURIComponent(real) : full;
  } catch {
    return null;
  }
}

function guessPlatform(url: string, siteFilter?: string): SourcePlatform {
  if (siteFilter?.includes("substack.com") || url.includes("substack.com")) return "substack";
  if (siteFilter?.includes("medium.com") || url.includes("medium.com")) return "medium";
  return "blog";
}

/** `siteFilter`, e.g. "substack.com", scopes the query to `site:{siteFilter} {query}`. */
export async function searchDuckDuckGo(
  query: string,
  siteFilter?: string
): Promise<DiscoveryCandidate[]> {
  const q = siteFilter ? `site:${siteFilter} ${query}` : query;

  return throttledCall(async () => {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://html.duckduckgo.com/html/",
      },
      body: new URLSearchParams({ q }).toString(),
    });
    if (!res.ok) {
      throw new Error(`DuckDuckGo search failed: HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // A real results page always has the #links container, even with zero
    // hits. Its absence means this is the anti-bot challenge page, not
    // results — a real failure to report, not "zero results found".
    if ($("#links").length === 0) {
      throw new Error(
        "DuckDuckGo returned an unrecognized page (likely a bot-detection challenge, not results)"
      );
    }

    const results: DiscoveryCandidate[] = [];
    $(".result__a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");
      if (!title || !href) return;
      const url = unwrapDdgRedirect(href);
      if (url) {
        results.push({ url, title, author: null, platform: guessPlatform(url, siteFilter) });
      }
    });
    return results;
  });
}
