import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SCHEMA_SQL } from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// research.db lives at the repo root — one SQLite file for every topic,
// per docs/database-schema.md ("deliberately not per-topic files").
const DB_PATH = join(__dirname, "../../../research.db");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// better-sqlite3 Statement objects own native memory, and their C++ destructor
// crashes the whole process when V8 collects them (`Assertion failed: (env) !=
// nullptr` in RemoveEnvironmentCleanupHook). Call sites prepare statements
// inline per request, so every request used to leave collectable Statements
// behind — harmless until something raised heap pressure (fetching and parsing
// several articles), at which point GC ran, hit a Statement destructor, and
// took the server down mid-request.
//
// Memoizing by SQL text keeps one live Statement per query forever, so none is
// ever collected and the destructor never runs. This is also just how
// better-sqlite3 is meant to be used — reusing a prepared statement is the
// reason to prepare it. Safe here because nothing calls .iterate(), the one
// API where sharing a statement across overlapping reads would matter.
const statementCache = new Map<string, ReturnType<typeof db.prepare>>();
const preparePassthrough = db.prepare.bind(db);
db.prepare = ((sql: string) => {
  let cached = statementCache.get(sql);
  if (!cached) {
    cached = preparePassthrough(sql);
    statementCache.set(sql, cached);
  }
  return cached;
}) as typeof db.prepare;

export function runMigrations(): void {
  db.exec(SCHEMA_SQL);
}
