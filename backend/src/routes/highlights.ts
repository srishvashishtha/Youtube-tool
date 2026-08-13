import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import type { Excerpt, Highlight, Source, Topic } from "../types.js";

export async function highlightsRoutes(app: FastifyInstance) {
  // Stage 3 — while reading any source or excerpt, select text -> highlight.
  // Always traces back to a source_id (and excerpt_id if it was made inside
  // a system-extracted excerpt) — docs/architecture.md.
  app.post<{
    Params: { id: string };
    Body: { source_id: number; excerpt_id?: number; highlighted_text: string; note?: string };
  }>("/api/topics/:id/highlights", async (req, reply) => {
    const topic = db
      .prepare("SELECT * FROM topics WHERE id = ?")
      .get(req.params.id) as Topic | undefined;
    if (!topic) return reply.code(404).send({ error: "Topic not found." });

    const topicId = Number(req.params.id);
    const { source_id, excerpt_id, highlighted_text, note } = req.body ?? ({} as typeof req.body);

    if (!highlighted_text?.trim()) {
      return reply.code(400).send({ error: "Provide highlighted_text." });
    }
    if (!source_id) {
      return reply.code(400).send({ error: "Provide source_id — every highlight traces to a source." });
    }

    const source = db
      .prepare("SELECT * FROM sources WHERE id = ? AND topic_id = ?")
      .get(source_id, topicId) as Source | undefined;
    if (!source) {
      return reply.code(400).send({ error: "source_id does not belong to this topic." });
    }

    if (excerpt_id) {
      const excerpt = db
        .prepare("SELECT * FROM excerpts WHERE id = ? AND source_id = ?")
        .get(excerpt_id, source_id) as Excerpt | undefined;
      if (!excerpt) {
        return reply
          .code(400)
          .send({ error: "excerpt_id does not belong to the given source_id." });
      }
    }

    const result = db
      .prepare(
        `INSERT INTO highlights (topic_id, source_id, excerpt_id, highlighted_text, note)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(topicId, source_id, excerpt_id ?? null, highlighted_text.trim(), note?.trim() || null);

    const highlight = db.prepare("SELECT * FROM highlights WHERE id = ?").get(result.lastInsertRowid);
    return reply.code(201).send(highlight);
  });

  // Flat, skimmable — every item still clickable back to its source.
  app.get<{ Params: { id: string } }>("/api/topics/:id/highlights", async (req) => {
    return db
      .prepare("SELECT * FROM highlights WHERE topic_id = ? ORDER BY created_at DESC")
      .all(req.params.id);
  });

  app.patch<{ Params: { id: string }; Body: { note?: string } }>(
    "/api/highlights/:id",
    async (req, reply) => {
      const existing = db
        .prepare("SELECT * FROM highlights WHERE id = ?")
        .get(req.params.id) as Highlight | undefined;
      if (!existing) return reply.code(404).send({ error: "Highlight not found." });

      db.prepare("UPDATE highlights SET note = ? WHERE id = ?").run(
        req.body?.note?.trim() || null,
        req.params.id
      );
      return db.prepare("SELECT * FROM highlights WHERE id = ?").get(req.params.id);
    }
  );

  app.delete<{ Params: { id: string } }>("/api/highlights/:id", async (req, reply) => {
    const existing = db
      .prepare("SELECT * FROM highlights WHERE id = ?")
      .get(req.params.id) as Highlight | undefined;
    if (!existing) return reply.code(404).send({ error: "Highlight not found." });

    db.prepare("DELETE FROM highlights WHERE id = ?").run(req.params.id);
    return reply.code(204).send();
  });
}
