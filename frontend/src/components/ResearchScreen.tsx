import { useEffect, useState } from "react";
import { api } from "../api";
import type { DiscoveryCandidate, DiscoveryResponse, Source, Topic } from "../types";
import { SourceCard } from "./SourceCard";

const PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit",
  medium: "Medium",
  substack: "Substack",
  blog: "Blog / web",
  youtube: "YouTube",
};

// Stage 2 — Research & Excerpt Collection. Discovery only returns real
// candidates found by a real search (docs/architecture.md); nothing is saved
// until you pick one. Excerpts under each saved source come only from the
// /extract-excerpts Claude Code command, never from this screen.
export function ResearchScreen({ topic }: { topic: Topic }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshSources = () => {
    setLoadingSources(true);
    api
      .listSources(topic.id)
      .then(setSources)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoadingSources(false));
  };

  useEffect(() => {
    setSources([]);
    setDiscovery(null);
    refreshSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  const runDiscovery = async () => {
    setError(null);
    setDiscovering(true);
    try {
      const result = await api.discoverSources(topic.id);
      setDiscovery(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscovering(false);
    }
  };

  const savedUrls = new Set(sources.map((s) => s.url));

  const saveCandidate = async (candidate: DiscoveryCandidate) => {
    setError(null);
    setSavingUrl(candidate.url);
    try {
      await api.saveSource(topic.id, {
        url: candidate.url,
        platform: candidate.platform,
        title: candidate.title,
        author: candidate.author ?? undefined,
      });
      refreshSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingUrl(null);
    }
  };

  return (
    <div className="research-screen">
      <h3>Research — {topic.title || "(untitled topic)"}</h3>

      <button type="button" onClick={runDiscovery} disabled={discovering}>
        {discovering ? "Searching Reddit, Medium, Substack, blogs, YouTube…" : "Discover sources"}
      </button>
      <p className="muted">
        Uses this topic's keyword-check phrases by default. Real search results only — nothing
        is saved until you pick one below.
      </p>

      {error && <p className="error">{error}</p>}

      {discovery && (
        <div className="discovery-results">
          {discovery.platforms.map((p) => (
            <div key={p.platform} className="platform-group">
              <h4>
                {PLATFORM_LABEL[p.platform] ?? p.platform}
                <span className="muted"> — {p.candidates.length} found</span>
              </h4>
              {p.error && p.candidates.length === 0 && (
                <p className="error">Could not search this platform: {p.error}</p>
              )}
              {p.candidates.length === 0 && !p.error && (
                <p className="muted">No results for this platform.</p>
              )}
              <ul className="candidate-list">
                {p.candidates.map((c) => (
                  <li key={c.url} className="candidate">
                    <div>
                      <a href={c.url} target="_blank" rel="noreferrer">
                        {c.title}
                      </a>
                      {c.author && <span className="muted"> — {c.author}</span>}
                    </div>
                    <button
                      type="button"
                      disabled={savedUrls.has(c.url) || savingUrl === c.url}
                      onClick={() => saveCandidate(c)}
                    >
                      {savedUrls.has(c.url)
                        ? "Saved"
                        : savingUrl === c.url
                          ? "Saving…"
                          : "Save"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <h4 className="saved-sources-heading">Saved sources ({sources.length})</h4>
      {loadingSources ? (
        <p className="muted">Loading…</p>
      ) : sources.length === 0 ? (
        <p className="muted">
          No sources saved yet. Discover some above, or once one is saved, run{" "}
          <code>/extract-excerpts &lt;source_id&gt;</code> in Claude Code to pull typed excerpts
          from it.
        </p>
      ) : (
        sources.map((s) => <SourceCard key={s.id} source={s} />)
      )}
    </div>
  );
}
