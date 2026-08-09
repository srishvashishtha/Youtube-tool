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
- **Google Trends:** `pytrends` (Python) or `google-trends-api` (Node) — unofficial wrapper, free, gives relative interest over time and related queries

Note: this replaces paid tools like TubeBuddy/vidIQ for now. If the free signal proves too thin later, that's a good problem to have — it means the tool is working and worth paying for real keyword data.

## Stage 2 — Research sources (all free)
- **Reddit:** append `.json` to any Reddit URL (e.g. `reddit.com/r/AskIndia/search.json?q=...`) — public posts are readable with no auth for read-only, low-volume personal use
- **Medium:** RSS feeds per tag — `https://medium.com/feed/tag/{tag-name}` — no auth, gives recent articles on a topic
- **Substack:** RSS feed per publication — `https://{publication}.substack.com/feed` — free, but you need to *discover* relevant publications first (see general search below)
- **General blog/Substack discovery:** DuckDuckGo HTML search (no API key required, scrape the results page directly) using `site:substack.com {topic}` or `site:medium.com {topic}` style queries — free and has no daily cap like Google's API does

## Stage 2 — Excerpt extraction (the free "AI" part)
This is the key move for staying at $0: **don't call the Anthropic API programmatically** — that's billed per token. Instead, structure this as a **Claude Code slash command**, e.g. `/extract-excerpts {source_id}`, that you trigger, and Claude Code's own interactive session (already covered by your subscription) does the reading and extraction, then writes structured results straight into SQLite. Same approach for the inline script commenting in Stage 4. This isn't a workaround — it's using the tool you're already paying for as the reasoning engine instead of building a second, billed pipeline.

## Stage 4 — Script diffing
- Plain text diff for `change_summary` between versions — `diff` npm package or a simple line-by-line comparison is enough, nothing fancy needed

## What you're deliberately NOT paying for right now
- TubeBuddy / vidIQ APIs
- OpenAI/Whisper hosted transcription
- Any hosted search API (Serper, Google Custom Search, etc.)
- Any cloud database or hosting — this runs on your machine
