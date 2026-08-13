#!/usr/bin/env node
// CLI helper for the /extract-excerpts slash command. Writes typed excerpts
// to the `excerpts` table — but ONLY after verifying each one's `content` is
// an actual (whitespace/quote-normalized) substring of the source's real
// `cleaned_text`. This substring check is the mechanical enforcement of
// "never fabricate": a prompt instruction alone isn't something the codebase
// can verify — this script is what actually rejects a made-up excerpt.

import { readFileSync } from "node:fs";
import { db } from "../src/db/index.js";
import type { ExcerptType, Source } from "../src/types.js";

const VALID_TYPES: ExcerptType[] = ["quote", "stat", "visual", "counterpoint", "example"];

interface RawExcerpt {
  type?: string;
  content?: string;
  relevance_note?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const [sourceIdArg, jsonPathArg] = process.argv.slice(2);
if (!sourceIdArg || !jsonPathArg) {
  console.error(
    JSON.stringify({ error: "Usage: dbWriteExcerpts.ts <source_id> <json_file_path>" })
  );
  process.exit(1);
}

const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(sourceIdArg) as
  | Source
  | undefined;
if (!source) {
  console.error(JSON.stringify({ error: `Source ${sourceIdArg} not found.` }));
  process.exit(1);
}
if (!source.cleaned_text) {
  console.error(JSON.stringify({ error: `Source ${sourceIdArg} has no cleaned_text to extract from.` }));
  process.exit(1);
}

let items: RawExcerpt[];
try {
  const parsed = JSON.parse(readFileSync(jsonPathArg, "utf-8"));
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of excerpts");
  items = parsed;
} catch (err) {
  console.error(
    JSON.stringify({
      error: `Could not read/parse ${jsonPathArg}: ${err instanceof Error ? err.message : String(err)}`,
    })
  );
  process.exit(1);
}

const normalizedSourceText = normalize(source.cleaned_text);

const inserted: Array<{ type: string; content: string }> = [];
const rejected: Array<{ type: string | undefined; content: string | undefined; reason: string }> = [];

const nextOrderRow = db
  .prepare("SELECT COALESCE(MAX(order_index), -1) AS maxOrder FROM excerpts WHERE source_id = ?")
  .get(sourceIdArg) as { maxOrder: number };
let orderIndex = nextOrderRow.maxOrder + 1;

const insertStmt = db.prepare(
  `INSERT INTO excerpts (source_id, topic_id, type, content, relevance_note, order_index)
   VALUES (?, ?, ?, ?, ?, ?)`
);

for (const item of items) {
  if (!item?.content?.trim()) {
    rejected.push({ type: item?.type, content: item?.content, reason: "Missing or empty content." });
    continue;
  }
  if (!item.type || !VALID_TYPES.includes(item.type as ExcerptType)) {
    rejected.push({
      type: item.type,
      content: item.content,
      reason: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
    });
    continue;
  }

  const normalizedContent = normalize(item.content);
  if (!normalizedSourceText.includes(normalizedContent)) {
    rejected.push({
      type: item.type,
      content: item.content,
      reason:
        "content is not an actual substring of this source's real cleaned_text — refused (never fabricate).",
    });
    continue;
  }

  insertStmt.run(
    sourceIdArg,
    source.topic_id,
    item.type,
    item.content.trim(),
    item.relevance_note?.trim() || null,
    orderIndex
  );
  orderIndex += 1;
  inserted.push({ type: item.type, content: item.content });
}

console.log(JSON.stringify({ inserted, rejected }, null, 2));
