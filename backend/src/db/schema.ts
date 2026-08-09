// Schema mirrors docs/database-schema.md exactly. One file: research.db.
// Do not add/remove columns here without updating that doc first.
// (Kept as a TS string, not a loose .sql file, so it survives the `tsc` build into dist/.)

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  seed_transcript TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft / researching / scripting / final
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS keyword_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  keyword TEXT NOT NULL,
  source TEXT NOT NULL,       -- 'youtube_autocomplete' / 'google_trends'
  signal_notes TEXT,          -- free text: what the check showed
  verdict TEXT,               -- proceed / reframe / underserved / low-interest
  checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  url TEXT NOT NULL,
  platform TEXT,               -- reddit / medium / substack / blog / youtube
  title TEXT,
  author TEXT,
  cleaned_text TEXT,           -- article text or video transcript, cleaned — no raw HTML/audio/video
  fetched_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS excerpts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  topic_id INTEGER NOT NULL REFERENCES topics(id), -- denormalized for fast topic-level queries
  type TEXT NOT NULL,          -- quote / stat / visual / counterpoint / example
  content TEXT NOT NULL,
  relevance_note TEXT,
  order_index INTEGER
);

CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  source_id INTEGER NOT NULL REFERENCES sources(id),   -- always set — every highlight traces to a source
  excerpt_id INTEGER REFERENCES excerpts(id),          -- nullable
  highlighted_text TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  version_number INTEGER NOT NULL, -- 1, 2, 3... per topic
  content TEXT NOT NULL,
  change_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS script_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id INTEGER NOT NULL REFERENCES scripts(id),
  anchor_text TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type TEXT,          -- source_suggestion / grammar / seo / counterpoint / example
  linked_excerpt_id INTEGER REFERENCES excerpts(id),
  resolved INTEGER NOT NULL DEFAULT 0 -- boolean: 0 = false, 1 = true
);

CREATE TABLE IF NOT EXISTS seo_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  script_id INTEGER NOT NULL REFERENCES scripts(id),
  keyword TEXT NOT NULL,
  signal_notes TEXT,
  checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_keyword_checks_topic ON keyword_checks(topic_id);
CREATE INDEX IF NOT EXISTS idx_sources_topic ON sources(topic_id);
CREATE INDEX IF NOT EXISTS idx_excerpts_topic ON excerpts(topic_id);
CREATE INDEX IF NOT EXISTS idx_excerpts_source ON excerpts(source_id);
CREATE INDEX IF NOT EXISTS idx_highlights_topic ON highlights(topic_id);
CREATE INDEX IF NOT EXISTS idx_scripts_topic ON scripts(topic_id);
CREATE INDEX IF NOT EXISTS idx_script_comments_script ON script_comments(script_id);
CREATE INDEX IF NOT EXISTS idx_seo_checks_script ON seo_checks(script_id);
`;
