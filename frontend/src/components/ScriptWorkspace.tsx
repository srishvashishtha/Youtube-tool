import { useEffect, useState } from "react";
import { api } from "../api";
import type { ScriptComment, ScriptVersion, Topic } from "../types";
import { VersionHistory } from "./VersionHistory";

interface Segment {
  text: string;
  commentIndex?: number;
}

// Builds the content into plain-text / anchored segments in reading order,
// so each comment's anchor_text can be marked inline where it actually
// occurs, instead of a disconnected side panel (docs/architecture.md).
function buildSegments(content: string, comments: ScriptComment[]): Segment[] {
  const matches = comments
    .map((c, i) => ({ index: content.indexOf(c.anchor_text), i }))
    .filter((m) => m.index !== -1)
    .sort((a, b) => a.index - b.index);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index < cursor) continue; // overlapping anchor — keep reading order intact
    const comment = comments[m.i];
    if (m.index > cursor) segments.push({ text: content.slice(cursor, m.index) });
    segments.push({ text: comment.anchor_text, commentIndex: m.i });
    cursor = m.index + comment.anchor_text.length;
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor) });
  return segments;
}

const TYPE_LABEL: Record<string, string> = {
  source_suggestion: "🔎 Source suggestion",
  grammar: "✏️ Grammar",
  seo: "🔑 SEO",
  counterpoint: "↔️ Counterpoint",
  example: "📌 Example",
};

// Stage 4 — you paste the script yourself; /comment-on-script (Claude Code)
// leaves sourced comments here. This tool never inserts prose into the
// script — the textarea below is the only way script content ever changes.
export function ScriptWorkspace({ topic }: { topic: Topic }) {
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comments, setComments] = useState<ScriptComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshVersions = () => {
    setLoading(true);
    api
      .listScriptVersions(topic.id)
      .then((v) => {
        setVersions(v);
        if (v.length > 0) setSelectedId((prev) => prev ?? v[0].id); // v[0] = latest, DESC order
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setVersions([]);
    setSelectedId(null);
    setComments([]);
    refreshVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  useEffect(() => {
    if (selectedId == null) return;
    api.listScriptComments(selectedId).then(setComments);
  }, [selectedId]);

  const selected = versions.find((v) => v.id === selectedId) ?? null;

  const saveVersion = async () => {
    if (!draft.trim()) {
      setError("Paste or type script content first.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const created = await api.createScriptVersion(topic.id, draft);
      setDraft("");
      refreshVersions();
      setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleResolved = async (comment: ScriptComment) => {
    const updated = await api.setCommentResolved(comment.id, comment.resolved === 0);
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const segments = selected ? buildSegments(selected.content, comments) : [];

  return (
    <div className="script-workspace">
      <h3>Script — {topic.title || "(untitled topic)"}</h3>

      <details className="new-version-form">
        <summary>Paste a new version {versions.length > 0 ? `(v${versions.length + 1})` : "(v1)"}</summary>
        <textarea
          rows={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste or type your script here…"
        />
        <button type="button" onClick={saveVersion} disabled={saving}>
          {saving ? "Saving…" : "Save version"}
        </button>
      </details>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="muted">No script yet — paste v1 above to get started.</p>
      ) : (
        <div className="script-body">
          <VersionHistory versions={versions} selectedId={selectedId} onSelect={setSelectedId} />

          {selected && (
            <div className="script-content-panel">
              <p className="muted">
                Version {selected.version_number} · {new Date(selected.created_at).toLocaleString()}
              </p>

              <p className="script-text">
                {segments.map((seg, i) =>
                  seg.commentIndex === undefined ? (
                    <span key={i}>{seg.text}</span>
                  ) : (
                    <mark key={i} className="comment-anchor">
                      {seg.text}
                      <sup>{seg.commentIndex + 1}</sup>
                    </mark>
                  )
                )}
              </p>

              {comments.length === 0 ? (
                <p className="muted">
                  No comments yet. Run <code>/comment-on-script {topic.id}</code> in Claude Code
                  to get sourced inline feedback on this version.
                </p>
              ) : (
                <ol className="comment-list">
                  {comments.map((c, i) => (
                    <li key={c.id} className={c.resolved ? "comment resolved" : "comment"}>
                      <span className="comment-number">{i + 1}.</span>{" "}
                      <span className="badge">{TYPE_LABEL[c.comment_type ?? ""] ?? c.comment_type}</span>
                      <p className="comment-text">{c.comment_text}</p>
                      <button type="button" onClick={() => toggleResolved(c)}>
                        {c.resolved ? "Mark unresolved" : "Mark resolved"}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
