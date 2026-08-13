import { useEffect, useState } from "react";
import { api } from "./api";
import type { Topic } from "./types";
import { CaptureScreen } from "./pages/CaptureScreen";
import { TopicDetail } from "./pages/TopicDetail";

export default function App() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTopics = () => {
    api
      .listTopics()
      .then(setTopics)
      .finally(() => setLoading(false));
  };

  useEffect(refreshTopics, []);

  const selected = topics.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Research &amp; Script Assistant</h1>
        <p className="muted">Capture → keyword check → research → highlights → script → SEO recheck</p>

        <h3>Topics</h3>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : topics.length === 0 ? (
          <p className="muted">No topics yet — create one below.</p>
        ) : (
          <ul className="topic-list">
            {topics.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={t.id === selectedId ? "active" : ""}
                  onClick={() => setSelectedId(t.id)}
                >
                  {t.title || `(untitled — ${new Date(t.created_at).toLocaleDateString()})`}
                  <span className={`status-pill status-${t.status}`}>{t.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <CaptureScreen
          onCreated={(topic) => {
            setTopics((prev) => [topic, ...prev]);
            setSelectedId(topic.id);
          }}
        />
      </aside>

      <main className="main">
        {selected ? (
          <TopicDetail topic={selected} />
        ) : (
          <p className="muted">Select a topic, or create a new one, to get started.</p>
        )}
      </main>
    </div>
  );
}
