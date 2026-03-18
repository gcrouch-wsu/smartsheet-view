"use client";

import { useRef } from "react";

const PUBLIC_URL_PLACEHOLDER = "{{PUBLIC_URL}}";

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const newValue = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
  const newCursor = start + before.length + (end - start);
  return { newValue, newCursor };
}

export function HeaderCustomTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = (before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { newValue, newCursor } = insertAtCursor(ta, before, after);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });
  };

  const handleInsertUrl = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const value = ta.value;
    const newValue = value.slice(0, start) + PUBLIC_URL_PLACEHOLDER + value.slice(start);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + PUBLIC_URL_PLACEHOLDER.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-2 py-1.5">
        <button
          type="button"
          onClick={() => handleFormat("**", "**")}
          className="rounded px-2 py-1 text-xs font-bold text-[color:var(--wsu-ink)] hover:bg-white/60"
          title="Bold (**text**)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => handleFormat("*", "*")}
          className="rounded px-2 py-1 text-xs italic text-[color:var(--wsu-ink)] hover:bg-white/60"
          title="Italic (*text*)"
        >
          I
        </button>
        <button
          type="button"
          onClick={handleInsertUrl}
          className="rounded px-2 py-1 text-xs text-[color:var(--wsu-crimson)] hover:bg-white/60"
          title="Insert live public URL"
        >
          Insert URL
        </button>
      </div>
      <textarea
        ref={textareaRef}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-b-lg rounded-t-none border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[color:var(--wsu-crimson)]"
      />
      <p className="text-xs text-[color:var(--wsu-muted)]">
        Renders in body font. {PUBLIC_URL_PLACEHOLDER} → live clickable link.
      </p>
    </div>
  );
}
