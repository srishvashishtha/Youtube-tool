import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import type { ScriptVersion } from "../types.js";
import { fetchYoutubeAutocomplete } from "../services/youtubeAutocomplete.js";
import { fetchGoogleTrends } from "../services/googleTrends.js";
import { verdictFromAutocomplete, verdictFromTrends } from "../services/verdict.js";

// Same reuse-recent-result cache as keywordChecks.ts — a phrase checked at
// Stage 1 doesn't need to be re-asked from Google again at Stage 5, same
// reasoning as before (services/googleTrends.ts): don't cause a rate-limit
// block we don't have to. Only keyword_checks has a real, structured
// `verdict` column to reuse from — seo_checks folds verdict into free-text
// signal_notes prose instead (see insertCheck below), so it isn't a valid
// cache source here.
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

// seo_checks (database-schema.md) has no dedicated verdict column — this
// stage is a lighter-weight signal than Stage 1's, so the verdict is folded
// into readable prose rather than smuggled into signal_notes for later
// parsing.
const insertCheck = (scriptId: number, keyword: string, source: string, verdict: string, signalNotes: string) =>
  db
    .prepare(`INSERT INTO seo_checks (script_id, keyword, signal_notes) VALUES (?, ?, ?)`)
    .run(scriptId, keyword, `${source} — ${verdict}: ${signalNotes}`);

export async function seoChecksRoutes(app: FastifyInstance) {
  // Stage 5 — re-run the Stage 1 check, but against the script's actual
  // content now rather than the original idea. Reuses the same real
  // services/verdict logic unmodified — no separate SEO scoring invented.
  app.post<{ Params: { id: string }; Body: { keywords: string[] } }>(
    "/api/scripts/:id/seo-checks",
    async (req, reply) => {
      const script = db.prepare("SELECT * FROM scripts WHERE id = ?").get(req.params.id) as
        | ScriptVersion
        | undefined;
      if (!script) return reply.code(404).send({ error: "Script version not found." });

      const keywords = (req.body?.keywords ?? []).map((k) => k.trim()).filter(Boolean);
      if (keywords.length === 0) {
        return reply.code(400).send({ error: "Provide at least one keyword." });
      }

      const scriptId = Number(req.params.id);

      for (const keyword of keywords) {
        const autocomplete = await fetchYoutubeAutocomplete(keyword).catch((err) => ({
          keyword,
          suggestions: [] as string[],
          __error: err instanceof Error ? err.message : String(err),
        }));
        if ("__error" in autocomplete) {
          insertCheck(scriptId, keyword, "YouTube autocomplete", "error", `Request failed: ${autocomplete.__error}`);
        } else {
          const { verdict, signal_notes } = verdictFromAutocomplete(autocomplete);
          insertCheck(scriptId, keyword, "YouTube autocomplete", verdict, signal_notes);
        }

        const cachedTrends = getCachedTrends(keyword);
        if (cachedTrends) {
          insertCheck(
            scriptId,
            keyword,
            "Google Trends",
            cachedTrends.verdict,
            `${cachedTrends.signal_notes} (reused from a real check at ${cachedTrends.checked_at}, within the last 7 days)`
          );
        } else {
          const trends = await fetchGoogleTrends(keyword);
          const { verdict, signal_notes } = verdictFromTrends(trends);
          insertCheck(scriptId, keyword, "Google Trends", verdict, signal_notes);
        }
      }

      const rows = db
        .prepare("SELECT * FROM seo_checks WHERE script_id = ? ORDER BY checked_at DESC")
        .all(scriptId);
      return reply.code(201).send(rows);
    }
  );

  app.get<{ Params: { id: string } }>("/api/scripts/:id/seo-checks", async (req) => {
    return db
      .prepare("SELECT * FROM seo_checks WHERE script_id = ? ORDER BY checked_at DESC")
      .all(req.params.id);
  });
}
