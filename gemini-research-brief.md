# Gemini Research Brief — reusable prompt

Paste the block below into a fresh Gemini chat at the start of research for any
new video, then follow it with your one-line video idea. Reuse it as-is every
time — only the video idea changes, never this brief.

Why this exists: Gemini's discovery (Substack, Reddit, books, editorial) is
genuinely wider than what this tool can scrape on its own — verified directly
against a real research session. But two specific failure modes showed up in
that same session: a quote that was actually a paraphrase presented in
quotation marks, and a real neuroscience finding pinned to a paper that never
made that claim (a real fMRI study exists — Gemini cited the wrong one, a
survey study with no imaging data at all). This brief exists to close exactly
those two gaps, not to relitigate whether Gemini can search — it can.

The output feeds a local tool that fetches every URL for real and checks
quotes against the actual page text, so: the more precisely you follow the
output format below, the less gets flagged for rework later.

---

## The prompt

```
You are doing research for a YouTube video essay aimed at women roughly
18–35. The topic varies every time I run this — treat whatever idea I give
you below as the actual scope, not a fixed subject area.

I need you to do keyword/interest validation and multi-platform research,
and I need the output structured so it can be mechanically fact-checked
afterward. That means two rules matter more than usual:

RULE 1 — QUOTES MUST BE EXACT, OR LABELED AS NOT EXACT.
If you put something in quotation marks, it must be copied character-for-
character from the source you found — not smoothed, not combined from two
sentences, not shortened with your own connecting words. If you are giving
me the idea of what a source said rather than its exact words, do not use
quotation marks at all — prefix it with "paraphrase:" instead. When in
doubt, paraphrase and label it. A labeled paraphrase is useful to me; an
unlabeled one that turns out inexact is worse than useless.

RULE 2 — NAME A STUDY ONLY IF YOU ARE CITING WHAT THAT STUDY ACTUALLY FOUND.
If you reference a specific paper, book, or study by name, give its exact
title, author(s), and year, and only attribute findings to it that it
actually contains. If you know a finding is real (e.g. a well-replicated
psychological effect) but you're not certain which specific paper to
attribute it to, say so explicitly: "this is a documented finding — exact
citation uncertain" — do not attach a plausible-sounding citation to make it
look sourced. A confident wrong citation is the single worst thing you can
hand me, because it looks the most trustworthy and I'm most likely to put it
on screen.

RULE 3 — URLS MUST COME FROM AN ACTUAL SEARCH RESULT.
Only give me a URL you retrieved from a real search — never construct one by
guessing a slug or combining words into what a URL "would probably" be.
If you're not sure a URL is real, say so instead of including it.

My video idea: [PASTE YOUR ONE-LINE VIDEO IDEA HERE]

---

Do the following, in order:

## Step 1 — Validate the idea
- The specific tension underneath the surface topic (not the topic itself —
  the real discomfort or contradiction).
- Who this is for, one sentence.
- What the viewer should feel or think differently after watching.
- The most counterintuitive angle available.
- Is this right-sized for an 8–20 minute video, too broad, or too niche?
Be direct — if it's not ready, say what's missing.

## Step 2 — Keyword & interest signal check
Tell me what you can genuinely assess (search interest trends you're aware
of, how saturated the topic already is, adjacent phrases people search) and
be explicit about what you cannot verify in real time (live Google Trends
numbers, current YouTube autocomplete results) rather than inventing
plausible-looking numbers for either.

## Step 3 — Multi-platform discovery
Find real material across: Substack, Reddit, Medium/editorial (Aeon, The
Atlantic, longform outlets), books (Goodreads/Amazon links), YouTube
creators, and Instagram creators — international and Indian sources alike,
wherever the actual relevant content is, not scoped to one region unless the
topic itself calls for it.

For each platform, prioritize personal essays, cultural critique, and
psychological/sociological angles over listicles or generic news. Flag the
2–3 sources per platform most worth reading first.

## Step 4 — Extraction
For every source, give me:
- Platform, exact URL, author, publication/channel name.
- 2–4 excerpts, each tagged as one of: quote / paraphrase / stat / example /
  counterpoint / visual-metaphor.
- Each excerpt's type follows Rule 1 — "quote" means verbatim, no exceptions.
- One line on why it's relevant to my specific angle.
- A confidence tag: verified (you're certain this is exact and correctly
  attributed) / uncertain (flag it, tell me why).

## Step 5 — Synthesis
- The strongest 3–4 points to build the video around.
- The most surprising insight across everything you found.
- The one emotional throughline that ties it together.
- Contradictions or tensions worth exploring on camera.
- What's already overdone on this topic across creators, so I know what to
  avoid repeating.

## Step 6 — Self-audit (do this last, after everything above)
Re-read every string you put in quotation marks against what you actually
found. If you can't currently verify one is exact, downgrade it to
"paraphrase:" or remove it — don't leave it as-is out of convenience. List
anything you're still uncertain about at the very end under a header called
FLAGGED FOR MANUAL REVIEW, so I know exactly what to double-check myself
before I use it on screen.

---

Format every source as its own block, exactly like this, so I can paste it
into my research tool:

### SOURCE
Platform:
URL:
Author:
Publication/Channel:
Title:

EXCERPT 1
Type: quote | paraphrase | stat | example | counterpoint | visual-metaphor
Confidence: verified | uncertain
Content:
Relevance:

EXCERPT 2
[repeat as needed]
```

---

## What happens after Gemini's output comes back

Paste the structured output into this tool's research screen. The tool will:
1. Fetch every URL for real and store the cleaned article/transcript text.
2. Check every excerpt tagged `quote` against that real text — verbatim
   match required, same substring-containment guard already used for
   `/extract-excerpts`.
3. Anything tagged `paraphrase`, `stat`, or `uncertain` is stored but visibly
   flagged as unverified rather than silently accepted, since those can't be
   substring-checked the same way.
4. Anything that fails the check is rejected, not silently dropped — you see
   what didn't verify and why, the same way `dbWriteExcerpts.ts` currently
   reports `{inserted, rejected}`.

This is not built yet — it's the natural next step once you've used the
prompt above on a real topic and have output to import.
