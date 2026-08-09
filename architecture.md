# Architecture

Five stages. One topic moves through all of them, stored under a single `topic_id`.

## Stage 0 — Capture
**Input:** voice memo (browser mic) or typed text — a loose brain-dump of what the video should be about.
**What happens:** the Web Speech API (built into Chrome, free) transcribes speech to text live in the browser. No audio file is ever saved — only the transcript.
**Output:** a new `topics` row with `seed_transcript` filled in, status = `draft`.

## Stage 1 — Keyword Validation
**Input:** the seed transcript (or a topic title you refine from it).
**What happens:**
1. Extract 3–5 candidate keyword phrases from the transcript (you can do this by hand, or via a Claude Code prompt).
2. Check YouTube's autocomplete endpoint for each phrase — shows what people actually search for around that phrase.
3. Check Google Trends (via `pytrends`) for relative interest over time.
4. If direct keyword volume is low: don't kill the topic. Surface *adjacent* phrases that do have volume, and flag whether this looks like an underserved-topic situation (worth doing anyway) vs. a genuinely low-interest one.
**Output:** a `keyword_checks` row per phrase checked, plus a verdict on the topic: proceed / proceed with reframed angle / reconsider.
**Gate:** research (Stage 2) doesn't start until you've looked at this and said go.

## Stage 2 — Research & Excerpt Collection
**Input:** the validated topic + keywords. Not limited to any one topic domain or region — whatever the topic is, search wherever relevant content actually exists.
**What happens:**
1. Search across Reddit, Medium, Substack, general blogs, **and YouTube** for each keyword (see `tech-stack.md` for the exact free method per source). YouTube search/discovery is not restricted to Indian creators — international creators covering the same topic are equally in scope.
2. For each result:
   - Article/post: fetch and clean the page text, save as a `sources` row.
   - YouTube video: fetch the video's transcript/captions (no video or audio file is downloaded or stored) and its metadata (title, channel, url), save as a `sources` row with `platform = 'youtube'`.
3. Run each source through Claude Code (interactively, as a slash command — not a billed API call) with a prompt that extracts **excerpts**, not just a summary. Each excerpt is typed:
   - `quote` — a line worth reading aloud or showing on screen
   - `stat` — a number or data point
   - `visual` — something better shown than said (a chart, screenshot-worthy claim)
   - `counterpoint` — disagrees with your working thesis, useful when you want to contradict rather than just cite
   - `example` — a real scenario or anecdote you could adapt
4. Excerpts save with a one-line relevance note: *why this might matter for your script.*

**Hard rule for this whole stage:** every excerpt must be pulled from the actual `cleaned_text` (article text or video transcript) that was fetched and stored — never generated or inferred from the model's own knowledge. If a source doesn't actually contain a good `stat`, or a `counterpoint`, or whatever type, that type is simply skipped for that source. Nothing gets invented to fill a category, and no source gets cited that wasn't actually fetched and verified to exist.

**Output:** `sources` rows (one per article or video) and `excerpts` rows (many per source), all tagged to the topic.
**UI shape:** a topic page showing brief cards, one per source — click to expand into that source's excerpts.

## Stage 3 — Highlight Library
Separate from excerpts. Excerpts are what the *system* pulled out. Highlights are what *you* mark as you read through the brief cards.
**What happens:** while reading any source or excerpt, select text → highlight. It saves with a link back to the exact `source_id` (and `excerpt_id` if it was inside one).
**Output:** a single "all highlights for this topic" view, flat and skimmable, each item still clickable back to its source.
**Why this matters:** this is the direct fix for "I remember the line but not where I read it." The highlight *is* the pointer back.

## Stage 4 — Script Workspace
**Input:** you write the script yourself, outside any AI assistance, and paste/upload it as `scripts` version 1.
**What happens:**
1. Claude Code reads the script alongside all excerpts + highlights for the topic.
2. It leaves **inline comments** anchored to specific lines/sentences (not a separate panel) — e.g. "there's a stronger stat for this claim in [source X]," a grammar note, or "consider a counterpoint here — see [excerpt Y]."
3. Every comment that references research links directly to the source/excerpt it came from.
4. You revise, and re-upload as version 2. The diff between versions is stored, not just the final text — so you can see what changed and why.
**Output:** `scripts` rows (one per version) + `script_comments` rows anchored to each version.

## Stage 5 — SEO Recheck Loop
**Input:** the latest script version.
**What happens:** re-run the Stage 1 keyword check against the *actual script content* now (working title, likely thumbnail text, key phrases used) rather than just the original idea. Flags if the script has drifted from what has search demand, or confirms it's still aligned.
**Output:** a `seo_checks` row per script version, feeding into your next revision.

## The loop
Stages 3–5 repeat: write → get sourced comments → revise → recheck → write again, until you mark the topic `final`.
