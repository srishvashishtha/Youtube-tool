import { useState } from "react";
import { api } from "../api";
import type { Topic } from "../types";
import { MicButton } from "../components/MicButton";

// Stage 0 — Capture. Voice memo or typed text, loose brain-dump. No topic
// restriction baked in here — whatever idea comes in is what gets saved.
export function CaptureScreen({ onCreated }: { onCreated: (topic: Topic) => void }) {
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() && !transcript.trim()) {
      setError("Type a title, or speak/type a brain-dump, before saving.");
      return;
    }
    setSaving(true);
    try {
      const topic = await api.createTopic({
        title: title.trim() || undefined,
        seed_transcript: transcript.trim() || undefined,
      });
      setTitle("");
      setTranscript("");
      onCreated(topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="capture-screen" onSubmit={handleSubmit}>
      <h2>New topic</h2>
      <label>
        Working title (optional)
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. why career breaks get penalized differently"
        />
      </label>

      <label>
        Brain-dump — speak it or type it
        <textarea
          rows={6}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Whatever's in your head about this idea — loose is fine."
        />
      </label>

      <MicButton
        onTranscript={(text) =>
          setTranscript((prev) => (prev ? `${prev} ${text}` : text))
        }
      />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save topic"}
      </button>
    </form>
  );
}
