import { useState } from "react";
import { api } from "../api";
import type { Excerpt, Source } from "../types";
import { ExcerptItem } from "./ExcerptItem";
import { HighlightableText } from "./HighlightableText";

const PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit",
  medium: "Medium",
  substack: "Substack",
  blog: "Blog / web",
  youtube: "YouTube",
};

// A brief card per source — click to expand into that source's excerpts
// (docs/architecture.md, Stage 2 UI shape). Excerpts are read-only here;
// they only ever get written by the /extract-excerpts slash command. The
// full source text can also be expanded and highlighted directly (Stage 3).
export function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);
  const [excerpts, setExcerpts] = useState<Excerpt[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && excerpts === null) {
      setLoading(true);
      api
        .listSourceExcerpts(source.id)
        .then(setExcerpts)
        .finally(() => setLoading(false));
    }
  };

  const highlight = async (text: string) => {
    try {
      await api.createHighlight(source.topic_id, {
        source_id: source.id,
        highlighted_text: text,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Light-touch action — the text is still right there to try again.
    }
  };

  return (
    <div className="source-card">
      <div className="source-card-header" onClick={toggle}>
        <span className="platform-tag">{PLATFORM_LABEL[source.platform ?? ""] ?? source.platform}</span>
        <div className="source-card-title">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {source.title || source.url}
          </a>
          {source.author && <span className="muted"> — {source.author}</span>}
        </div>
        <button type="button" onClick={toggle}>
          {expanded ? "Hide excerpts" : "Show excerpts"}
        </button>
      </div>

      {expanded && (
        <div className="source-excerpts">
          {loading ? (
            <p className="muted">Loading excerpts…</p>
          ) : !excerpts || excerpts.length === 0 ? (
            <p className="muted">
              No excerpts yet. Run <code>/extract-excerpts {source.id}</code> in Claude Code to
              pull typed, sourced excerpts from this source.
            </p>
          ) : (
            excerpts.map((e) => <ExcerptItem key={e.id} excerpt={e} />)
          )}

          <button type="button" onClick={() => setShowFullText((v) => !v)}>
            {showFullText ? "Hide full text" : "Read full text (select to highlight)"}
          </button>
          {showFullText && source.cleaned_text && (
            <p className="source-full-text">
              <HighlightableText text={source.cleaned_text} onHighlight={highlight} />
            </p>
          )}
          {saved && <span className="highlight-saved">Highlighted ✓</span>}
        </div>
      )}
    </div>
  );
}
