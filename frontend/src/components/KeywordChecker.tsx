import { useEffect, useState } from "react";
import { api } from "../api";
import type { KeywordCheck, Topic } from "../types";
import { VerdictDisplay } from "./VerdictDisplay";

// Stage 1 — Keyword Validation. Candidate phrases are entered by hand (typed,
// or lifted from the seed transcript yourself) — see docs/architecture.md.
export function KeywordChecker({ topic }: { topic: Topic }) {
  const [phrases, setPhrases] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<KeywordCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChecks([]);
    setPhrases([]);
    setLoadingExisting(true);
    api
      .listKeywordChecks(topic.id)
      .then(setChecks)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingExisting(false));
  }, [topic.id]);

  const addPhrase = () => {
    const trimmed = draft.trim();
    if (trimmed && !phrases.includes(trimmed)) {
      setPhrases([...phrases, trimmed]);
    }
    setDraft("");
  };

  const removePhrase = (p: string) => setPhrases(phrases.filter((x) => x !== p));

  const runCheck = async () => {
    if (phrases.length === 0) {
      setError("Add at least one keyword phrase first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.runKeywordCheck(topic.id, phrases);
      const fresh = await api.listKeywordChecks(topic.id);
      setChecks(fresh);
      setPhrases([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="keyword-checker">
      <h3>Keyword check — {topic.title || "(untitled topic)"}</h3>
      {topic.seed_transcript && <p className="muted">{topic.seed_transcript}</p>}

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
          placeholder="Type a candidate phrase, press Enter (3–5 is typical)"
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
        {loading ? "Checking…" : "Run keyword check"}
      </button>

      {error && <p className="error">{error}</p>}

      {loadingExisting ? (
        <p className="muted">Loading previous checks…</p>
      ) : (
        <VerdictDisplay checks={checks} />
      )}
    </div>
  );
}
