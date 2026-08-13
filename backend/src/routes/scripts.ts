import type { FastifyInstance } from "fastify";
import { diffLines } from "diff";
import { db } from "../db/index.js";
import type { ScriptVersion, Topic } from "../types.js";

function countLines(text: string): number {
  if (text === "") return 0;
  const lines = text.split("\n");
  return text.endsWith("\n") ? lines.length - 1 : lines.length;
}

// A short, human-readable summary — the full diff is never stored, only
// recomputed on demand from the two real content blobs (small footprint).
function summarize(prev: string, next: string): string {
  const parts = diffLines(prev, next);
  let added = 0;
  let removed = 0;
  for (const part of parts) {
    if (part.added) added += countLines(part.value);
    else if (part.removed) removed += countLines(part.value);
  }
  if (added === 0 && removed === 0) return "No changes from previous version.";
  return `+${added} line${added === 1 ? "" : "s"} / -${removed} line${removed === 1 ? "" : "s"}`;
}

export async function scriptsRoutes(app: FastifyInstance) {
  // Stage 4 — you write the script yourself, outside any AI assistance, and
  // paste/upload it here as the next version. Never generated, only stored.
  app.post<{ Params: { id: string }; Body: { content: string } }>(
    "/api/topics/:id/scripts",
    async (req, reply) => {
      const topic = db
        .prepare("SELECT * FROM topics WHERE id = ?")
        .get(req.params.id) as Topic | undefined;
      if (!topic) return reply.code(404).send({ error: "Topic not found." });

      const content = req.body?.content;
      if (!content?.trim()) return reply.code(400).send({ error: "Provide script content." });

      const topicId = Number(req.params.id);

      const latest = db
        .prepare("SELECT * FROM scripts WHERE topic_id = ? ORDER BY version_number DESC LIMIT 1")
        .get(topicId) as ScriptVersion | undefined;

      const versionNumber = (latest?.version_number ?? 0) + 1;
      const changeSummary = latest ? summarize(latest.content, content) : null;

      const result = db
        .prepare(
          `INSERT INTO scripts (topic_id, version_number, content, change_summary)
           VALUES (?, ?, ?, ?)`
        )
        .run(topicId, versionNumber, content, changeSummary);

      const script = db.prepare("SELECT * FROM scripts WHERE id = ?").get(result.lastInsertRowid);
      return reply.code(201).send(script);
    }
  );

  app.get<{ Params: { id: string } }>("/api/topics/:id/scripts", async (req) => {
    return db
      .prepare("SELECT * FROM scripts WHERE topic_id = ? ORDER BY version_number DESC")
      .all(req.params.id);
  });

  app.get<{ Params: { id: string } }>("/api/scripts/:id", async (req, reply) => {
    const script = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id) as
      | ScriptVersion
      | undefined;
    if (!script) return reply.code(404).send({ error: "Script version not found." });
    return script;
  });

  app.get<{ Params: { id: string } }>("/api/scripts/:id/diff", async (req, reply) => {
    const script = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id) as
      | ScriptVersion
      | undefined;
    if (!script) return reply.code(404).send({ error: "Script version not found." });

    const prev = db
      .prepare("SELECT * FROM scripts WHERE topic_id = ? AND version_number = ?")
      .get(script.topic_id, script.version_number - 1) as ScriptVersion | undefined;

    if (!prev) {
      return reply.send({ isFirstVersion: true, chunks: [{ value: script.content }] });
    }

    return reply.send({ isFirstVersion: false, chunks: diffLines(prev.content, script.content) });
  });
}
