import Fastify from "fastify";
import cors from "@fastify/cors";
import { runMigrations } from "./db/index.js";
import { topicsRoutes } from "./routes/topics.js";
import { keywordChecksRoutes } from "./routes/keywordChecks.js";

runMigrations();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: [/^http:\/\/localhost:\d+$/], // local Vite dev server only
});

app.get("/api/health", async () => ({ ok: true }));

await app.register(topicsRoutes);
await app.register(keywordChecksRoutes);

const PORT = Number(process.env.PORT ?? 4000);

app
  .listen({ port: PORT, host: "127.0.0.1" })
  .then(() => app.log.info(`research.db ready, API on http://127.0.0.1:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
