"use client";

import { useEditor, EditorContent, Node, mergeAttributes } from "@tiptap/react";
import { BubbleMenu as BubbleMenuComponent } from "@tiptap/react/menus";
import { BubbleMenu as BubbleMenuExtension } from "@tiptap/extension-bubble-menu";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useCallback, useEffect, useRef, useState } from "react";

const PUBLIC_URL_TEXT = "{{PUBLIC_URL}}";
// Escape regex special characters in the placeholder text for safe replacement
const PUBLIC_URL_REGEX = /\{\{PUBLIC_URL\}\}/g;

/** 
 * Custom Node to render {{PUBLIC_URL}} as a protected "chip".
 * This node is 'atomic' (atom: true), meaning it's treated as a single 
 * unit by the editor — users can't delete individual characters 
 * within the brackets, preventing syntax errors.
 */
const PublicUrlNode = Node.create({
  name: "publicUrl",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  parseHTML() {
    return [{ tag: "span[data-public-url]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-public-url": "", class: "public-url-chip" }), PUBLIC_URL_TEXT];
  },
});

// Icon helper components
function BoldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
  );
}

function ItalicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
  );
}

function StrikeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
  );
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  );
}

function UnlinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18.84 12.71 2.12-2.12a5 5 0 0 0-7.07-7.07l-1.41 1.41"/><path d="M5.16 11.29 3.04 13.41a5 5 0 0 0 7.07 7.07l1.41-1.41"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  );
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
  const isInternalUpdate = useRef(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[color:var(--wsu-crimson)] underline cursor-pointer",
        },
      }),
      BubbleMenuExtension,
      PublicUrlNode,
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[120px] rounded-b-lg rounded-t-none border border-t-0 border-[color:var(--wsu-border)] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--wsu-crimson)]",
      },
    },
    onUpdate: ({ editor }) => {
      if (isInternalUpdate.current) return;
      
      // When serializing to HTML for storage, we convert the <span data-public-url> 
      // back to the plain text placeholder {{PUBLIC_URL}}. This ensures the 
      // database stays clean and the public rendering logic only needs to 
      // know about the simple text token.
      const rawHtml = editor.getHTML();
      const sanitizedHtml = rawHtml.replace(/<span[^>]*data-public-url[^>]*>{{PUBLIC_URL}}<\/span>/g, PUBLIC_URL_TEXT);
      
      onChange(sanitizedHtml === "<p></p>" ? "" : sanitizedHtml);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) return;
    
    // When loading from storage (plain HTML), convert any {{PUBLIC_URL}} 
    // text tokens back into our protected TipTap Node (the span).
    const normalized = (value || "<p></p>").replace(
      PUBLIC_URL_REGEX, 
      `<span data-public-url>${PUBLIC_URL_TEXT}</span>`
    );
    
    const current = editor.getHTML();
    if (current !== normalized) {
      isInternalUpdate.current = true;
      editor.commands.setContent(normalized, { emitUpdate: false });
      isInternalUpdate.current = false;
    }
  }, [editor, value]);

  const openLinkMenu = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    setLinkUrl(previousUrl || "");
    setShowLinkInput(true);
  }, [editor]);

  const saveLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-2 py-1.5">
        <div className="flex items-center gap-0.5 border-r border-[color:var(--wsu-border)] pr-1.5 mr-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <ItalicIcon />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <StrikeIcon />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-0.5 border-r border-[color:var(--wsu-border)] pr-1.5 mr-1">
          <div className="relative">
            <ToolbarButton
              onClick={openLinkMenu}
              active={editor.isActive("link") || showLinkInput}
              title="Add/Edit Link"
            >
              <LinkIcon />
            </ToolbarButton>
            
            {showLinkInput && (
              <div className="absolute left-0 top-full z-50 mt-1 flex items-center gap-1 rounded-lg border border-[color:var(--wsu-border)] bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-150">
                <input
                  autoFocus
                  type="url"
                  placeholder="Paste URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveLink()}
                  className="w-48 rounded border border-[color:var(--wsu-border)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--wsu-crimson)]"
                />
                <button
                  onClick={saveLink}
                  className="flex h-6 w-6 items-center justify-center rounded bg-[color:var(--wsu-crimson)] text-white hover:bg-[color:var(--wsu-crimson-dark)]"
                >
                  <CheckIcon />
                </button>
                <button
                  onClick={() => setShowLinkInput(false)}
                  className="flex h-6 w-6 items-center justify-center rounded border border-[color:var(--wsu-border)] text-[color:var(--wsu-muted)] hover:bg-[color:var(--wsu-stone)]/30"
                >
                  <span className="text-lg leading-none">&times;</span>
                </button>
              </div>
            )}
          </div>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editor.isActive("link")}
            title="Remove Link"
          >
            <UnlinkIcon />
          </ToolbarButton>
        </div>

        <button
          type="button"
          onClick={() => editor.chain().focus().insertContent({ type: "publicUrl" }).run()}
          className="flex h-7 items-center gap-1.5 rounded bg-[color:var(--wsu-crimson)]/5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-crimson)] transition hover:bg-[color:var(--wsu-crimson)]/10"
          title="Insert protected live public URL placeholder"
        >
          <PlusIcon />
          Public URL
        </button>
      </div>

      {/* Bubble Menu (Inline Formatting) */}
      {editor && (
        <BubbleMenuComponent editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center gap-0.5 rounded-lg border border-[color:var(--wsu-border)] bg-white p-1 shadow-xl ring-1 ring-black/5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <BoldIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <ItalicIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={openLinkMenu}
              active={editor.isActive("link")}
              title="Link"
            >
              <LinkIcon />
            </ToolbarButton>
          </div>
        </BubbleMenuComponent>
      )}

      <EditorContent editor={editor} />

      <style jsx global>{`
        .public-url-chip {
          display: inline-flex;
          align-items: center;
          background-color: rgba(166, 15, 45, 0.08);
          color: #a60f2d;
          border: 1px solid rgba(166, 15, 45, 0.2);
          border-radius: 4px;
          padding: 0 4px;
          margin: 0 1px;
          font-weight: 600;
          font-size: 0.9em;
          user-select: none;
          pointer-events: none;
        }
      `}</style>

      <p className="text-[10px] font-medium text-[color:var(--wsu-muted)] italic">
        Highlight text to see inline formatting. The {PUBLIC_URL_TEXT} chip is protected and will render as a live link on the public page.
      </p>
    </div>
  );
}

function ToolbarButton({ 
  children, 
  onClick, 
  active = false, 
  disabled = false, 
  title 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  active?: boolean; 
  disabled?: boolean;
  title: string;
}) {
  return (
    <div className="group relative inline-block">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex h-7 w-7 items-center justify-center rounded transition hover:bg-white/60 ${
          active ? "bg-white/80 text-[color:var(--wsu-crimson)] shadow-sm" : "text-[color:var(--wsu-ink)]"
        } disabled:opacity-30`}
      >
        {children}
      </button>
      
      {/* CSS-only Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {title}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </div>
  );
}

