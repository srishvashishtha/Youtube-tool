#!/usr/bin/env node
// CLI helper for the /comment-on-script slash command. Prints the target
// script version plus every excerpt and highlight for its topic, so a
// Claude Code session has the real research context before commenting.

import { db } from "../src/db/index.js";
import type { Excerpt, Highlight, ScriptVersion } from "../src/types.js";

const [topicIdArg, scriptIdArg] = process.argv.slice(2);
if (!topicIdArg) {
  console.error(JSON.stringify({ error: "Usage: dbReadScriptContext.ts <topic_id> [script_id]" }));
  process.exit(1);
}

let script: ScriptVersion | undefined;
if (scriptIdArg) {
  script = db
    .prepare("SELECT * FROM scripts WHERE id = ? AND topic_id = ?")
    .get(scriptIdArg, topicIdArg) as ScriptVersion | undefined;
} else {
  script = db
    .prepare("SELECT * FROM scripts WHERE topic_id = ? ORDER BY version_number DESC LIMIT 1")
    .get(topicIdArg) as ScriptVersion | undefined;
}

if (!script) {
  console.error(
    JSON.stringify({
      error: `No script found for topic ${topicIdArg}${scriptIdArg ? ` with id ${scriptIdArg}` : ""}.`,
    })
  );
  process.exit(1);
}

const excerpts = db
  .prepare("SELECT * FROM excerpts WHERE topic_id = ? ORDER BY source_id, order_index")
  .all(topicIdArg) as Excerpt[];

const highlights = db
  .prepare("SELECT * FROM highlights WHERE topic_id = ? ORDER BY created_at DESC")
  .all(topicIdArg) as Highlight[];

console.log(JSON.stringify({ script, excerpts, highlights }, null, 2));
