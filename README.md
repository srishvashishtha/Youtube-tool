# Research & Script Assistant

A personal, local-first tool for researching and scripting YouTube videos for an audience of women roughly age 18–35.

It takes a video idea from a voice memo all the way to a fully researched, sourced, version-tracked script — and makes sure every line traces back to where it came from.

The audience (women 18–35) is the constant — not the topic. Any topic relevant to that audience is in scope, video to video; nothing here is hardcoded to a single subject, region, or cultural framing. Sources aren't geographically limited either — Indian and international creators/publications alike, wherever the relevant content actually is.

## The problem

Research for these videos means reading dozens of Medium posts, Substack essays, Reddit threads, and blog posts, and watching other creators' videos on the topic. The bottleneck isn't finding opinions — it's:
1. Losing track of *which article or video* a specific line or stat came from
2. No structured place to collect "things that might be useful" before writing starts
3. No way to get feedback on a draft that's tied back to the actual sources, instead of generic AI edits

## Non-negotiables

- **Zero paid APIs** — every external call uses a free tier or an unofficial-but-free endpoint
- **The script is never AI-written** — this tool researches, organizes, and comments; it never generates the script itself
- **Everything traces back to source** — every excerpt, highlight, and inline comment carries a link back to the original article/video/post
- **Never fabricate** — excerpts, stats, quotes, and sources only ever come from content that was actually fetched and actually exists; if a real source can't be found, it's left out, never invented
- **Local-first** — a single SQLite file on disk, no cloud dependency, runs entirely on your machine
- **Small footprint** — no raw audio/video stored after transcription, no full-page HTML dumps, cleaned text only

## How it works

```
Voice/text idea → keyword validation → research & excerpt collection →
highlight library → script draft → inline sourced comments →
revise → re-check SEO → repeat until final
```

Read [`architecture.md`](./architecture.md) for the full stage-by-stage flow.

## Docs

- [`architecture.md`](./architecture.md) — the 5 stages, what each one does, how data flows between them
- [`database-schema.md`](./database-schema.md) — SQLite schema, all tables and relationships
- [`tech-stack.md`](./tech-stack.md) — exact libraries/APIs used at each stage, and why, all free
- [`build-plan.md`](./build-plan.md) — the order this is built in, phase by phase
- [`CLAUDE.md`](./CLAUDE.md) — project context for Claude Code

## Running it

Requires Node.js 20+ (built and tested on Node 24 LTS). Monorepo with two npm workspaces: `backend` (Fastify API + SQLite) and `frontend` (Vite + React).

```bash
npm install
npm run dev
```

- Backend API: `http://127.0.0.1:4000` — creates `research.db` at the repo root on first run
- Frontend: `http://localhost:5173`

Or run them separately with `npm run dev:backend` / `npm run dev:frontend`. `npm run build` type-checks and builds both.

**Note for Claude Code sessions:** this repo lives under `~/Desktop`, which macOS privacy-gates (TCC) separately from normal file permissions. The Browser pane's `preview_start({name: "dev"})` auto-launcher runs as a helper process that isn't granted access there, so it fails with a `getcwd`/"Operation not permitted" error even though `.claude/launch.json` is correctly configured. Don't try to fix this by touching macOS privacy settings or the repo location — instead, start the dev server directly (`npm run dev` via Bash) and open the preview with `preview_start({url: "http://localhost:5173"})` instead of `{name: "dev"}`. Same result, no permission needed, since it just points a browser tab at an already-running port rather than asking that helper to spawn anything.

## Build status

Building phase by phase per [`build-plan.md`](./build-plan.md).

- ✅ **Phase 1 — Foundation + Capture + Keyword Check.** Fastify + SQLite with all 7 tables from `database-schema.md`; capture screen (text + Web Speech API mic); YouTube autocomplete + Google Trends checks wired to the real endpoints and stored in `keyword_checks`; verdict display grouped by keyword. Verdicts are computed with a transparent, deterministic heuristic over real fetched signal — never a model guess — and the research gate (Stage 2) stays manual, as designed.
- ⬜ Phase 2 — Research & Excerpts (Reddit/Medium/Substack/blogs/YouTube discovery, `/extract-excerpts`)
- ⬜ Phase 3 — Highlights
- ⬜ Phase 4 — Script Workspace + Versioning
- ⬜ Phase 5 — SEO Recheck Loop + Polish

No polished UI until Phase 5 — Phase 1's UI is intentionally plain.
