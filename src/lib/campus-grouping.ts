import type { ResolvedViewRow } from "@/lib/config/types";
import { slugify } from "@/lib/utils";

/** One program (or empty-key bucket) with all underlying Smartsheet rows preserved. */
export interface ProgramGroup {
  /** Stable id from normalized program key — use for DOM anchors (e.g. A–Z jump: `group-${id}`). */
  id: string;
  /** Display name; text from the first row in source order for this group. */
  label: string;
  /** Distinct campus labels (canonical display, deduped, sorted). */
  campuses: string[];
  rows: ResolvedViewRow[];
}

const CAMPUS_LABEL_BY_NORMALIZED: Record<string, string> = {
  pullman: "Pullman",
  spokane: "Spokane",
  "tri-cities": "Tri-Cities",
  "tri cities": "Tri-Cities",
  vancouver: "Vancouver",
  everett: "Everett",
  global: "Global Campus",
  "global campus": "Global Campus",
  "global campus (online)": "Global Campus",
};

/** Trim + lowercase for program identity grouping (not for display). */
export function normalizeGroupKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Normalize sheet campus text for badges and filter chips.
 * Empty → "Unspecified". Unknown values keep trimmed original text.
 */
export function normalizeCampusDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "Unspecified";
  }
  const key = t.toLowerCase();
  return CAMPUS_LABEL_BY_NORMALIZED[key] ?? t;
}

function rowFieldText(row: ResolvedViewRow, fieldKey: string): string {
  return row.fieldMap[fieldKey]?.textValue?.trim() ?? "";
}

/**
 * Group flat resolved rows by program field; collect campus union per group.
 * Preserves row order within each group and first-seen group order.
 */
export function groupResolvedRows(
  rows: ResolvedViewRow[],
  programGroupFieldKey: string,
  campusFieldKey: string,
): ProgramGroup[] {
  type Bucket = { label: string; norm: string; rows: ResolvedViewRow[] };
  const order: string[] = [];
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const rawProgram = rowFieldText(row, programGroupFieldKey);
    const norm = normalizeGroupKey(rawProgram);
    const bucketKey = norm || "__empty__";

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = { label: rawProgram || "—", norm, rows: [] };
      buckets.set(bucketKey, bucket);
      order.push(bucketKey);
    }
    bucket.rows.push(row);
  }

  const groups: ProgramGroup[] = [];
  for (const key of order) {
    const bucket = buckets.get(key)!;
    const campusSet = new Set<string>();
    for (const r of bucket.rows) {
      campusSet.add(normalizeCampusDisplay(rowFieldText(r, campusFieldKey)));
    }
    const campuses = [...campusSet].sort((a, b) => a.localeCompare(b, "en"));
    const id = key === "__empty__" ? "no-program" : slugify(bucket.norm || "no-program");
    groups.push({
      id,
      label: bucket.label,
      campuses,
      rows: bucket.rows,
    });
  }

  return groups;
}

/** True when the view config requests on-screen campus/program grouping. */
export function isCampusGroupingActive(presentation: {
  campusGroupingMode?: string;
  programGroupFieldKey?: string;
  campusFieldKey?: string;
} | undefined): boolean {
  return Boolean(
    presentation?.campusGroupingMode === "grouped" &&
      presentation?.programGroupFieldKey &&
      presentation?.campusFieldKey,
  );
}
