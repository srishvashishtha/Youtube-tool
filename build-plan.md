# Build Plan

Build in this order. Each phase should be fully working, even if ugly, before moving to the next. Don't polish UI until Phase 5.

## Phase 1 — Foundation + Capture + Keyword Check
- Set up Fastify + SQLite, create all tables from `database-schema.md`
- Build the topic capture screen: text input + mic button using Web Speech API
- Wire up YouTube autocomplete + Google Trends checks, store results in `keyword_checks`
- Simple verdict display: here's what has volume, here's the adjacent stuff, here's the gap
- **Done when:** you can speak/type an idea and get a keyword read on it, stored against a topic.

## Phase 2 — Research & Excerpts
- Build source discovery: given a topic's keywords, hit Reddit/Medium/Substack/blog search **and YouTube search**, collect candidate URLs — not scoped to any one topic or region, whatever the keywords turn up
- Fetch + clean article text (or video transcript, for YouTube results), save as `sources`
- Build the `/extract-excerpts` Claude Code command that reads a source and writes typed excerpts to `excerpts`
- Build the topic page UI: brief cards per source, click to expand into excerpts
- **Done when:** for a validated topic, you get a page of source cards with typed, relevance-noted excerpts.

## Phase 3 — Highlights
- Add text-selection-to-highlight on the source/excerpt views
- Build the "all highlights for this topic" flat view, each item linking back to its source
- **Done when:** you can highlight anything while reading and find it later in one place, always traceable.

## Phase 4 — Script Workspace + Versioning
- Script upload/paste screen, saved as `scripts` v1
- Build the `/comment-on-script` Claude Code command: reads script + all excerpts/highlights for the topic, writes anchored `script_comments`
- Inline comment display (anchored to text, not a separate panel)
- Version history view — list of versions with change summaries, ability to view any past version
- **Done when:** you can upload a draft, get sourced inline comments, revise, and see the version trail.

## Phase 5 — SEO Recheck Loop + Polish
- Re-run keyword check against latest script content, store in `seo_checks`
- Surface SEO check results alongside the script version they belong to
- Now, and only now: polish the UI, brief card design, highlight interactions
- **Done when:** the full loop — capture → validate → research → highlight → draft → comment → revise → recheck — works start to finish for one real topic.

## After Phase 5
Use it for real, on whatever your actual next video idea is — the tool isn't scoped to one topic, so this can be anything relevant to the 18–35 women audience. Whatever breaks or annoys you in real use is the actual backlog — better signal than anything speculative right now.
