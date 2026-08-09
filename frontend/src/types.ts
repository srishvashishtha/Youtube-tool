// Mirrors backend/src/types.ts (the subset the Phase 1 UI needs).

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
  | "error";

export interface KeywordCheck {
  id: number;
  topic_id: number;
  keyword: string;
  source: KeywordCheckSource;
  signal_notes: string | null;
  verdict: KeywordCheckVerdict | null;
  checked_at: string;
}
