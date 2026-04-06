import type { ResolvedFieldValue, ResolvedView, ResolvedViewRow, ViewConfig } from "@/lib/config/types";
import { splitTokens } from "@/lib/transforms";

/** Default status tokens that trigger hiding file/link fields (case-insensitive). */
export const DEFAULT_RECORD_SUPPRESSED_FILE_STATUS_VALUES = ["hide", "delete"];

export function normalizeRecordSuppressionStatusValues(
  configured: string[] | undefined,
): string[] {
  const raw = configured?.length ? configured : DEFAULT_RECORD_SUPPRESSED_FILE_STATUS_VALUES;
  return [...new Set(raw.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

/** True when any token in the status cell matches a configured suppression value. */
export function statusRawTriggersRecordSuppression(
  raw: string | undefined,
  configuredValues: string[] | undefined,
): boolean {
  const triggers = normalizeRecordSuppressionStatusValues(configuredValues);
  if (!triggers.length) {
    return false;
  }
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return false;
  }
  const tokens = splitTokens(trimmed);
  const toCheck = tokens.length > 0 ? tokens : [trimmed];
  return toCheck.some((t) => triggers.includes(t.trim().toLowerCase()));
}

function redactResolvedField(field: ResolvedFieldValue): ResolvedFieldValue {
  return {
    ...field,
    textValue: "",
    listValue: [],
    links: [],
    isEmpty: true,
  };
}

/** Field keys whose link/value content is cleared when a row is status-suppressed. */
export function buildRecordSuppressionRedactFieldKeySet(view: ViewConfig): Set<string> {
  const explicit = view.presentation?.recordSuppressedFileRedactFieldKeys?.filter(Boolean) ?? [];
  if (explicit.length > 0) {
    return new Set(explicit);
  }
  return new Set(view.fields.filter((f) => f.render.type === "link").map((f) => f.key));
}

/**
 * When `recordSuppressedFileStatusFieldKey` matches Hide/Delete (or custom values),
 * clears configured link fields for public display and flags the row for collapsed UI.
 */
export function applyRecordSuppressionToResolvedRow(view: ViewConfig, row: ResolvedViewRow): ResolvedViewRow {
  const pres = view.presentation;
  const statusKey = pres?.recordSuppressedFileStatusFieldKey;
  if (!statusKey) {
    return row;
  }
  const statusField = row.fieldMap[statusKey];
  if (!statusField) {
    return row;
  }
  const raw = statusField.textValue ?? "";
  if (!statusRawTriggersRecordSuppression(raw, pres.recordSuppressedFileStatusValues)) {
    return row;
  }

  const redactKeys = buildRecordSuppressionRedactFieldKeySet(view);
  const redactedFieldKeys = [...redactKeys];

  const nextFieldMap: ResolvedViewRow["fieldMap"] = { ...row.fieldMap };
  for (const key of redactKeys) {
    const f = nextFieldMap[key];
    if (f) {
      nextFieldMap[key] = redactResolvedField(f);
    }
  }

  let fields = row.fields.map((f) => (redactKeys.has(f.key) ? redactResolvedField(f) : f));

  const hideStatusInBody = pres.recordSuppressedFileHideStatusFieldInPublicBody !== false;
  if (hideStatusInBody) {
    fields = fields.filter((f) => f.key !== statusKey);
  }

  const statusDisplay = raw.trim() || "Restricted";

  return {
    ...row,
    fields,
    fieldMap: nextFieldMap,
    recordSuppression: {
      statusDisplay,
      redactedFieldKeys,
      statusFieldKey: statusKey,
    },
  };
}

export function applyRecordSuppressionToResolvedRows(
  view: ViewConfig,
  rows: ResolvedViewRow[],
): ResolvedViewRow[] {
  if (!view.presentation?.recordSuppressedFileStatusFieldKey) {
    return rows;
  }
  return rows.map((r) => applyRecordSuppressionToResolvedRow(view, r));
}

/**
 * Strip rows flagged with `recordSuppression` (Hide/Delete status, etc.) for anonymous public URLs,
 * print, and public JSON. Contributors and admins receive the full resolved view instead.
 */
export function omitRecordSuppressedRowsFromResolvedView(view: ResolvedView): ResolvedView {
  const rows = view.rows.filter((r) => !r.recordSuppression);
  if (rows.length === view.rows.length) {
    return view;
  }
  return { ...view, rows, rowCount: rows.length };
}
