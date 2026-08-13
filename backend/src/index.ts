import Fastify from "fastify";
import cors from "@fastify/cors";
import { db, runMigrations } from "./db/index.js";
import { topicsRoutes } from "./routes/topics.js";
import { keywordChecksRoutes } from "./routes/keywordChecks.js";
import { sourcesRoutes } from "./routes/sources.js";
import { excerptsRoutes } from "./routes/excerpts.js";
import { highlightsRoutes } from "./routes/highlights.js";
import { scriptsRoutes } from "./routes/scripts.js";
import { scriptCommentsRoutes } from "./routes/scriptComments.js";
import { seoChecksRoutes } from "./routes/seoChecks.js";

runMigrations();

// The multi-statement schema exec leaves short-lived native Statement
// wrappers behind. Collecting them now, while the environment is fully
// alive, avoids V8 finalizing them later at a riskier moment (e.g. near
// process shutdown), which is what was causing an intermittent native
// "RemoveEnvironmentCleanupHook" crash. Requires `node --expose-gc`.
if (global.gc) global.gc();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [/^http:\/\/localhost:\d+$/], // local Vite dev server only
});

app.get("/api/health", async () => ({ ok: true }));

await app.register(topicsRoutes);
await app.register(keywordChecksRoutes);
await app.register(sourcesRoutes);
await app.register(excerptsRoutes);
await app.register(highlightsRoutes);
await app.register(scriptsRoutes);
await app.register(scriptCommentsRoutes);
await app.register(seoChecksRoutes);

const PORT = Number(process.env.PORT ?? 4000);

app
  .listen({ port: PORT, host: "127.0.0.1" })
  .then(() => app.log.info(`research.db ready, API on http://127.0.0.1:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

// Close the DB connection explicitly, before Node tears down the process.
// Deliberately no process.exit() here — forcing an immediate exit is what
// races a pending better-sqlite3 Statement finalizer against V8 tearing down
// the environment (native "RemoveEnvironmentCleanupHook" assertion crash).
// Closing everything and letting the event loop drain naturally is the safe
// shutdown path recommended for native-addon modules like better-sqlite3.
async function shutdown() {
  await app.close();
  db.close();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
