"use client";

import React from "react";
import type { EditableFieldGroup, ResolvedFieldValue } from "@/lib/config/types";
import type {
  ContributorEditableFieldDefinition,
  MultiPersonEntry,
  MultiPersonFieldErrors,
} from "@/lib/contributor-utils";
import { FieldValue } from "@/components/public/FieldValue";
import { fieldLabelClassName } from "@/lib/field-typography";
import {
  countFixedSlotsInEditableGroup,
  slotOrderForEditableGroup,
} from "@/lib/contributor-utils";

export const contributorEditControlClass =
  "box-border min-h-[44px] w-full rounded-lg border-2 border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm text-[color:var(--wsu-ink)] shadow-sm outline-none transition placeholder:text-[color:var(--wsu-muted)] focus:border-[color:var(--wsu-crimson)] focus:ring-2 focus:ring-[color:var(--wsu-crimson)]/20";

const labelClass = "view-field-label text-[color:var(--wsu-muted)]";

/** Numbered role groups store per-slot attributes; slot ids should match but tolerate "2" vs 2 from JSON. */
function slotsMatch(slotOnAttr: string | undefined, slotForRow: string | undefined): boolean {
  if (slotOnAttr == null || slotForRow == null) {
    return false;
  }
  if (slotOnAttr === slotForRow) {
    return true;
  }
  const a = Number(slotOnAttr);
  const b = Number(slotForRow);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

function attributeForPersonRow(
  group: EditableFieldGroup,
  personIndex: number,
  kind: "name" | "email" | "phone",
  fixedSlotOrder: string[],
): (typeof group.attributes)[number] | undefined {
  if (group.usesFixedSlots && fixedSlotOrder.length > 0) {
    const slotId = fixedSlotOrder[personIndex];
    if (slotId == null) {
      return undefined;
    }
    return group.attributes.find((a) => slotsMatch(a.slot, slotId) && a.attribute === kind);
  }
  return group.attributes.find((a) => a.attribute === kind);
}

interface ContributorSingleFieldControlProps {
  field: ResolvedFieldValue;
  editableDef: ContributorEditableFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}

export function ContributorSingleFieldControl({
  field,
  editableDef,
  value,
  onChange,
}: ContributorSingleFieldControlProps) {
  const isContact =
    editableDef.columnType === "CONTACT_LIST" || editableDef.columnType === "MULTI_CONTACT_LIST";
  const fieldLabel = editableDef.columnTitle || editableDef.label;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!field.hideLabel && (
          <p className={fieldLabelClassName(field)}>
            {fieldLabel}{" "}
            <span className="rounded-md border border-emerald-200/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Editable
            </span>
          </p>
        )}
        {isContact && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
          >
            Clear this role
          </button>
        )}
      </div>

      {editableDef.columnType === "PICKLIST" && editableDef.options && editableDef.options.length > 0 ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={fieldLabel}
          className={contributorEditControlClass}
        >
          <option value="">Select…</option>
          {editableDef.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : editableDef.columnType === "MULTI_PICKLIST" &&
        editableDef.options &&
        editableDef.options.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="sr-only">{fieldLabel}</legend>
          <p className="text-xs text-[color:var(--wsu-muted)]">
            Select one or more (saved as a comma-separated list).
          </p>
          <div className="flex flex-col gap-2">
            {(() => {
              const selected = new Set(
                value
                  .split(/[,;\n]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              );
              return editableDef.options!.map((option) => (
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
                      const ordered = editableDef.options!.filter((o) => nextSel.has(o));
                      onChange(ordered.join(", "));
                    }}
                    className="h-4 w-4 rounded border-[color:var(--wsu-border)] text-[color:var(--wsu-crimson)]"
                  />
                  <span>{option}</span>
                </label>
              ));
            })()}
          </div>
        </fieldset>
      ) : editableDef.renderType === "multiline_text" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          aria-label={fieldLabel}
          placeholder="Edit text…"
          className={`${contributorEditControlClass} min-h-[7rem] resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={fieldLabel}
          placeholder={value.trim() === "" ? "Click or tap to type…" : undefined}
          className={contributorEditControlClass}
        />
      )}
    </div>
  );
}

interface ContributorGroupFieldControlProps {
  group: EditableFieldGroup;
  persons: MultiPersonEntry[];
  onChange: (persons: MultiPersonEntry[]) => void;
  errors?: Record<number, MultiPersonFieldErrors>;
}

export function ContributorGroupFieldControl({
  group,
  persons,
  onChange,
  errors = {},
}: ContributorGroupFieldControlProps) {
  const fixedSlotCount = countFixedSlotsInEditableGroup(group);
  const fixedSlotOrder = fixedSlotCount > 0 ? slotOrderForEditableGroup(group) : [];
  const hasName = group.attributes.some((a) => a.attribute === "name");
  const hasEmail = group.attributes.some((a) => a.attribute === "email");
  const hasPhone = group.attributes.some((a) => a.attribute === "phone");

  return (
    <div className="space-y-3">
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
          const rowErr = errors[idx];
          const slotId = fixedSlotOrder[idx];
          const nameAttrForRow = attributeForPersonRow(group, idx, "name", fixedSlotOrder);
          const smartsheetSlotTitle = nameAttrForRow?.columnTitle?.trim();
          const positionLabel =
            fixedSlotCount > 0
              ? smartsheetSlotTitle || `${group.label} — ${idx + 1} of ${fixedSlotCount}`
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
                      onChange(persons.filter((_, i) => i !== idx));
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
                    const attr = attributeForPersonRow(group, idx, "name", fixedSlotOrder);
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
                            onChange(next);
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
                    const attr = attributeForPersonRow(group, idx, "email", fixedSlotOrder);
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
                            onChange(next);
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
                    const attr = attributeForPersonRow(group, idx, "phone", fixedSlotOrder);
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
                            onChange(next);
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
                onClick={() => onChange([])}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100"
              >
                Clear everyone
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange([...persons, { name: "", email: "", phone: "" }])}
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

interface ContributorReadOnlyFieldProps {
  field: ResolvedFieldValue;
  labelOverride?: string;
  message?: string;
}

export function ContributorReadOnlyField({
  field,
  labelOverride,
  message,
}: ContributorReadOnlyFieldProps) {
  return (
    <div className="space-y-1">
      {!field.hideLabel && (
        <p className={fieldLabelClassName(field)}>{labelOverride || field.label}</p>
      )}
      {message && <p className="text-xs text-amber-900/90">{message}</p>}
      <div className="text-sm text-[color:var(--wsu-ink)]">
        <FieldValue field={field} stacked />
      </div>
    </div>
  );
}
