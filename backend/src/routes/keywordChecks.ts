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

// Google Trends' unofficial endpoint blocks IPs that ask it too often (see
// services/googleTrends.ts). The other half of the fix: before making a real
// request, check whether we already have one for this exact phrase, from any
// topic, within the last 7 days — Trends' 12-month rolling average doesn't
// meaningfully shift day to day, so a real result from last week is still
// real signal today. Never used if that earlier check errored, so a failed
// check always gets a genuine retry rather than reusing a non-answer.
const TRENDS_CACHE_WINDOW = "-7 days";

interface CachedTrendsRow {
  verdict: string;
  signal_notes: string;
  checked_at: string;
}

function getCachedTrends(keyword: string): CachedTrendsRow | undefined {
  return db
    .prepare(
      `SELECT verdict, signal_notes, checked_at FROM keyword_checks
       WHERE source = 'google_trends' AND verdict != 'error'
         AND lower(trim(keyword)) = lower(trim(?))
         AND checked_at >= datetime('now', ?)
       ORDER BY checked_at DESC LIMIT 1`
    )
    .get(keyword, TRENDS_CACHE_WINDOW) as CachedTrendsRow | undefined;
}

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
        const cachedTrends = getCachedTrends(keyword);

        const [autocomplete, trends] = await Promise.allSettled([
          fetchYoutubeAutocomplete(keyword),
          cachedTrends ? Promise.resolve(null) : fetchGoogleTrends(keyword),
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

        if (cachedTrends) {
          insertCheck(
            topicId,
            keyword,
            "google_trends",
            `${cachedTrends.signal_notes} (reused from a real check on this exact phrase at ${cachedTrends.checked_at}, within the last 7 days — not re-fetched, to avoid Google's rate limiting)`,
            cachedTrends.verdict
          );
        } else if (trends.status === "fulfilled" && trends.value) {
          const { verdict, signal_notes } = verdictFromTrends(trends.value);
          insertCheck(topicId, keyword, "google_trends", signal_notes, verdict);
        } else if (trends.status === "rejected") {
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
