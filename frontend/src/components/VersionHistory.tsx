import { useEffect, useState } from "react";
import { api } from "../api";
import type { ScriptDiffChunk, ScriptVersion } from "../types";

// List of versions with change summaries, plus an on-demand diff view for
// whichever version is selected — the full diff is never stored, only
// recomputed on demand from the two real content blobs (docs/architecture.md
// Stage 4, "the diff between versions is stored, not just the final text").
export function VersionHistory({
  versions,
  selectedId,
  onSelect,
}: {
  versions: ScriptVersion[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const [diff, setDiff] = useState<{ isFirstVersion: boolean; chunks: ScriptDiffChunk[] } | null>(
    null
  );

  useEffect(() => {
    setDiff(null);
    setShowDiff(false);
  }, [selectedId]);

  const loadDiff = () => {
    if (!selectedId) return;
    const next = !showDiff;
    setShowDiff(next);
    if (next && !diff) {
      api.getScriptDiff(selectedId).then(setDiff);
    }
  };

  return (
    <div className="version-history">
      <h4>Versions</h4>
      <ul className="version-list">
        {versions.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className={v.id === selectedId ? "active" : ""}
              onClick={() => onSelect(v.id)}
            >
              v{v.version_number}
              {v.change_summary && <span className="muted"> — {v.change_summary}</span>}
            </button>
          </li>
        ))}
      </ul>

      {selectedId && (
        <>
          <button type="button" onClick={loadDiff}>
            {showDiff ? "Hide diff" : "View diff vs previous version"}
          </button>
          {showDiff && diff && (
            <pre className="diff-view">
              {diff.isFirstVersion ? (
                <span className="diff-unchanged">{diff.chunks[0]?.value}</span>
              ) : (
                diff.chunks.map((chunk, i) => (
                  <span
                    key={i}
                    className={
                      chunk.added ? "diff-added" : chunk.removed ? "diff-removed" : "diff-unchanged"
                    }
                  >
                    {chunk.value}
                  </span>
                ))
              )}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
