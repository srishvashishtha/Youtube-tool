# Research & Script Assistant — Project Context

## What this is
A personal tool for researching and scripting YouTube videos on Indian women's challenges — being a "high value woman" within a collectivist culture, partner selection, career, and related themes. It takes a video idea from a voice memo all the way to a fully researched, sourced, version-tracked script.

## The core problem this solves
Research for these videos means reading dozens of Medium posts, Substack essays, Reddit threads, and blog posts. The bottleneck isn't finding opinions — it's:
1. Losing track of *which article* a specific line or stat came from
2. No structured place to collect "things that might be useful" before writing starts
3. No way to get feedback on a draft that's tied back to the actual sources, instead of generic AI edits

## Non-negotiables (read before building)
- **Zero paid APIs.** Every external call must use a free tier or an unofficial-but-free endpoint. See `docs/tech-stack.md` for the exact list — don't substitute a paid alternative without flagging it first.
- **The script is never AI-written.** This tool researches, organizes, and comments. It never generates the script itself. Inline comments suggest — they never insert prose directly into the script.
- **Everything traces back to source.** Every excerpt, every highlight, every inline comment that references research must carry a link back to the original article/post. No orphaned quotes.
- **Local-first.** SQLite file on disk, no cloud dependency, runs entirely on your machine.
- **Small footprint.** No raw audio stored after transcription. No full-page HTML dumps — store cleaned text only.

## How the pieces fit together
Read `docs/architecture.md` for the full stage-by-stage flow. Short version:

`Voice/text idea → keyword validation → research & excerpt collection → highlight library → script draft → inline sourced comments → revise → re-check SEO → repeat until final`

## Docs in this project
- `docs/architecture.md` — the 5 stages, what each one does, how data flows between them
- `docs/database-schema.md` — SQLite schema, all tables and relationships
- `docs/tech-stack.md` — exact libraries/APIs to use at each stage, and why, all free
- `docs/build-plan.md` — the order to build this in, phase by phase

## Build philosophy
Build phase by phase, in the order in `docs/build-plan.md`. Get Phase 1 fully working end-to-end (even if ugly) before starting Phase 2. Don't build the polished UI first — get the data flow correct first, since the whole point of this tool is trustworthy source-linking, not visual polish.
