import type { KeywordCheck } from "../types";

const VERDICT_LABEL: Record<string, string> = {
  proceed: "✅ Has volume",
  reframe: "↩️ Reframe — adjacent phrasing has volume",
  underserved: "🟡 Underserved — thin but real",
  "low-interest": "⬜ Low interest",
  error: "⚠️ Check failed",
};

const SOURCE_LABEL: Record<string, string> = {
  youtube_autocomplete: "YouTube autocomplete",
  google_trends: "Google Trends",
};

export function VerdictDisplay({ checks }: { checks: KeywordCheck[] }) {
  if (checks.length === 0) {
    return <p className="muted">No keyword checks yet — add phrases and run a check.</p>;
  }

  const byKeyword = new Map<string, KeywordCheck[]>();
  for (const check of checks) {
    const list = byKeyword.get(check.keyword) ?? [];
    list.push(check);
    byKeyword.set(check.keyword, list);
  }

  const proceedCount = checks.filter((c) => c.verdict === "proceed").length;
  const gapCount = checks.filter(
    (c) => c.verdict === "reframe" || c.verdict === "underserved"
  ).length;

  return (
    <div className="verdict-display">
      <p className="summary">
        {proceedCount} check{proceedCount === 1 ? "" : "s"} show direct volume ·{" "}
        {gapCount} show a gap (adjacent phrasing has volume, exact phrase doesn't, or
        it's thin-but-real) — that's usually the reframe-or-underserved signal worth a
        second look before you commit.
      </p>

      {[...byKeyword.entries()].map(([keyword, keywordChecks]) => (
        <div key={keyword} className="keyword-group">
          <h4>{keyword}</h4>
          {keywordChecks.map((check) => (
            <div key={check.id} className={`check-card verdict-${check.verdict}`}>
              <div className="check-card-header">
                <span>{SOURCE_LABEL[check.source] ?? check.source}</span>
                <span className="badge">
                  {(check.verdict && VERDICT_LABEL[check.verdict]) ?? check.verdict}
                </span>
              </div>
              <p className="signal-notes">{check.signal_notes}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
