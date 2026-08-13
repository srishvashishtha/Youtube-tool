import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import type { Source, SourcePlatform, Topic } from "../types.js";
import { fetchAndCleanArticle } from "../services/articleFetch.js";
import { searchReddit } from "../services/redditSearch.js";
import { fetchMediumTag } from "../services/rssDiscovery.js";
import { searchDuckDuckGo } from "../services/duckduckgoSearch.js";
import { searchYoutube, fetchYoutubeTranscript } from "../services/ytDlp.js";
import type { DiscoveryCandidate } from "../services/discovery.js";

const ALL_PLATFORMS: SourcePlatform[] = ["reddit", "medium", "substack", "blog", "youtube"];

interface PlatformOutcome {
  platform: SourcePlatform;
  candidates: DiscoveryCandidate[];
  error?: string;
}

async function discoverPlatform(
  platform: SourcePlatform,
  keyword: string
): Promise<PlatformOutcome> {
  try {
    let candidates: DiscoveryCandidate[];
    switch (platform) {
      case "reddit":
        candidates = await searchReddit(keyword);
        break;
      case "medium":
        candidates = await fetchMediumTag(keyword);
        break;
      case "substack":
        candidates = await searchDuckDuckGo(keyword, "substack.com");
        break;
      case "blog":
        candidates = await searchDuckDuckGo(keyword);
        break;
      case "youtube":
        candidates = await searchYoutube(keyword);
        break;
    }
    return { platform, candidates };
  } catch (err) {
    // A real, reportable failure for this one platform — never fabricated,
    // and never allowed to take down discovery on the other platforms.
    return { platform, candidates: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function fetchAndClean(
  url: string,
  platform: SourcePlatform | null
): Promise<{ title: string | null; author: string | null; cleaned_text: string }> {
  if (platform === "youtube") {
    return fetchYoutubeTranscript(url);
  }
  return fetchAndCleanArticle(url);
}

export async function sourcesRoutes(app: FastifyInstance) {
  // Discover real candidate URLs across platforms for a topic's keywords —
  // returns candidates only, writes nothing. Keeping a human in the loop over
  // what actually gets fetched/stored mirrors the Stage 1 gate (build-plan.md)
  // and keeps the DB free of junk from irrelevant hits.
  app.post<{
    Params: { id: string };
    Body: { keywords?: string[]; platforms?: SourcePlatform[] };
  }>("/api/topics/:id/discover-sources", async (req, reply) => {
    const topic = db
      .prepare("SELECT * FROM topics WHERE id = ?")
      .get(req.params.id) as Topic | undefined;
    if (!topic) return reply.code(404).send({ error: "Topic not found." });

    const topicId = Number(req.params.id);

    let keywords = (req.body?.keywords ?? []).map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) {
      const rows = db
        .prepare("SELECT DISTINCT keyword FROM keyword_checks WHERE topic_id = ?")
        .all(topicId) as { keyword: string }[];
      keywords = rows.map((r) => r.keyword);
    }
    if (keywords.length === 0) {
      return reply.code(400).send({
        error: "No keywords to search — provide keywords, or run a keyword check on this topic first.",
      });
    }

    const platforms = req.body?.platforms?.length ? req.body.platforms : ALL_PLATFORMS;

    const existingUrls = new Set(
      (db.prepare("SELECT url FROM sources WHERE topic_id = ?").all(topicId) as { url: string }[]).map(
        (r) => r.url
      )
    );

    const outcomesByPlatform = new Map<SourcePlatform, PlatformOutcome>();
    for (const platform of platforms) {
      // One keyword's results per platform, merged across keywords, deduped
      // by URL — sequential across keywords to stay a light, predictable
      // caller of these free/unofficial endpoints.
      let merged: DiscoveryCandidate[] = [];
      let lastError: string | undefined;
      for (const keyword of keywords) {
        const outcome = await discoverPlatform(platform, keyword);
        if (outcome.error) lastError = outcome.error;
        merged = merged.concat(outcome.candidates);
      }
      const seen = new Set<string>();
      const deduped = merged.filter((c) => {
        if (existingUrls.has(c.url) || seen.has(c.url)) return false;
        seen.add(c.url);
        return true;
      });
      outcomesByPlatform.set(platform, {
        platform,
        candidates: deduped,
        error: deduped.length === 0 ? lastError : undefined,
      });
    }

    return reply.send({
      keywords,
      platforms: Array.from(outcomesByPlatform.values()),
    });
  });

  // Persist one chosen candidate: fetch it for real, clean it, store it.
  // Refuses to save anything the fetch couldn't turn into real usable text.
  app.post<{
    Params: { id: string };
    Body: { url: string; platform: SourcePlatform; title?: string; author?: string };
  }>("/api/topics/:id/sources", async (req, reply) => {
    const topic = db
      .prepare("SELECT * FROM topics WHERE id = ?")
      .get(req.params.id) as Topic | undefined;
    if (!topic) return reply.code(404).send({ error: "Topic not found." });

    const { url, platform, title, author } = req.body ?? ({} as typeof req.body);
    if (!url?.trim()) return reply.code(400).send({ error: "Provide a url." });

    const topicId = Number(req.params.id);

    const dup = db
      .prepare("SELECT id FROM sources WHERE topic_id = ? AND url = ?")
      .get(topicId, url.trim());
    if (dup) return reply.code(409).send({ error: "This URL is already saved for this topic." });

    let cleaned: { title: string | null; author: string | null; cleaned_text: string };
    try {
      cleaned = await fetchAndClean(url.trim(), platform ?? null);
    } catch (err) {
      return reply.code(422).send({
        error: `Could not fetch usable content from this URL: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }

    const result = db
      .prepare(
        `INSERT INTO sources (topic_id, url, platform, title, author, cleaned_text)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        topicId,
        url.trim(),
        platform ?? null,
        title?.trim() || cleaned.title,
        author?.trim() || cleaned.author,
        cleaned.cleaned_text
      );

    const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(result.lastInsertRowid);
    return reply.code(201).send(source);
  });

  app.get<{ Params: { id: string } }>("/api/topics/:id/sources", async (req) => {
    return db
      .prepare("SELECT * FROM sources WHERE topic_id = ? ORDER BY fetched_at DESC")
      .all(req.params.id);
  });

  app.get<{ Params: { id: string } }>("/api/sources/:id", async (req, reply) => {
    const source = db.prepare("SELECT * FROM sources WHERE id = ?").get(req.params.id) as
      | Source
      | undefined;
    if (!source) return reply.code(404).send({ error: "Source not found." });
    return source;
  });
}
