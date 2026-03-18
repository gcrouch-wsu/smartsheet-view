"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

const PUBLIC_URL_PLACEHOLDER = "{{PUBLIC_URL}}";

export function HeaderCustomTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Public URL: {{PUBLIC_URL}}" }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[80px] rounded-b-lg rounded-t-none border border-t-0 border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--wsu-crimson)]",
      },
    },
    onUpdate: ({ editor }) => {
      if (isInternalUpdate.current) return;
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) return;
    const current = editor.getHTML();
    const normalized = value || "<p></p>";
    if (current !== normalized) {
      isInternalUpdate.current = true;
      editor.commands.setContent(normalized, { emitUpdate: false });
      isInternalUpdate.current = false;
    }
  }, [editor, value]);

  if (!editor) return null;

  const handleInsertUrl = () => {
    editor.chain().focus().insertContent(PUBLIC_URL_PLACEHOLDER).run();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-2 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-1 text-xs font-bold text-[color:var(--wsu-ink)] hover:bg-white/60 ${editor.isActive("bold") ? "bg-white/60" : ""}`}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-1 text-xs italic text-[color:var(--wsu-ink)] hover:bg-white/60 ${editor.isActive("italic") ? "bg-white/60" : ""}`}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`rounded px-2 py-1 text-xs text-[color:var(--wsu-ink)] hover:bg-white/60 line-through ${editor.isActive("strike") ? "bg-white/60" : ""}`}
          title="Strikethrough"
        >
          S
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
      <EditorContent editor={editor} />
      <p className="text-xs text-[color:var(--wsu-muted)]">
        Renders in body font. {PUBLIC_URL_PLACEHOLDER} → live clickable link.
      </p>
    </div>
  );
}
