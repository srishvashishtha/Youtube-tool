import { useEffect, useState } from "react";
import { api } from "../api";
import type { Highlight, Source, Topic } from "../types";

// Stage 3 — a single flat, skimmable view of everything you've highlighted
// for this topic, each item still clickable back to its source. This is the
// direct fix for "I remember the line but not where I read it" — the
// highlight *is* the pointer back (docs/architecture.md).
export function HighlightsView({ topic }: { topic: Topic }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.listHighlights(topic.id), api.listSources(topic.id)])
      .then(([h, s]) => {
        setHighlights(h);
        setSources(s);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [topic.id]);

  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const remove = async (id: number) => {
    try {
      await api.deleteHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) return <p className="muted">Loading highlights…</p>;

  return (
    <div className="highlights-view">
      <h3>Highlights — {topic.title || "(untitled topic)"}</h3>
      {error && <p className="error">{error}</p>}

      {highlights.length === 0 ? (
        <p className="muted">
          No highlights yet. Open a source in the Research tab and select any text to highlight
          it.
        </p>
      ) : (
        <ul className="highlight-list">
          {highlights.map((h) => {
            const source = sourceById.get(h.source_id);
            return (
              <li key={h.id} className="highlight-card">
                <p className="highlight-text">“{h.highlighted_text}”</p>
                {h.note && <p className="highlight-note muted">Note: {h.note}</p>}
                <div className="highlight-meta">
                  {source ? (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title || source.url}
                    </a>
                  ) : (
                    <span className="muted">source #{h.source_id}</span>
                  )}
                  <button type="button" onClick={() => remove(h.id)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
