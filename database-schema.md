# Database Schema (SQLite)

One file: `research.db`. Everything for every topic lives here — deliberately not per-topic files, so cross-topic search/reuse is possible later.

## `topics`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| title | TEXT | can be refined after keyword check |
| seed_transcript | TEXT | raw voice/text brain-dump from Stage 0 |
| status | TEXT | draft / researching / scripting / final |
| created_at | DATETIME | |
| updated_at | DATETIME | |

## `keyword_checks`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| topic_id | INTEGER FK → topics | |
| keyword | TEXT | |
| source | TEXT | 'youtube_autocomplete' / 'google_trends' |
| signal_notes | TEXT | free text: what the check showed |
| verdict | TEXT | proceed / reframe / underserved / low-interest |
| checked_at | DATETIME | |

## `sources`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| topic_id | INTEGER FK → topics | |
| url | TEXT | |
| platform | TEXT | reddit / medium / substack / blog |
| title | TEXT | |
| author | TEXT | nullable |
| cleaned_text | TEXT | article text, cleaned — no raw HTML stored |
| fetched_at | DATETIME | |

## `excerpts`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| source_id | INTEGER FK → sources | |
| topic_id | INTEGER FK → topics | denormalized for fast topic-level queries |
| type | TEXT | quote / stat / visual / counterpoint / example |
| content | TEXT | the excerpt itself |
| relevance_note | TEXT | one line: why it might matter |
| order_index | INTEGER | display order within the source card |

## `highlights`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| topic_id | INTEGER FK → topics | |
| source_id | INTEGER FK → sources | always set — every highlight traces to a source |
| excerpt_id | INTEGER FK → excerpts | nullable — set if the highlight was made inside a system-extracted excerpt |
| highlighted_text | TEXT | |
| note | TEXT | nullable, your own annotation |
| created_at | DATETIME | |

## `scripts`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| topic_id | INTEGER FK → topics | |
| version_number | INTEGER | 1, 2, 3... per topic |
| content | TEXT | full script text for this version |
| change_summary | TEXT | nullable, what changed from previous version |
| created_at | DATETIME | |

## `script_comments`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| script_id | INTEGER FK → scripts | tied to a specific version |
| anchor_text | TEXT | the snippet of script text this comment is attached to |
| comment_text | TEXT | |
| comment_type | TEXT | source_suggestion / grammar / seo / counterpoint / example |
| linked_excerpt_id | INTEGER FK → excerpts | nullable — set when the comment points to specific research |
| resolved | BOOLEAN | default false |

## `seo_checks`
| column | type | notes |
|---|---|---|
| id | INTEGER PK | |
| script_id | INTEGER FK → scripts | |
| keyword | TEXT | |
| signal_notes | TEXT | |
| checked_at | DATETIME | |

## Size reality check
Text-only data at this scale (dozens of sources, hundreds of excerpts, a handful of script versions per topic) sits comfortably in the low single-digit megabytes per topic, even after a year of weekly videos. The only thing that would break this is storing raw audio or full-page HTML — this schema deliberately never stores either.
