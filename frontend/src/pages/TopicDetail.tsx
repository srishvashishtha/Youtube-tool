import { useState } from "react";
import type { Topic } from "../types";
import { KeywordChecker } from "../components/KeywordChecker";
import { ResearchScreen } from "../components/ResearchScreen";
import { HighlightsView } from "../components/HighlightsView";
import { ScriptWorkspace } from "../components/ScriptWorkspace";
import { SeoRecheck } from "../components/SeoRecheck";

// Plain tabs, no router — continues the app's existing hand-rolled-state
// pattern (see App.tsx). Nothing here needs bookmarkable URLs; this is a
// single-user local tool. Structural, not polish — see build-plan.md.
type Stage = "keywords" | "research" | "highlights" | "script" | "seo";

const STAGES: { id: Stage; label: string }[] = [
  { id: "keywords", label: "Keyword check" },
  { id: "research", label: "Research" },
  { id: "highlights", label: "Highlights" },
  { id: "script", label: "Script" },
  { id: "seo", label: "SEO recheck" },
];

export function TopicDetail({ topic }: { topic: Topic }) {
  const [stage, setStage] = useState<Stage>("keywords");

  return (
    <div className="topic-detail">
      <div className="tab-row">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === stage ? "tab active" : "tab"}
            onClick={() => setStage(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {stage === "keywords" && <KeywordChecker topic={topic} />}
        {stage === "research" && <ResearchScreen topic={topic} />}
        {stage === "highlights" && <HighlightsView topic={topic} />}
        {stage === "script" && <ScriptWorkspace topic={topic} />}
        {stage === "seo" && <SeoRecheck topic={topic} />}
      </div>
    </div>
  );
}
