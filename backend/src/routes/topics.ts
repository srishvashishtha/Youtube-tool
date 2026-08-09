import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import type { Topic, TopicStatus } from "../types.js";

const VALID_STATUSES: TopicStatus[] = ["draft", "researching", "scripting", "final"];

export async function topicsRoutes(app: FastifyInstance) {
  // Create a topic from a voice/text brain-dump (Stage 0 — Capture)
  app.post<{ Body: { title?: string; seed_transcript?: string } }>(
    "/api/topics",
    async (req, reply) => {
      const { title, seed_transcript } = req.body ?? {};

      if (!title?.trim() && !seed_transcript?.trim()) {
        return reply
          .code(400)
          .send({ error: "Provide at least a title or a seed_transcript." });
      }

      const stmt = db.prepare(
        `INSERT INTO topics (title, seed_transcript, status) VALUES (?, ?, 'draft')`
      );
      const result = stmt.run(title?.trim() ?? null, seed_transcript?.trim() ?? null);

      const topic = db
        .prepare("SELECT * FROM topics WHERE id = ?")
        .get(result.lastInsertRowid) as Topic;

      return reply.code(201).send(topic);
    }
  );

  app.get("/api/topics", async () => {
    return db.prepare("SELECT * FROM topics ORDER BY created_at DESC").all();
  });

  app.get<{ Params: { id: string } }>("/api/topics/:id", async (req, reply) => {
    const topic = db
      .prepare("SELECT * FROM topics WHERE id = ?")
      .get(req.params.id) as Topic | undefined;

    if (!topic) return reply.code(404).send({ error: "Topic not found." });
    return topic;
  });

  app.patch<{
    Params: { id: string };
    Body: { title?: string; status?: TopicStatus };
  }>("/api/topics/:id", async (req, reply) => {
    const existing = db
      .prepare("SELECT * FROM topics WHERE id = ?")
      .get(req.params.id) as Topic | undefined;
    if (!existing) return reply.code(404).send({ error: "Topic not found." });

    const { title, status } = req.body ?? {};
    if (status && !VALID_STATUSES.includes(status)) {
      return reply.code(400).send({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    db.prepare(
      `UPDATE topics
       SET title = COALESCE(?, title),
           status = COALESCE(?, status),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`
    ).run(title?.trim() ?? null, status ?? null, req.params.id);

    return db.prepare("SELECT * FROM topics WHERE id = ?").get(req.params.id);
  });
}
