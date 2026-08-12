# Tech Stack — all free, no billed APIs

## Backend
- **Runtime:** Node.js + Fastify
- **DB:** SQLite via `better-sqlite3` — zero config, single file, fast enough for this scale
- **Language:** TypeScript preferred for schema type safety, plain JS is fine too

## Frontend
- **Vite + React** — SPA, runs locally, no deployment needed at this stage
- **Voice capture:** Web Speech API (`window.SpeechRecognition` / `webkitSpeechRecognition`) — built into Chrome, completely free, no API key. Falls back to typed text on unsupported browsers.

## Stage 1 — Keyword validation (all free)
- **YouTube autocomplete:** `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q={query}` — unofficial but stable, widely used, no key needed, returns related searches as JSONP (easy to parse)
- **Google Trends:** `pytrends` (Python) or `google-trends-api` (Node) — unofficial wrapper, free, gives relative interest over time and related queries. Being unauthenticated, Google will block the *IP* with its general "unusual traffic" 429 page if requests come in bursts — not a design flaw, just the cost of a free unofficial endpoint. Two protections, both already in `backend/src/services/googleTrends.ts` / `backend/src/routes/keywordChecks.ts`: real requests are serialized and spaced at least 20s apart (never fired in parallel), and a real result for the same phrase is reused for 7 days instead of re-asking Google (Trends' 12-month rolling average doesn't meaningfully shift day to day). Neither is a workaround for an active block — they just avoid causing one.

Note: this replaces paid tools like TubeBuddy/vidIQ for now. If the free signal proves too thin later, that's a good problem to have — it means the tool is working and worth paying for real keyword data.

## Stage 2 — Research sources (all free)
- **Reddit:** append `.json` to any Reddit URL (e.g. `reddit.com/r/AskIndia/search.json?q=...`) — public posts are readable with no auth for read-only, low-volume personal use
- **Medium:** RSS feeds per tag — `https://medium.com/feed/tag/{tag-name}` — no auth, gives recent articles on a topic
- **Substack:** RSS feed per publication — `https://{publication}.substack.com/feed` — free, but you need to *discover* relevant publications first (see general search below)
- **General blog/Substack discovery:** DuckDuckGo HTML search (no API key required, scrape the results page directly) using `site:substack.com {topic}` or `site:medium.com {topic}` style queries — free and has no daily cap like Google's API does
- **YouTube (search + transcripts):** use `yt-dlp` (free, open-source, no API key) for both steps:
  - Search: `yt-dlp "ytsearch20:{keyword}" --flat-playlist -j` returns matching videos (id, title, channel, url) as JSON — no key, no billed quota, not restricted to any one country's results
  - Transcript: `yt-dlp --write-auto-sub --skip-download --sub-lang en {video_url}` pulls the auto-generated or manual caption track as text. Only the caption/subtitle text is kept — **no video or audio file is ever downloaded to disk**, consistent with the "no raw audio" rule
  - This covers Indian and international creators equally — the search isn't scoped to a region unless the keyword itself implies one

## Stage 2 — Excerpt extraction (the free "AI" part)
This is the key move for staying at $0: **don't call the Anthropic API programmatically** — that's billed per token. Instead, structure this as a **Claude Code slash command**, e.g. `/extract-excerpts {source_id}`, that you trigger, and Claude Code's own interactive session (already covered by your subscription) does the reading and extraction, then writes structured results straight into SQLite. Same approach for the inline script commenting in Stage 4. This isn't a workaround — it's using the tool you're already paying for as the reasoning engine instead of building a second, billed pipeline.

**No fabrication, ever.** These slash commands read from `cleaned_text` that was actually fetched and stored (article text or video transcript) — they extract and quote from it, they don't generate new claims, stats, or quotes from the model's general knowledge. If a source doesn't have a real counterpoint, or a real stat, that excerpt type just doesn't get created for that source. Same for source discovery itself: only real, actually-found URLs get saved as `sources` — never a plausible-sounding one that wasn't actually returned by a real search.

## Stage 4 — Script diffing
- Plain text diff for `change_summary` between versions — `diff` npm package or a simple line-by-line comparison is enough, nothing fancy needed

## What you're deliberately NOT paying for right now
- TubeBuddy / vidIQ APIs
- OpenAI/Whisper hosted transcription
- Any hosted search API (Serper, Google Custom Search, etc.)
- Any cloud database or hosting — this runs on your machine
