import { useRef, useState } from "react";

// Stage 3 — select text anywhere this wraps, a small "+ Highlight" button
// appears near the selection, click it to save. Uses the browser's own
// Selection API — no editor library needed.
export function HighlightableText({
  text,
  onHighlight,
}: {
  text: string;
  onHighlight: (selectedText: string) => void;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [popup, setPopup] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim();
    if (!selectedText || !containerRef.current || !sel || sel.rangeCount === 0) {
      setPopup(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setPopup(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setPopup({ text: selectedText, x: rect.left + rect.width / 2, y: rect.top });
  };

  const confirm = () => {
    if (popup) {
      onHighlight(popup.text);
      setPopup(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <span className="highlightable" ref={containerRef} onMouseUp={handleMouseUp}>
      {text}
      {popup && (
        <button
          type="button"
          className="highlight-popup"
          style={{ left: popup.x, top: popup.y - 34 }}
          onMouseDown={(e) => e.preventDefault()} // keep the text selection alive through the click
          onClick={confirm}
        >
          + Highlight
        </button>
      )}
    </span>
  );
}
