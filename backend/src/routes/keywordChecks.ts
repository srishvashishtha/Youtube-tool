import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import type { KeywordCheck, Topic } from "../types.js";
import { fetchYoutubeAutocomplete } from "../services/youtubeAutocomplete.js";
import { fetchGoogleTrends } from "../services/googleTrends.js";
import { verdictFromAutocomplete, verdictFromTrends } from "../services/verdict.js";

const insertCheck = (
  topicId: number,
  keyword: string,
  source: "youtube_autocomplete" | "google_trends",
  signal_notes: string,
  verdict: string
) =>
  db
    .prepare(
      `INSERT INTO keyword_checks (topic_id, keyword, source, signal_notes, verdict)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(topicId, keyword, source, signal_notes, verdict);

export async function keywordChecksRoutes(app: FastifyInstance) {
  // Stage 1 — run YouTube autocomplete + Google Trends against candidate keyword
  // phrases (typed/edited by hand, per docs/architecture.md) and store the results.
  app.post<{ Params: { id: string }; Body: { keywords: string[] } }>(
    "/api/topics/:id/keyword-checks",
    async (req, reply) => {
      const topic = db
        .prepare("SELECT * FROM topics WHERE id = ?")
        .get(req.params.id) as Topic | undefined;
      if (!topic) return reply.code(404).send({ error: "Topic not found." });

      const keywords = (req.body?.keywords ?? [])
        .map((k) => k.trim())
        .filter(Boolean);

      if (keywords.length === 0) {
        return reply.code(400).send({ error: "Provide at least one keyword." });
      }

      const topicId = Number(req.params.id);

      for (const keyword of keywords) {
        const [autocomplete, trends] = await Promise.allSettled([
          fetchYoutubeAutocomplete(keyword),
          fetchGoogleTrends(keyword),
        ]);

        if (autocomplete.status === "fulfilled") {
          const { verdict, signal_notes } = verdictFromAutocomplete(autocomplete.value);
          insertCheck(topicId, keyword, "youtube_autocomplete", signal_notes, verdict);
        } else {
          insertCheck(
            topicId,
            keyword,
            "youtube_autocomplete",
            `Request failed: ${autocomplete.reason}`,
            "error"
          );
        }

        if (trends.status === "fulfilled") {
          const { verdict, signal_notes } = verdictFromTrends(trends.value);
          insertCheck(topicId, keyword, "google_trends", signal_notes, verdict);
        } else {
          insertCheck(
            topicId,
            keyword,
            "google_trends",
            `Request failed: ${trends.reason}`,
            "error"
          );
        }
      }

      // Status stays 'draft' here on purpose — Stage 1's gate (docs/architecture.md)
      // says research doesn't start until a human looks at this and says go. That's
      // a deliberate status change the user makes later, not an automatic side effect.
      const rows = db
        .prepare(
          "SELECT * FROM keyword_checks WHERE topic_id = ? ORDER BY checked_at DESC"
        )
        .all(topicId) as KeywordCheck[];

      return reply.code(201).send(rows);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/topics/:id/keyword-checks",
    async (req) => {
      return db
        .prepare(
          "SELECT * FROM keyword_checks WHERE topic_id = ? ORDER BY checked_at DESC"
        )
        .all(req.params.id);
    }
  );
}
