# Research & Script Assistant

A personal, local-first tool for researching and scripting YouTube videos on Indian women's challenges — being a "high value woman" within a collectivist culture, partner selection, career, and related themes.

It takes a video idea from a voice memo all the way to a fully researched, sourced, version-tracked script — and makes sure every line traces back to where it came from.

## The problem

Research for these videos means reading dozens of Medium posts, Substack essays, Reddit threads, and blog posts. The bottleneck isn't finding opinions — it's:
1. Losing track of *which article* a specific line or stat came from
2. No structured place to collect "things that might be useful" before writing starts
3. No way to get feedback on a draft that's tied back to the actual sources, instead of generic AI edits

## Non-negotiables

- **Zero paid APIs** — every external call uses a free tier or an unofficial-but-free endpoint
- **The script is never AI-written** — this tool researches, organizes, and comments; it never generates the script itself
- **Everything traces back to source** — every excerpt, highlight, and inline comment carries a link back to the original article/post
- **Local-first** — a single SQLite file on disk, no cloud dependency, runs entirely on your machine
- **Small footprint** — no raw audio stored after transcription, no full-page HTML dumps, cleaned text only

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

## Build status

Building phase by phase per [`build-plan.md`](./build-plan.md) — Phase 1 (foundation, capture, keyword check) fully working before moving to Phase 2, and so on. No polished UI until Phase 5.
