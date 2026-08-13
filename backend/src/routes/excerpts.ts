import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";

// Read-only on purpose — excerpts are written only by the /extract-excerpts
// slash command's helper script (backend/scripts/dbWriteExcerpts.ts), never
// through the HTTP API. That keeps a hard boundary between "fetched"
// (sources, mechanical) and "extracted" (excerpts, Claude-Code-assisted,
// substring-verified against the real source text).
export async function excerptsRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/sources/:id/excerpts", async (req) => {
    return db
      .prepare("SELECT * FROM excerpts WHERE source_id = ? ORDER BY order_index ASC")
      .all(req.params.id);
  });

  app.get<{ Params: { id: string } }>("/api/topics/:id/excerpts", async (req) => {
    return db
      .prepare(
        "SELECT * FROM excerpts WHERE topic_id = ? ORDER BY source_id ASC, order_index ASC"
      )
      .all(req.params.id);
  });
}
