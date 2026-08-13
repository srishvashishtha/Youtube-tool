import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import type { ScriptComment } from "../types.js";

// Read-only aside from the resolved toggle — comments are written only by
// the /comment-on-script slash command's helper script, never through the
// HTTP API. Same boundary as excerpts.ts.
export async function scriptCommentsRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>("/api/scripts/:id/comments", async (req) => {
    return db.prepare("SELECT * FROM script_comments WHERE script_id = ?").all(req.params.id);
  });

  app.patch<{ Params: { id: string }; Body: { resolved?: boolean } }>(
    "/api/script-comments/:id",
    async (req, reply) => {
      const existing = db
        .prepare("SELECT * FROM script_comments WHERE id = ?")
        .get(req.params.id) as ScriptComment | undefined;
      if (!existing) return reply.code(404).send({ error: "Comment not found." });

      if (typeof req.body?.resolved !== "boolean") {
        return reply.code(400).send({ error: "Provide resolved: true or false." });
      }

      db.prepare("UPDATE script_comments SET resolved = ? WHERE id = ?").run(
        req.body.resolved ? 1 : 0,
        req.params.id
      );
      return db.prepare("SELECT * FROM script_comments WHERE id = ?").get(req.params.id);
    }
  );
}
