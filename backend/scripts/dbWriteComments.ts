#!/usr/bin/env node
// CLI helper for the /comment-on-script slash command. Writes anchored
// comments to `script_comments` — but only after verifying `anchor_text` is
// an actual substring of that script version's real content, and that any
// `linked_excerpt_id` really exists and belongs to the same topic. Same
// mechanical enforcement as dbWriteExcerpts.ts. This script has no path to
// ever touch `scripts.content` — it only ever inserts into `script_comments`,
// which is what keeps the script itself human-written, structurally.

import { readFileSync } from "node:fs";
import { db } from "../src/db/index.js";
import type { Excerpt, ScriptCommentType, ScriptVersion } from "../src/types.js";

const VALID_TYPES: ScriptCommentType[] = [
  "source_suggestion",
  "grammar",
  "seo",
  "counterpoint",
  "example",
];

interface RawComment {
  anchor_text?: string;
  comment_text?: string;
  comment_type?: string;
  linked_excerpt_id?: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const [scriptIdArg, jsonPathArg] = process.argv.slice(2);
if (!scriptIdArg || !jsonPathArg) {
  console.error(
    JSON.stringify({ error: "Usage: dbWriteComments.ts <script_id> <json_file_path>" })
  );
  process.exit(1);
}

const script = db.prepare("SELECT * FROM scripts WHERE id = ?").get(scriptIdArg) as
  | ScriptVersion
  | undefined;
if (!script) {
  console.error(JSON.stringify({ error: `Script ${scriptIdArg} not found.` }));
  process.exit(1);
}

let items: RawComment[];
try {
  const parsed = JSON.parse(readFileSync(jsonPathArg, "utf-8"));
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of comments");
  items = parsed;
} catch (err) {
  console.error(
    JSON.stringify({
      error: `Could not read/parse ${jsonPathArg}: ${err instanceof Error ? err.message : String(err)}`,
    })
  );
  process.exit(1);
}

const normalizedScriptContent = normalize(script.content);

const inserted: Array<{ anchor_text: string; comment_text: string }> = [];
const rejected: Array<{ anchor_text?: string; comment_text?: string; reason: string }> = [];

const insertStmt = db.prepare(
  `INSERT INTO script_comments (script_id, anchor_text, comment_text, comment_type, linked_excerpt_id)
   VALUES (?, ?, ?, ?, ?)`
);

for (const item of items) {
  if (!item?.anchor_text?.trim()) {
    rejected.push({
      anchor_text: item?.anchor_text,
      comment_text: item?.comment_text,
      reason: "Missing or empty anchor_text.",
    });
    continue;
  }
  if (!item.comment_text?.trim()) {
    rejected.push({
      anchor_text: item.anchor_text,
      comment_text: item.comment_text,
      reason: "Missing or empty comment_text.",
    });
    continue;
  }
  if (item.comment_type && !VALID_TYPES.includes(item.comment_type as ScriptCommentType)) {
    rejected.push({
      anchor_text: item.anchor_text,
      comment_text: item.comment_text,
      reason: `Invalid comment_type. Must be one of: ${VALID_TYPES.join(", ")}`,
    });
    continue;
  }

  const normalizedAnchor = normalize(item.anchor_text);
  if (!normalizedScriptContent.includes(normalizedAnchor)) {
    rejected.push({
      anchor_text: item.anchor_text,
      comment_text: item.comment_text,
      reason:
        "anchor_text is not an actual substring of this script version's real content — refused (never fabricate).",
    });
    continue;
  }

  if (item.linked_excerpt_id != null) {
    const excerpt = db.prepare("SELECT * FROM excerpts WHERE id = ?").get(item.linked_excerpt_id) as
      | Excerpt
      | undefined;
    if (!excerpt || excerpt.topic_id !== script.topic_id) {
      rejected.push({
        anchor_text: item.anchor_text,
        comment_text: item.comment_text,
        reason: `linked_excerpt_id ${item.linked_excerpt_id} does not exist or belongs to a different topic — refused.`,
      });
      continue;
    }
  }

  insertStmt.run(
    scriptIdArg,
    item.anchor_text.trim(),
    item.comment_text.trim(),
    item.comment_type ?? null,
    item.linked_excerpt_id ?? null
  );
  inserted.push({ anchor_text: item.anchor_text, comment_text: item.comment_text });
}

console.log(JSON.stringify({ inserted, rejected }, null, 2));
