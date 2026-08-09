// Mirrors docs/database-schema.md. Keep in sync with src/db/schema.ts.

export type TopicStatus = "draft" | "researching" | "scripting" | "final";

export interface Topic {
  id: number;
  title: string | null;
  seed_transcript: string | null;
  status: TopicStatus;
  created_at: string;
  updated_at: string;
}

export type KeywordCheckSource = "youtube_autocomplete" | "google_trends";
export type KeywordCheckVerdict =
  | "proceed"
  | "reframe"
  | "underserved"
  | "low-interest"
  | "error"; // fetch/parse failure — not a real signal, surfaced as-is, never invented

export interface KeywordCheck {
  id: number;
  topic_id: number;
  keyword: string;
  source: KeywordCheckSource;
  signal_notes: string | null;
  verdict: KeywordCheckVerdict | null;
  checked_at: string;
}

export type SourcePlatform = "reddit" | "medium" | "substack" | "blog" | "youtube";

export interface Source {
  id: number;
  topic_id: number;
  url: string;
  platform: SourcePlatform | null;
  title: string | null;
  author: string | null;
  cleaned_text: string | null;
  fetched_at: string;
}

export type ExcerptType = "quote" | "stat" | "visual" | "counterpoint" | "example";

export interface Excerpt {
  id: number;
  source_id: number;
  topic_id: number;
  type: ExcerptType;
  content: string;
  relevance_note: string | null;
  order_index: number | null;
}

export interface Highlight {
  id: number;
  topic_id: number;
  source_id: number;
  excerpt_id: number | null;
  highlighted_text: string;
  note: string | null;
  created_at: string;
}

export interface ScriptVersion {
  id: number;
  topic_id: number;
  version_number: number;
  content: string;
  change_summary: string | null;
  created_at: string;
}

export type ScriptCommentType =
  | "source_suggestion"
  | "grammar"
  | "seo"
  | "counterpoint"
  | "example";

export interface ScriptComment {
  id: number;
  script_id: number;
  anchor_text: string;
  comment_text: string;
  comment_type: ScriptCommentType | null;
  linked_excerpt_id: number | null;
  resolved: 0 | 1;
}

export interface SeoCheck {
  id: number;
  script_id: number;
  keyword: string;
  signal_notes: string | null;
  checked_at: string;
}
