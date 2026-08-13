import { useState } from "react";
import { api } from "../api";
import type { Excerpt } from "../types";
import { HighlightableText } from "./HighlightableText";

const TYPE_LABEL: Record<string, string> = {
  quote: "💬 Quote",
  stat: "📊 Stat",
  visual: "🖼️ Visual",
  counterpoint: "↔️ Counterpoint",
  example: "📌 Example",
};

export function ExcerptItem({ excerpt }: { excerpt: Excerpt }) {
  const [saved, setSaved] = useState(false);

  const highlight = async (text: string) => {
    try {
      await api.createHighlight(excerpt.topic_id, {
        source_id: excerpt.source_id,
        excerpt_id: excerpt.id,
        highlighted_text: text,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Selection-based highlighting is a light-touch action — a failed
      // save here isn't worth a blocking error banner, the text is still
      // right there to try again.
    }
  };

  return (
    <div className={`excerpt-item excerpt-${excerpt.type}`}>
      <span className="badge">{TYPE_LABEL[excerpt.type] ?? excerpt.type}</span>
      <p className="excerpt-content">
        "<HighlightableText text={excerpt.content} onHighlight={highlight} />"
      </p>
      {excerpt.relevance_note && (
        <p className="excerpt-relevance muted">Why it might matter: {excerpt.relevance_note}</p>
      )}
      {saved && <span className="highlight-saved">Highlighted ✓</span>}
    </div>
  );
}
