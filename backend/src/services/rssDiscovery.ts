// Medium tag feeds and Substack publication feeds — both plain RSS, no auth,
// no key (tech-stack.md). Substack has no built-in search, so publications
// have to be *discovered* first (see duckduckgoSearch.ts) before their feed
// can be pulled here.

import Parser from "rss-parser";
import type { DiscoveryCandidate } from "./discovery.js";

const parser = new Parser({ timeout: 15_000 });

function slugifyTag(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function fetchMediumTag(keyword: string): Promise<DiscoveryCandidate[]> {
  const tag = slugifyTag(keyword);
  const feed = await parser.parseURL(`https://medium.com/feed/tag/${tag}`);
  return (feed.items ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      url: item.link as string,
      title: item.title as string,
      author: item.creator ?? item.author ?? null,
      platform: "medium" as const,
    }));
}

export async function fetchSubstackFeed(
  publicationSlug: string
): Promise<DiscoveryCandidate[]> {
  const feed = await parser.parseURL(`https://${publicationSlug}.substack.com/feed`);
  return (feed.items ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      url: item.link as string,
      title: item.title as string,
      author: item.creator ?? item.author ?? feed.title ?? null,
      platform: "substack" as const,
    }));
}
