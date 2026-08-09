import { useEffect, useRef, useState } from "react";

// Web Speech API — built into Chrome, free, no key. No audio is ever saved,
// only the live transcript text. See docs/architecture.md — Stage 0.
// Not in the default TS DOM lib, so this is a minimal shape of what we use.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function MicButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported] = useState(() => getSpeechRecognition() !== null);
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  if (!supported) {
    return (
      <button type="button" disabled title="Voice input isn't supported in this browser — try Chrome, or just type.">
        🎤 Not supported here — type instead
      </button>
    );
  }

  const toggle = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognition()!;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
      }
      if (finalText.trim()) onTranscript(finalText.trim());
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  return (
    <button type="button" onClick={toggle} className={recording ? "mic-recording" : ""}>
      {recording ? "⏹ Stop recording" : "🎤 Speak your idea"}
    </button>
  );
}
