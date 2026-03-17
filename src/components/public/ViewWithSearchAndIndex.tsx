"use client";

import { useMemo, useState } from "react";
import { PublicViewRenderer } from "@/components/public/ViewRenderer";
import { describeResolvedField, getRowHeadingText } from "@/components/public/layout-utils";
import type { LayoutType, ResolvedView, ResolvedViewRow } from "@/lib/config/types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function getSearchableText(view: ResolvedView, row: ResolvedViewRow): string {
  const parts: string[] = [];
  for (const field of row.fields) {
    const text = describeResolvedField(field);
    if (text) parts.push(text);
    if (field.links.length > 0) {
      parts.push(...field.links.map((l) => l.label));
    }
    if (field.listValue.length > 0) {
      parts.push(...field.listValue);
    }
  }
  return parts.join(" ").toLowerCase();
}

function getIndexLetter(view: ResolvedView, row: ResolvedViewRow): string {
  const text = getRowHeadingText(view, row);
  const first = text.trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return "#";
  return "#";
}

export function ViewWithSearchAndIndex({
  view,
  layout,
  embed,
}: {
  view: ResolvedView;
  layout: LayoutType;
  embed: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filteredView = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return view;
    }
    const filtered = view.rows.filter((row) => getSearchableText(view, row).includes(q));
    return { ...view, rows: filtered, rowCount: filtered.length };
  }, [view, searchQuery]);

  const letterToRowId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredView.rows) {
      const letter = getIndexLetter(view, row);
      if (!map.has(letter)) {
        map.set(letter, row.id);
      }
    }
    return map;
  }, [filteredView.rows, view]);

  const activeLetters = useMemo(() => {
    const set = new Set<string>();
    for (const row of filteredView.rows) {
      set.add(getIndexLetter(view, row));
    }
    return set;
  }, [filteredView.rows, view]);

  function scrollToLetter(letter: string) {
    const rowId = letterToRowId.get(letter);
    if (rowId != null) {
      const el = document.getElementById(`row-${rowId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveLetter(letter);
      setTimeout(() => setActiveLetter(null), 800);
    }
  }

  const showSearchAndIndex = !embed && filteredView.rows.length > 0;

  return (
    <div className="relative">
      {showSearchAndIndex && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search programs, names, emails…"
                className="w-full rounded-xl border border-[color:var(--wsu-border)] bg-white px-4 py-2.5 pl-10 text-sm text-[color:var(--wsu-ink)] placeholder:text-[color:var(--wsu-muted)] focus:border-[color:var(--wsu-crimson)] focus:outline-none focus:ring-2 focus:ring-[color:var(--wsu-crimson)]/20"
                aria-label="Search"
              />
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--wsu-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-sm text-[color:var(--wsu-muted)]">
              {filteredView.rowCount} of {view.rowCount} results
            </span>
          </div>

          <div className="fixed right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 rounded-lg border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)]/95 px-1.5 py-2 shadow-lg backdrop-blur-sm">
            {["#", ...ALPHABET].map((letter) => {
              const hasEntries = activeLetters.has(letter);
              const isActive = activeLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => hasEntries && scrollToLetter(letter)}
                  disabled={!hasEntries}
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs font-medium transition ${
                    hasEntries
                      ? isActive
                        ? "bg-[color:var(--wsu-crimson)] text-white"
                        : "text-[color:var(--wsu-crimson)] hover:bg-[color:var(--wsu-crimson)]/10"
                      : "cursor-default text-[color:var(--wsu-border)]"
                  }`}
                  title={hasEntries ? `Jump to ${letter}` : `No entries for ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className={showSearchAndIndex ? "pr-12" : ""}>
        <PublicViewRenderer layout={layout} view={filteredView} />
      </div>
    </div>
  );
}
