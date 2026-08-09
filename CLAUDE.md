# Research & Script Assistant — Project Context

## What this is
A personal tool for researching and scripting YouTube videos for an audience of women roughly age 18–35. It takes a video idea from a voice memo all the way to a fully researched, sourced, version-tracked script.

**The audience is the constant, not the topic.** "Indian women's challenges / high value woman" is one example topic this tool has been used for — it is not a hardcoded subject area, a benchmark, or a category the tool is scoped to. Any topic relevant to this audience is in scope, and topics are expected to vary video to video. Never hardcode a specific topic, region, or cultural framing into prompts, filters, or logic — the topic comes from the user's voice memo/text idea each time, not from this file.

**Sources are not geographically limited.** Research pulls from wherever relevant content actually exists — Indian and international sources alike, including international YouTubers/creators. Don't scope source discovery to one country or region unless the specific topic at hand calls for it.

## The core problem this solves
Research for these videos means reading dozens of Medium posts, Substack essays, Reddit threads, blog posts, and watching other creators' videos on the topic. The bottleneck isn't finding opinions — it's:
1. Losing track of *which article or video* a specific line or stat came from
2. No structured place to collect "things that might be useful" before writing starts
3. No way to get feedback on a draft that's tied back to the actual sources, instead of generic AI edits

## Non-negotiables (read before building)
- **Zero paid APIs.** Every external call must use a free tier or an unofficial-but-free endpoint. See `docs/tech-stack.md` for the exact list — don't substitute a paid alternative without flagging it first.
- **The script is never AI-written.** This tool researches, organizes, and comments. It never generates the script itself. Inline comments suggest — they never insert prose directly into the script.
- **Everything traces back to source.** Every excerpt, every highlight, every inline comment that references research must carry a link back to the original article/video/post. No orphaned quotes.
- **Never fabricate.** This is as important as source-linking and applies to every research and extraction step. Excerpts, summaries, stats, quotes, and sources must only ever come from content that was actually fetched and actually exists (a real article, a real video transcript, a real search result) — never generated from the model's own memory or "filled in" to complete a type/category. If a real source can't be found for something, the answer is to leave it out, not to invent one. When in doubt, don't include it.
- **Local-first.** SQLite file on disk, no cloud dependency, runs entirely on your machine.
- **Small footprint.** No raw audio/video stored after transcription. No full-page HTML dumps — store cleaned text only.

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
