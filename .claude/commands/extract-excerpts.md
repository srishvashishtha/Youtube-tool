---
description: Extract typed, sourced excerpts from a fetched source into the excerpts table
argument-hint: <source_id>
allowed-tools: Bash(.claude/run-node.sh:*), Read, Write(.claude/tmp/*)
---

Read source $ARGUMENTS from the database:

    .claude/run-node.sh --import tsx backend/scripts/dbReadSource.ts $ARGUMENTS

This prints the source's real `cleaned_text` (article text, or video transcript for a `youtube` source), plus its `title`/`author`/`url`/`topic_id`.

From that `cleaned_text` ONLY — never from your own general knowledge, never paraphrased into something punchier — extract excerpts of these types, wherever a real one actually exists in the text:

- `quote` — a line worth reading aloud or showing on screen
- `stat` — a number or data point
- `visual` — something better shown than said (a chart, a screenshot-worthy claim)
- `counterpoint` — disagrees with the working thesis, useful for contradicting rather than just citing
- `example` — a real scenario or anecdote that could be adapted

**Rules — these are load-bearing, not stylistic preferences:**
- Skip any type with no real basis in *this specific* source. Five types is a ceiling, not a quota — a thin source might yield one excerpt, or zero, and that's a correct outcome, not a failure to fix by reaching further.
- Each excerpt's `content` must be copied verbatim (light trimming only — no paraphrase, no "cleaning up" the wording) from `cleaned_text`. It has to be an actual substring, because the write step below mechanically checks that and rejects anything that isn't. If you paraphrase, it will be rejected, correctly.
- Each excerpt needs a one-line `relevance_note`: why it might matter for the script.

Write the excerpts as a JSON array to `.claude/tmp/excerpts-$ARGUMENTS.json`:

```json
[{"type": "quote", "content": "...", "relevance_note": "..."}]
```

Then run:

    .claude/run-node.sh --import tsx backend/scripts/dbWriteExcerpts.ts $ARGUMENTS .claude/tmp/excerpts-$ARGUMENTS.json

Report back exactly what it printed — what was inserted, and anything rejected. A rejection means the write script couldn't verify that excerpt against the real source text (or the type was invalid). That's expected, correct behavior — never work around a rejection by rephrasing and resubmitting; it means the excerpt wasn't real to begin with.
