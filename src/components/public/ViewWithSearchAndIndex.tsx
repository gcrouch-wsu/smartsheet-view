"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { ContributorProvider } from "@/components/public/ContributorContext";
import { EditRowDrawer } from "@/components/public/EditRowDrawer";
import { PublicViewRenderer } from "@/components/public/ViewRenderer";
import { describeResolvedField, getIndexText } from "@/components/public/layout-utils";
import type { LayoutType, ResolvedView, ResolvedViewRow } from "@/lib/config/types";
import type { ContributorEditingClientConfig } from "@/lib/contributor-utils";

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
  const text = getIndexText(view, row);
  const first = text.trim().charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return "#";
  return "#";
}

export function ViewWithSearchAndIndex({
  view,
  layout,
  embed,
  slug = "",
  viewId = "",
  contributorEmail = null,
  editingConfig = null,
  editableRowIds = [],
}: {
  view: ResolvedView;
  layout: LayoutType;
  embed: boolean;
  slug?: string;
  viewId?: string;
  contributorEmail?: string | null;
  editingConfig?: ContributorEditingClientConfig | null;
  editableRowIds?: number[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);

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

  const editableRowIdSet = useMemo(() => new Set(editableRowIds), [editableRowIds]);
  const editingRow = useMemo(
    () => view.rows.find((row) => row.id === editingRowId) ?? null,
    [editingRowId, view.rows],
  );

  function scrollToLetter(letter: string) {
    const rowId = letterToRowId.get(letter);
    if (rowId != null) {
      const el = document.getElementById(`row-${rowId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveLetter(letter);
      setTimeout(() => setActiveLetter(null), 800);
    }
  }

  async function handleSignOut() {
    if (!slug) {
      return;
    }

    const response = await fetch(`/api/public/views/${slug}/sign-out`, { method: "POST" });
    if (!response.ok) {
      toast.addToast("Unable to sign out.", "error");
      return;
    }

    toast.addToast("Signed out.", "success");
    startTransition(() => {
      router.refresh();
    });
  }

  function handleEditRow(rowId: number) {
    if (!editableRowIdSet.has(rowId)) {
      return;
    }
    setEditingRowId(rowId);
  }

  const showSearchAndIndex = !embed && filteredView.rows.length > 0;
  const contributorContextValue = {
    email: contributorEmail,
    viewId,
    editingConfig,
    editableRowIds,
    signOut: handleSignOut,
  };

  return (
    <ContributorProvider value={contributorContextValue}>
      <div className="relative">
        {!embed && contributorEmail && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-4 py-3 text-sm text-[color:var(--wsu-muted)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-[color:var(--wsu-ink)]">Editing as {contributorEmail}</span>
              <span>{editableRowIds.length} editable row{editableRowIds.length === 1 ? "" : "s"} in this view</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
            >
              Sign out
            </button>
          </div>
        )}

        {showSearchAndIndex && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search programs, names, emails..."
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
          <PublicViewRenderer
            layout={layout}
            view={filteredView}
            editableRowIds={editableRowIdSet}
            onEditRow={contributorEmail && editingConfig ? handleEditRow : undefined}
          />
        </div>

        <EditRowDrawer slug={slug} row={editingRow} open={editingRow != null} onClose={() => setEditingRowId(null)} />
      </div>
    </ContributorProvider>
  );
}
