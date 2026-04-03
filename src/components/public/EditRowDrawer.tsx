"use client";

import { startTransition, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { FieldValue } from "@/components/public/FieldValue";
import { getContributorEditRowHeading, getEditDrawerOrderedFields } from "@/components/public/layout-utils";
import { useContributorContext } from "@/components/public/ContributorContext";
import type { EditableFieldGroup, ResolvedView, ResolvedViewRow } from "@/lib/config/types";
import { fieldLabelClassName } from "@/lib/field-typography";
import type { ContributorEditableFieldDefinition } from "@/lib/contributor-utils";
import {
  countFixedSlotsInEditableGroup,
  hasMultiPersonValidationErrors,
  parseMultiPersonRow,
  serializeContactDisplayToObjectValue,
  serializeMultiPersonToCells,
  slotOrderForEditableGroup,
  validateMultiPersonGroupsForSave,
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
    if (!contributor?.editingConfig) {
      return [];
    }
    return contributor.editingConfig.editableFields;
  }, [contributor?.editingConfig]);

  const contributorFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const f of contributor?.editingConfig?.editableFields ?? []) {
      keys.add(f.fieldKey);
    }
    for (const g of editableFieldGroups) {
      for (const a of g.attributes) {
        keys.add(a.fieldKey);
      }
    }
    for (const vf of view.fields) {
      if (vf.renderType === "people_group") {
        keys.add(vf.key);
      }
    }
    return keys;
  }, [contributor?.editingConfig?.editableFields, editableFieldGroups, view.fields]);

  const editableByFieldKey = useMemo(() => {
    const m = new Map<string, ContributorEditableFieldDefinition>();
    for (const f of editableFields) {
      m.set(f.fieldKey, f);
    }
    return m;
  }, [editableFields]);

  const orderedFields = useMemo(
    () => (row ? getEditDrawerOrderedFields(view, row, contributorFieldKeys, editableByFieldKey) : []),
    [view, row, contributorFieldKeys, editableByFieldKey],
  );

  const groupByFieldKey = useMemo(() => {
    const m = new Map<string, EditableFieldGroup>();
    for (const g of editableFieldGroups) {
      for (const a of g.attributes) {
        m.set(a.fieldKey, g);
      }
    }
    return m;
  }, [editableFieldGroups]);

  const writableFieldGroups = useMemo(
    () => editableFieldGroups.filter((g) => !g.readOnly),
    [editableFieldGroups],
  );

  const multiPersonValidation = useMemo(
    () => validateMultiPersonGroupsForSave(writableFieldGroups, groupValues),
    [writableFieldGroups, groupValues],
  );
  const multiPersonHasErrors = hasMultiPersonValidationErrors(multiPersonValidation);

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
      const text = row.fieldMap[field.fieldKey]?.textValue;
      values[field.columnId] = text ?? "";
      return values;
    }, {});
    setFormValues(nextValues);

    const nextGroups: Record<string, MultiPersonEntry[]> = {};
    for (const group of editableFieldGroups) {
      nextGroups[group.id] = parseMultiPersonRow(row, group);
    }
    setGroupValues(nextGroups);
    setError(null);
  }, [contributor?.editingConfig, editableFieldGroups, editableFields, open, row]);

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

  /** Smartsheet: CONTACT_LIST = one contact per cell; MULTI_CONTACT_LIST = several (API uses different objectValue shapes). */
  const isContactEditableField = (columnType: string) =>
    columnType === "CONTACT_LIST" || columnType === "MULTI_CONTACT_LIST";

  const dividerStyle = view.presentation?.rowDividerStyle ?? "default";
  const cardBorderClass =
    dividerStyle === "none"
      ? "border-0"
      : dividerStyle === "subtle"
        ? "border border-[color:var(--wsu-border)]/40"
        : "border border-[color:var(--wsu-border)]";
  const labelClass = "view-field-label text-[color:var(--wsu-muted)]";
  /** Visually distinct from the drawer surface so editable fields don’t look like empty paper until focus. */
  const contributorEditControlClass =
    "box-border min-h-[44px] w-full rounded-lg border-2 border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm text-[color:var(--wsu-ink)] shadow-sm outline-none transition placeholder:text-[color:var(--wsu-muted)] focus:border-[color:var(--wsu-crimson)] focus:ring-2 focus:ring-[color:var(--wsu-crimson)]/20";

  if (!contributor || !open || !row) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row || !contributor || isSaving) {
      return;
    }
    const mpErrors = validateMultiPersonGroupsForSave(writableFieldGroups, groupValues);
    if (hasMultiPersonValidationErrors(mpErrors)) {
      const firstMsg = Object.values(mpErrors)
        .flatMap((m) => Object.values(m))
        .map((e) => e.name ?? e.email)
        .find(Boolean);
      setError(firstMsg ?? "Complete name and email for each person, or remove anyone you are not saving.");
      toast.addToast(firstMsg ?? "Fix the highlighted fields before saving.", "error");
      document.getElementById("edit-row-drawer-validation-summary")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
          if (objectValue === null) {
            return { columnId: field.columnId, value: "" };
          }
          return { columnId: field.columnId, objectValue };
        }
        return { columnId: field.columnId, value: raw };
      }),
      ...writableFieldGroups.flatMap((group) =>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(35,31,32,0.28)]" role="presentation">
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
            <p className="mt-2 text-xs text-[color:var(--wsu-muted)]">
              Use <strong className="font-medium text-[color:var(--wsu-ink)]">Close</strong> or{" "}
              <strong className="font-medium text-[color:var(--wsu-ink)]">Cancel</strong> to exit — clicking outside the panel
              does not close the editor, so you won’t lose edits by accident.
            </p>
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
              <article
                className={`rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] p-5 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
              >
                <p className="mb-4 text-xs leading-relaxed text-[color:var(--wsu-muted)]">
                  Fields appear in the <strong className="font-medium text-[color:var(--wsu-ink)]">same order as your public card</strong>.
                  <span className="text-[color:var(--wsu-ink)]"> White boxes with a border are editable</span>; plain text blocks
                  are read-only. Changes save to Smartsheet. For a single contact column, use{" "}
                  <strong className="font-medium text-[color:var(--wsu-ink)]">Clear this role</strong>.
                </p>
                <div className="space-y-4">
                  {(() => {
                    const groupsRendered = new Set<string>();
                    return orderedFields.map((field) => {
                      const group = groupByFieldKey.get(field.key);
                      if (group) {
                        if (groupsRendered.has(group.id)) {
                          return null;
                        }
                        groupsRendered.add(group.id);
                        if (group.readOnly) {
                          const rf = group.fromRoleGroupViewFieldKey
                            ? row.fieldMap[group.fromRoleGroupViewFieldKey]
                            : undefined;
                          return (
                            <div
                              key={`group-ro-${group.id}`}
                              className="space-y-2 border-b border-[color:var(--wsu-border)]/50 pb-4 last:border-0 last:pb-0"
                            >
                              <p className={labelClass}>{group.label}</p>
                              <p className="text-xs text-amber-900/90">
                                Read-only: multi-attribute delimited role data cannot be edited safely in this form.
                              </p>
                              {rf ? (
                                <div className="text-sm text-[color:var(--wsu-ink)]">
                                  <FieldValue field={rf} stacked />
                                </div>
                              ) : null}
                            </div>
                          );
                        }
                        const persons = groupValues[group.id] ?? [];
                        const fixedSlotCount = countFixedSlotsInEditableGroup(group);
                        const fixedSlotOrder = fixedSlotCount > 0 ? slotOrderForEditableGroup(group) : [];
                        const hasName = group.attributes.some((a) => a.attribute === "name");
                        const hasEmail = group.attributes.some((a) => a.attribute === "email");
                        const hasPhone = group.attributes.some((a) => a.attribute === "phone");
                        const groupErrors = multiPersonValidation[group.id] ?? {};
                        return (
                          <div key={`group-${group.id}`} className="space-y-3 border-b border-[color:var(--wsu-border)]/50 pb-4 last:border-0 last:pb-0">
                            <div>
                              <p className={labelClass}>{group.label}</p>
                              <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">
                                {fixedSlotCount > 0
                                  ? `This role has ${fixedSlotCount} numbered positions in Smartsheet (shown below as 1–${fixedSlotCount}). Fill each row you use; leave unused rows blank or clear values before saving if your workflow allows.`
                                  : "One block per person. Name and email are both required when your sheet has both columns."}{" "}
                                Phone is optional until you have it.
                              </p>
                            </div>
                            <div className="space-y-3">
                              {persons.length === 0 && (
                                <p className="rounded-xl border border-dashed border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 px-3 py-4 text-center text-sm text-[color:var(--wsu-muted)]">
                                  No one listed. Use <strong className="text-[color:var(--wsu-ink)]">Add person</strong> or save to
                                  leave empty.
                                </p>
                              )}
                              {persons.map((person, idx) => {
                                const rowErr = groupErrors[idx];
                                const slotId = fixedSlotOrder[idx];
                                const smartsheetSlotTitle =
                                  slotId != null
                                    ? group.attributes.find((a) => a.slot === slotId && a.attribute === "name")
                                        ?.columnTitle?.trim()
                                    : undefined;
                                const positionLabel =
                                  fixedSlotCount > 0
                                    ? smartsheetSlotTitle ||
                                      `${group.label} — ${idx + 1} of ${fixedSlotCount}`
                                    : `${group.label} — person ${idx + 1}`;
                                const preview =
                                  person.name.trim() || person.email.trim()
                                    ? person.name.trim() || person.email.trim()
                                    : positionLabel;
                                return (
                                  <fieldset
                                    key={`${group.id}-person-${idx}`}
                                    className="rounded-xl border border-[color:var(--wsu-border)]/80 bg-white/80 p-3 shadow-sm space-y-2"
                                  >
                                    <legend className="mb-1 w-full border-b border-[color:var(--wsu-border)]/40 px-0.5 pb-1.5 text-left text-xs font-semibold text-[color:var(--wsu-ink)]">
                                      {positionLabel}
                                      {person.name.trim() || person.email.trim() ? (
                                        <span className="mt-0.5 block text-[11px] font-normal text-[color:var(--wsu-muted)]">
                                          {preview}
                                        </span>
                                      ) : null}
                                    </legend>
                                    {!group.usesFixedSlots ? (
                                      <div className="flex flex-wrap justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setGroupValues((prev) => ({
                                              ...prev,
                                              [group.id]: persons.filter((_, i) => i !== idx),
                                            }));
                                          }}
                                          className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ) : null}
                                    <div className="grid gap-2">
                                      {hasName &&
                                        (() => {
                                          const attr = group.attributes.find((a) => a.attribute === "name");
                                          const colLabel = attr?.columnTitle ?? "Name";
                                          return (
                                            <div key="name" className="space-y-0.5">
                                              <label className={labelClass} htmlFor={`${group.id}-n-${idx}`}>
                                                {colLabel}
                                              </label>
                                              <input
                                                id={`${group.id}-n-${idx}`}
                                                value={person.name}
                                                onChange={(e) => {
                                                  const next = [...persons];
                                                  next[idx] = { ...next[idx]!, name: e.target.value };
                                                  setGroupValues((prev) => ({ ...prev, [group.id]: next }));
                                                }}
                                                aria-invalid={Boolean(rowErr?.name)}
                                                aria-describedby={rowErr?.name ? `${group.id}-n-err-${idx}` : undefined}
                                                autoComplete="name"
                                                placeholder={person.name.trim() === "" ? "Name…" : undefined}
                                                className={
                                                  rowErr?.name
                                                    ? `${contributorEditControlClass} min-h-[40px] border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-200/30`
                                                    : `${contributorEditControlClass} min-h-[40px]`
                                                }
                                              />
                                              {rowErr?.name ? (
                                                <p id={`${group.id}-n-err-${idx}`} className="text-xs text-rose-700">
                                                  {rowErr.name}
                                                </p>
                                              ) : null}
                                            </div>
                                          );
                                        })()}
                                      {hasEmail &&
                                        (() => {
                                          const attr = group.attributes.find((a) => a.attribute === "email");
                                          const colLabel = attr?.columnTitle ?? "Email";
                                          return (
                                            <div key="email" className="space-y-0.5">
                                              <label className={labelClass} htmlFor={`${group.id}-e-${idx}`}>
                                                {colLabel}
                                              </label>
                                              <input
                                                id={`${group.id}-e-${idx}`}
                                                type="email"
                                                value={person.email}
                                                onChange={(e) => {
                                                  const next = [...persons];
                                                  next[idx] = { ...next[idx]!, email: e.target.value };
                                                  setGroupValues((prev) => ({ ...prev, [group.id]: next }));
                                                }}
                                                aria-invalid={Boolean(rowErr?.email)}
                                                aria-describedby={rowErr?.email ? `${group.id}-e-err-${idx}` : undefined}
                                                autoComplete="email"
                                                placeholder={person.email.trim() === "" ? "Email…" : undefined}
                                                className={
                                                  rowErr?.email
                                                    ? `${contributorEditControlClass} min-h-[40px] border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:ring-rose-200/30`
                                                    : `${contributorEditControlClass} min-h-[40px]`
                                                }
                                              />
                                              {rowErr?.email ? (
                                                <p id={`${group.id}-e-err-${idx}`} className="text-xs text-rose-700">
                                                  {rowErr.email}
                                                </p>
                                              ) : null}
                                            </div>
                                          );
                                        })()}
                                      {hasPhone &&
                                        (() => {
                                          const attr = group.attributes.find((a) => a.attribute === "phone");
                                          const colLabel = attr?.columnTitle ?? "Phone";
                                          return (
                                            <div key="phone" className="space-y-0.5">
                                              <label className={labelClass} htmlFor={`${group.id}-p-${idx}`}>
                                                {colLabel}
                                              </label>
                                              <input
                                                id={`${group.id}-p-${idx}`}
                                                type="tel"
                                                value={person.phone}
                                                onChange={(e) => {
                                                  const next = [...persons];
                                                  next[idx] = { ...next[idx]!, phone: e.target.value };
                                                  setGroupValues((prev) => ({ ...prev, [group.id]: next }));
                                                }}
                                                autoComplete="tel"
                                                placeholder={person.phone.trim() === "" ? "Phone (optional)…" : undefined}
                                                className={`${contributorEditControlClass} min-h-[40px]`}
                                              />
                                              <span className="text-xs text-[color:var(--wsu-muted)]">Optional</span>
                                            </div>
                                          );
                                        })()}
                                    </div>
                                  </fieldset>
                                );
                              })}
                              {!group.usesFixedSlots ? (
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  {persons.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setGroupValues((prev) => ({ ...prev, [group.id]: [] }))}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
                                    >
                                      Clear everyone
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setGroupValues((prev) => ({
                                        ...prev,
                                        [group.id]: [...persons, { name: "", email: "", phone: "" }],
                                      }))
                                    }
                                    className="rounded-lg border border-dashed border-[color:var(--wsu-crimson)]/50 bg-[color:var(--wsu-crimson)]/5 px-3 py-2 text-sm font-semibold text-[color:var(--wsu-crimson)] hover:bg-[color:var(--wsu-crimson)]/10"
                                  >
                                    + Add person
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      }

                      const ed = editableByFieldKey.get(field.key);
                      if (ed) {
                        const value = formValues[ed.columnId] ?? "";
                        const showContactClear = isContactEditableField(ed.columnType);
                        const fieldLabel = ed.columnTitle || ed.label;
                        return (
                          <div key={field.key} className="space-y-2 border-b border-[color:var(--wsu-border)]/50 pb-4 last:border-0 last:pb-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              {!field.hideLabel && (
                                <p className={fieldLabelClassName(field)}>
                                  {fieldLabel}{" "}
                                  <span className="rounded-md border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                                    Editable
                                  </span>
                                </p>
                              )}
                              {showContactClear && (
                                <button
                                  type="button"
                                  onClick={() => setFormValues((current) => ({ ...current, [ed.columnId]: "" }))}
                                  className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
                                >
                                  Clear this role
                                </button>
                              )}
                            </div>
                            {ed.columnType === "PICKLIST" && ed.options && ed.options.length > 0 ? (
                              <select
                                value={value}
                                onChange={(event) =>
                                  setFormValues((current) => ({ ...current, [ed.columnId]: event.target.value }))
                                }
                                aria-label={fieldLabel}
                                className={contributorEditControlClass}
                              >
                                <option value="">Select…</option>
                                {ed.options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : ed.columnType === "MULTI_PICKLIST" && ed.options && ed.options.length > 0 ? (
                              <fieldset className="space-y-2">
                                <legend className="sr-only">{fieldLabel}</legend>
                                <p className="text-xs text-[color:var(--wsu-muted)]">Select one or more (saved as a comma-separated list).</p>
                                <div className="flex flex-col gap-2">
                                  {(() => {
                                    const selected = new Set(
                                      value
                                        .split(/[,;\n]+/)
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    );
                                    return ed.options!.map((option) => (
                                      <label
                                        key={option}
                                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--wsu-border)]/60 bg-white px-3 py-2 text-sm"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected.has(option)}
                                          onChange={(event) => {
                                            const nextSel = new Set(selected);
                                            if (event.target.checked) {
                                              nextSel.add(option);
                                            } else {
                                              nextSel.delete(option);
                                            }
                                            const ordered = ed.options!.filter((o) => nextSel.has(o));
                                            setFormValues((current) => ({
                                              ...current,
                                              [ed.columnId]: ordered.join(", "),
                                            }));
                                          }}
                                          className="h-4 w-4 rounded border-[color:var(--wsu-border)] text-[color:var(--wsu-crimson)]"
                                        />
                                        <span>{option}</span>
                                      </label>
                                    ));
                                  })()}
                                </div>
                              </fieldset>
                            ) : ed.renderType === "multiline_text" ? (
                              <textarea
                                value={value}
                                onChange={(event) =>
                                  setFormValues((current) => ({ ...current, [ed.columnId]: event.target.value }))
                                }
                                rows={4}
                                aria-label={fieldLabel}
                                placeholder="Edit text…"
                                className={`${contributorEditControlClass} min-h-[7rem] resize-y`}
                              />
                            ) : (
                              <input
                                value={value}
                                onChange={(event) =>
                                  setFormValues((current) => ({ ...current, [ed.columnId]: event.target.value }))
                                }
                                aria-label={fieldLabel}
                                placeholder={value.trim() === "" ? "Click or tap to type…" : undefined}
                                className={contributorEditControlClass}
                              />
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={field.key} className="space-y-1 border-b border-[color:var(--wsu-border)]/50 pb-4 last:border-0 last:pb-0">
                          {!field.hideLabel && <p className={fieldLabelClassName(field)}>{field.label}</p>}
                          <div className="text-sm text-[color:var(--wsu-ink)]">
                            <FieldValue field={field} stacked />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </article>
            )}

            {multiPersonHasErrors && (
              <div
                id="edit-row-drawer-validation-summary"
                role="status"
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              >
                <p className="font-medium">Before you can save</p>
                <p className="mt-1 text-amber-900/90">
                  Each person must have the required fields filled in (name and email when both columns exist), or use{" "}
                  <strong>Remove person</strong>. Phone and similar fields can wait for a later edit.
                </p>
              </div>
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
              disabled={isSaving || (editableFields.length === 0 && writableFieldGroups.length === 0)}
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
