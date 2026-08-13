import { useEffect, useState } from "react";
import { api } from "../api";
import type { ScriptVersion, SeoCheck, Topic } from "../types";

// Stage 5 — re-run the Stage 1 check, but against the script's actual
// content now instead of the original idea (docs/architecture.md). Reuses
// the same real YouTube autocomplete / Google Trends services as Stage 1 —
// nothing new is invented here, just re-asked against a specific script
// version.
export function SeoRecheck({ topic }: { topic: Topic }) {
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [checks, setChecks] = useState<SeoCheck[]>([]);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChecks([]);
    setSelectedScriptId(null);
    api.listScriptVersions(topic.id).then((v) => {
      setVersions(v);
      if (v.length > 0) setSelectedScriptId(v[0].id); // latest first, DESC order
    });
  }, [topic.id]);

  useEffect(() => {
    if (selectedScriptId == null) {
      setLoadingExisting(false);
      return;
    }
    setLoadingExisting(true);
    api
      .listSeoChecks(selectedScriptId)
      .then(setChecks)
      .finally(() => setLoadingExisting(false));
  }, [selectedScriptId]);

  const addPhrase = () => {
    const trimmed = draft.trim();
    if (trimmed && !phrases.includes(trimmed)) setPhrases([...phrases, trimmed]);
    setDraft("");
  };
  const removePhrase = (p: string) => setPhrases(phrases.filter((x) => x !== p));

  const runCheck = async () => {
    if (!selectedScriptId) {
      setError("No script version to check yet — paste one in the Script tab first.");
      return;
    }
    if (phrases.length === 0) {
      setError("Add at least one keyword phrase first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.runSeoCheck(selectedScriptId, phrases);
      const fresh = await api.listSeoChecks(selectedScriptId);
      setChecks(fresh);
      setPhrases([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const byKeyword = new Map<string, SeoCheck[]>();
  for (const c of checks) {
    const list = byKeyword.get(c.keyword) ?? [];
    list.push(c);
    byKeyword.set(c.keyword, list);
  }

  return (
    <div className="seo-recheck">
      <h3>SEO recheck — {topic.title || "(untitled topic)"}</h3>

      {versions.length === 0 ? (
        <p className="muted">No script yet — paste one in the Script tab first.</p>
      ) : (
        <>
          <label>
            Checking against
            <select
              value={selectedScriptId ?? ""}
              onChange={(e) => setSelectedScriptId(Number(e.target.value))}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {new Date(v.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>

          <div className="phrase-input">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPhrase();
                }
              }}
              placeholder="Type a phrase from the script (working title, key line), press Enter"
            />
            <button type="button" onClick={addPhrase}>
              Add
            </button>
          </div>

          {phrases.length > 0 && (
            <ul className="phrase-chips">
              {phrases.map((p) => (
                <li key={p}>
                  {p} <button type="button" onClick={() => removePhrase(p)}>✕</button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" onClick={runCheck} disabled={loading || phrases.length === 0}>
            {loading ? "Checking…" : "Run SEO recheck"}
          </button>

          {error && <p className="error">{error}</p>}

          {loadingExisting ? (
            <p className="muted">Loading…</p>
          ) : checks.length === 0 ? (
            <p className="muted">No SEO checks yet for this version.</p>
          ) : (
            [...byKeyword.entries()].map(([keyword, keywordChecks]) => (
              <div key={keyword} className="keyword-group">
                <h4>{keyword}</h4>
                {keywordChecks.map((c) => (
                  <div key={c.id} className="check-card">
                    <p className="signal-notes">{c.signal_notes}</p>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
