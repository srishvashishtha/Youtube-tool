#!/usr/bin/env node
// CLI helper for the /extract-excerpts slash command (run via .claude/run-node.sh
// + tsx). Prints one source row as JSON so a Claude Code session reads the
// actual fetched text before extracting from it — never from its own
// general knowledge.

import { db } from "../src/db/index.js";
import type { Source } from "../src/types.js";

const sourceId = process.argv[2];
if (!sourceId) {
  console.error(JSON.stringify({ error: "Usage: dbReadSource.ts <source_id>" }));
  process.exit(1);
}

const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(sourceId) as
  | Source
  | undefined;

if (!source) {
  console.error(JSON.stringify({ error: `Source ${sourceId} not found.` }));
  process.exit(1);
}

console.log(JSON.stringify(source, null, 2));
