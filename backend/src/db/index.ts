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

export function runMigrations(): void {
  db.exec(SCHEMA_SQL);
}
