// Shared shape for every source-discovery service (reddit/rss/duckduckgo/
// youtube). Each service returns real candidates only — never a
// plausible-sounding URL that wasn't actually returned by a real search —
// and throws on a genuine request failure so routes/sources.ts can surface
// per-platform status instead of silently losing it.

import type { SourcePlatform } from "../types.js";

export interface DiscoveryCandidate {
  url: string;
  title: string;
  author: string | null;
  platform: SourcePlatform;
}
