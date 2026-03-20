"use client";

import { startTransition, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { FieldValue } from "@/components/public/FieldValue";
import { useContributorContext } from "@/components/public/ContributorContext";
import type { ResolvedViewRow } from "@/lib/config/types";
import {
  parseMultiPersonRow,
  serializeContactDisplayToObjectValue,
  serializeMultiPersonToCells,
  type MultiPersonEntry,
} from "@/lib/contributor-utils";

export function EditRowDrawer({
  slug,
  row,
  open,
  onClose,
  returnFocusRef,
}: {
  slug: string;
  row: ResolvedViewRow | null;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: MutableRefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const toast = useToast();
  const contributor = useContributorContext();
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [groupValues, setGroupValues] = useState<Record<string, MultiPersonEntry[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerSurfaceRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const editableFieldGroups = useMemo(
    () => contributor?.editingConfig?.editableFieldGroups ?? [],
    [contributor?.editingConfig?.editableFieldGroups],
  );
  const editableFields = useMemo(() => {
    if (!row || !contributor?.editingConfig) {
      return [];
    }

    return contributor.editingConfig.editableFields.filter((field) => Boolean(row.fieldMap[field.fieldKey]));
  }, [contributor?.editingConfig, row]);

  const editableFieldKeys = useMemo(() => new Set(editableFields.map((field) => field.fieldKey)), [editableFields]);
  const readOnlyFields = row ? row.fields.filter((field) => !editableFieldKeys.has(field.key)) : [];

  useEffect(() => {
    if (!row || !contributor?.editingConfig || !open) {
      return;
    }

    const nextValues = editableFields.reduce<Record<number, string>>((values, field) => {
      values[field.columnId] = row.fieldMap[field.fieldKey]?.textValue ?? "";
      return values;
    }, {});
    setFormValues(nextValues);

    const nextGroups: Record<string, MultiPersonEntry[]> = {};
    for (const group of editableFieldGroups) {
      nextGroups[group.id] = parseMultiPersonRow(row, group);
    }
    setGroupValues(nextGroups);
    setError(null);
  }, [contributor?.editingConfig, editableFields, editableFieldGroups, open, row]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !contributor || !row) {
      return;
    }

    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const surface = drawerSurfaceRef.current;
    closeButtonRef.current?.focus();

    function cycleTabFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !surface) {
        return;
      }
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const nodes = Array.from(surface.querySelectorAll(selector)).filter(
        (el): el is HTMLElement => el instanceof HTMLElement,
      );
      if (nodes.length === 0) {
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", cycleTabFocus);
    return () => {
      document.removeEventListener("keydown", cycleTabFocus);
      const target = returnFocusRef?.current ?? previousActive;
      if (target && typeof target.focus === "function") {
        try {
          target.focus();
        } catch {
          /* ignore */
        }
      }
      if (returnFocusRef) {
        returnFocusRef.current = null;
      }
    };
  }, [open, contributor, row, returnFocusRef]);

  if (!contributor || !open || !row) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row || !contributor) {
      return;
    }
    setIsSaving(true);
    setError(null);

    const isContactColumn = (colType: string) =>
      colType === "CONTACT_LIST" || colType === "MULTI_CONTACT_LIST";

    const cells: Array<{ columnId: number; value?: string; objectValue?: unknown }> = [
      ...editableFields.map((field) => {
        const raw = formValues[field.columnId] ?? "";
        if (isContactColumn(field.columnType) && field.contactDisplayMode) {
          const objectValue = serializeContactDisplayToObjectValue(
            raw,
            field.columnType,
            field.contactDisplayMode,
          );
          return { columnId: field.columnId, objectValue };
        }
        return { columnId: field.columnId, value: raw };
      }),
      ...editableFieldGroups.flatMap((group) =>
        serializeMultiPersonToCells(groupValues[group.id] ?? [], group),
      ),
    ];

    try {
      const response = await fetch(`/api/public/views/${slug}/rows/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          viewId: contributor.viewId,
          cells,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; ok?: boolean } | null;
      if (!response.ok) {
        const nextError = payload?.error ?? "Update failed. Try again.";
        setError(nextError);
        toast.addToast(nextError, "error");
        return;
      }

      toast.addToast("Row updated.", "success");
      onClose();
      startTransition(() => {
        router.refresh();
      });
    } catch (submitError) {
      const nextError = submitError instanceof Error ? submitError.message : "Update failed. Try again.";
      setError(nextError);
      toast.addToast(nextError, "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(35,31,32,0.28)]" onClick={onClose}>
      <aside
        ref={drawerSurfaceRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-row-drawer-title"
        className="flex h-full w-full max-w-xl flex-col border-l border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--wsu-border)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">
              Contributor Editing
            </p>
            <h3 id="edit-row-drawer-title" className="mt-2 text-2xl font-semibold text-[color:var(--wsu-ink)]">
              Edit row {row.id}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">Signed in as {contributor.email}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-sm text-[color:var(--wsu-muted)]"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {editableFields.length === 0 && editableFieldGroups.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No editable fields are available for this row.
              </div>
            ) : (
              <>
                {editableFields.length > 0 && (
                  <section className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                        Editable Fields
                      </h4>
                      <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                        Changes save directly to the live Smartsheet row.
                      </p>
                    </div>
                    {editableFields.map((field) => {
                      const value = formValues[field.columnId] ?? "";
                      return (
                        <label key={field.columnId} className="block space-y-2 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4">
                          <span className="block text-sm font-medium text-[color:var(--wsu-ink)]">{field.label}</span>
                          {field.columnType === "PICKLIST" && field.options && field.options.length > 0 ? (
                            <select
                              value={value}
                              onChange={(event) =>
                                setFormValues((current) => ({ ...current, [field.columnId]: event.target.value }))
                              }
                              className="min-h-[44px] w-full rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                            >
                              <option value="">Select value</option>
                              {field.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : field.renderType === "multiline_text" ? (
                            <textarea
                              value={value}
                              onChange={(event) =>
                                setFormValues((current) => ({ ...current, [field.columnId]: event.target.value }))
                              }
                              rows={4}
                              className="w-full rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                            />
                          ) : (
                            <input
                              value={value}
                              onChange={(event) =>
                                setFormValues((current) => ({ ...current, [field.columnId]: event.target.value }))
                              }
                              className="min-h-[44px] w-full rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                            />
                          )}
                        </label>
                      );
                    })}
                  </section>
                )}

                {editableFieldGroups.map((group) => {
                  const persons = groupValues[group.id] ?? [];
                  const hasName = group.attributes.some((a) => a.attribute === "name");
                  const hasEmail = group.attributes.some((a) => a.attribute === "email");
                  const hasPhone = group.attributes.some((a) => a.attribute === "phone");

                  return (
                    <section key={group.id} className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                          {group.label}
                        </h4>
                        <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                          One card per person. Values are saved comma-separated in Smartsheet.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {persons.map((person, idx) => (
                          <fieldset
                            key={idx}
                            className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 space-y-3"
                          >
                            <legend className="sr-only">
                              {group.label}, person {idx + 1} of {persons.length}
                            </legend>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-[color:var(--wsu-muted)]" aria-hidden>
                                Person {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setGroupValues((prev) => ({
                                    ...prev,
                                    [group.id]: persons.filter((_, i) => i !== idx),
                                  }));
                                }}
                                className="text-xs text-rose-600 hover:text-rose-800"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid gap-3">
                              {hasName && (
                                <label className="block space-y-1">
                                  <span className="text-xs font-medium text-[color:var(--wsu-muted)]">Name</span>
                                  <input
                                    value={person.name}
                                    onChange={(e) => {
                                      const next = [...persons];
                                      next[idx] = { ...next[idx]!, name: e.target.value };
                                      setGroupValues((prev) => ({ ...prev, [group.id]: next }));
                                    }}
                                    className="min-h-[40px] w-full rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                                  />
                                </label>
                              )}
                              {hasEmail && (
                                <label className="block space-y-1">
                                  <span className="text-xs font-medium text-[color:var(--wsu-muted)]">Email</span>
                                  <input
                                    type="email"
                                    value={person.email}
                                    onChange={(e) => {
                                      const next = [...persons];
                                      next[idx] = { ...next[idx]!, email: e.target.value };
                                      setGroupValues((prev) => ({ ...prev, [group.id]: next }));
                                    }}
                                    className="min-h-[40px] w-full rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                                  />
                                </label>
                              )}
                              {hasPhone && (
                                <label className="block space-y-1">
                                  <span className="text-xs font-medium text-[color:var(--wsu-muted)]">Phone</span>
                                  <input
                                    type="tel"
                                    value={person.phone}
                                    onChange={(e) => {
                                      const next = [...persons];
                                      next[idx] = { ...next[idx]!, phone: e.target.value };
                                      setGroupValues((prev) => ({ ...prev, [group.id]: next }));
                                    }}
                                    className="min-h-[40px] w-full rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                                  />
                                </label>
                              )}
                            </div>
                          </fieldset>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setGroupValues((prev) => ({
                              ...prev,
                              [group.id]: [...persons, { name: "", email: "", phone: "" }],
                            }));
                          }}
                          className="w-full rounded-xl border border-dashed border-[color:var(--wsu-border)] py-3 text-sm font-medium text-[color:var(--wsu-muted)] hover:bg-[color:var(--wsu-stone)]/10"
                        >
                          Add person
                        </button>
                      </div>
                    </section>
                  );
                })}
              </>
            )}

            {readOnlyFields.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                    Read-Only Context
                  </h4>
                </div>
                <div className="space-y-3">
                  {readOnlyFields.map((field) => (
                    <div key={field.key} className="rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-4">
                      {!field.hideLabel && (
                        <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">
                          {field.label}
                        </p>
                      )}
                      <div className="mt-2 text-sm text-[color:var(--wsu-ink)]">
                        <FieldValue field={field} stacked />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--wsu-border)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSaving ||
                (editableFields.length === 0 && editableFieldGroups.length === 0)
              }
              className="rounded-full bg-[color:var(--wsu-crimson)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
