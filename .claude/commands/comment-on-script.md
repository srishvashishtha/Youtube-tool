---
description: Read a script version plus all its research, and leave anchored, sourced inline comments — never edits the script itself
argument-hint: <topic_id> [script_id]
allowed-tools: Bash(.claude/run-node.sh:*), Read, Write(.claude/tmp/*)
---

Read the script and all its research context:

    .claude/run-node.sh --import tsx backend/scripts/dbReadScriptContext.ts $ARGUMENTS

This prints the target script version's real `content` (the latest version if you didn't pass a `script_id`), plus every `excerpt` and `highlight` already collected for this topic.

Read through the script and leave comments — grammar notes, SEO notes, a stronger stat available in the research, a place a counterpoint would strengthen the argument, a real example from the research that fits. **This tool never writes prose into the script itself** — it only ever comments. Do not draft replacement lines, do not rewrite sentences "for" the user — describe what's stronger and point at it.

**Rules — these are load-bearing, not stylistic preferences:**
- Every `anchor_text` must be copied verbatim (light trimming only) from the script's real `content` you just read — it has to be an actual substring, because the write step below mechanically checks that and rejects anything that isn't.
- Only set `linked_excerpt_id` when you're pointing at a real excerpt from the context you just read — never a plausible-sounding id. The write step verifies it exists and belongs to this topic.
- `comment_type` is one of: `source_suggestion`, `grammar`, `seo`, `counterpoint`, `example`.
- If the research doesn't actually have a stronger stat/counterpoint/example for a given line, don't comment on it just to have said something — silence on a line is a valid, honest outcome.

Write the comments as a JSON array to `.claude/tmp/comments-<script_id>.json`:

```json
[{"anchor_text": "...", "comment_text": "...", "comment_type": "...", "linked_excerpt_id": null}]
```

Then run (substitute the actual script id from what you read above):

    .claude/run-node.sh --import tsx backend/scripts/dbWriteComments.ts <script_id> .claude/tmp/comments-<script_id>.json

Report back exactly what it printed — what was inserted, and anything rejected. A rejection means the anchor text wasn't really in the script, or the excerpt link didn't check out. That's expected, correct behavior — never work around it by rephrasing and resubmitting.
