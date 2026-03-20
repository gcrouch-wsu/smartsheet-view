"use client";

import { startTransition, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { FieldValue } from "@/components/public/FieldValue";
import { getContributorEditRowHeading } from "@/components/public/layout-utils";
import { useContributorContext } from "@/components/public/ContributorContext";
import type { ResolvedView, ResolvedViewRow } from "@/lib/config/types";
import {
  parseMultiPersonRow,
  serializeContactDisplayToObjectValue,
  serializeMultiPersonToCells,
  type MultiPersonEntry,
} from "@/lib/contributor-utils";

export function EditRowDrawer({
  slug,
  view,
  row,
  open,
  onClose,
  returnFocusRef,
}: {
  slug: string;
  view: ResolvedView;
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

  const editDrawerTitle = useMemo(() => {
    if (!row) {
      return { visible: "Edit entry", srOnlySuffix: "" as string };
    }
    const heading = getContributorEditRowHeading(view, row);
    return {
      visible: heading ? `Edit: ${heading}` : "Edit your entry",
      srOnlySuffix: ` Smartsheet row ${row.id}`,
    };
  }, [view, row]);

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
              {editDrawerTitle.visible}
              <span className="sr-only">{editDrawerTitle.srOnlySuffix}</span>
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
                        Changes save directly to the live Smartsheet row. For contact fields, use{" "}
                        <strong className="font-medium text-[color:var(--wsu-ink)]">Clear this role</strong> to remove everyone
                        from that column.
                      </p>
                    </div>
                    {editableFields.map((field) => {
                      const value = formValues[field.columnId] ?? "";
                      const showContactClear = isContactEditableField(field.columnType);
                      return (
                        <div
                          key={field.columnId}
                          className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 space-y-2"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <span className="text-sm font-medium text-[color:var(--wsu-ink)]">{field.label}</span>
                            {showContactClear && (
                              <button
                                type="button"
                                onClick={() =>
                                  setFormValues((current) => ({ ...current, [field.columnId]: "" }))
                                }
                                className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
                              >
                                Clear this role
                              </button>
                            )}
                          </div>
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
                        </div>
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
                          One card per person. Use <strong className="font-medium text-[color:var(--wsu-ink)]">Remove</strong> on a
                          card to drop that person, or <strong className="font-medium text-[color:var(--wsu-ink)]">
                            Clear everyone in this role
                          </strong>{" "}
                          below to empty the whole group. Save to update Smartsheet.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {persons.length === 0 && (
                          <p className="rounded-xl border border-dashed border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/15 px-4 py-5 text-center text-sm text-[color:var(--wsu-muted)]">
                            No one is listed in this role. Add a person, or save to keep it empty.
                          </p>
                        )}
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
                                className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
                              >
                                Remove person
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {persons.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setGroupValues((prev) => ({ ...prev, [group.id]: [] }));
                              }}
                              className="w-full rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-medium text-rose-900 hover:bg-rose-100 sm:w-auto sm:px-4"
                            >
                              Clear everyone in this role
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setGroupValues((prev) => ({
                                ...prev,
                                [group.id]: [...persons, { name: "", email: "", phone: "" }],
                              }));
                            }}
                            className="w-full rounded-xl border border-dashed border-[color:var(--wsu-border)] py-3 text-sm font-medium text-[color:var(--wsu-muted)] hover:bg-[color:var(--wsu-stone)]/10 sm:flex-1"
                          >
                            Add person
                          </button>
                        </div>
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
