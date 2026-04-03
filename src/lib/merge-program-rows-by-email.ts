import { normalizeCampusDisplay, normalizeGroupKey } from "@/lib/campus-grouping";
import type { ResolvedFieldValue, ResolvedViewRow, ViewConfig } from "@/lib/config/types";

function cloneResolvedRow(row: ResolvedViewRow): ResolvedViewRow {
  const fields = row.fields.map((f) => ({
    ...f,
    listValue: [...f.listValue],
    links: f.links.map((l) => ({ ...l })),
    people: f.people?.map((p) => ({ ...p })),
  }));
  const fieldMap: ResolvedViewRow["fieldMap"] = { ...row.fieldMap };
  for (const f of fields) {
    fieldMap[f.key] = {
      ...f,
      listValue: [...f.listValue],
      links: f.links.map((l) => ({ ...l })),
      people: f.people?.map((p) => ({ ...p })),
    };
  }
  return {
    id: row.id,
    fields,
    fieldMap,
    mergedSourceRowIds: row.mergedSourceRowIds,
    mergedCampuses: row.mergedCampuses,
  };
}

/** Sorted, deduped, lowercased email signature for merge grouping (all people on the row). */
export function emailSignatureFromPeopleField(field: ResolvedFieldValue | undefined): string {
  if (!field?.people?.length) {
    return "";
  }
  const emails = [
    ...new Set(field.people.map((p) => (p.email ?? "").trim().toLowerCase()).filter(Boolean)),
  ].sort();
  return emails.join("|");
}

/** Union of emails across all configured people_group fields, sorted and joined. */
export function combinedEmailSignatureFromPeopleFields(row: ResolvedViewRow, peopleKeys: string[]): string {
  const allEmails = new Set<string>();
  for (const k of peopleKeys) {
    const field = row.fieldMap[k];
    if (!field?.people?.length) {
      continue;
    }
    for (const p of field.people) {
      const e = (p.email ?? "").trim().toLowerCase();
      if (e) {
        allEmails.add(e);
      }
    }
  }
  return [...allEmails].sort().join("|");
}

const peopleGroupKeys = (view: ViewConfig): string[] =>
  view.fields.filter((f) => f.render.type === "people_group").map((f) => f.key);

/** people_group keys used for merge email matching (explicit list, legacy single key, or sole people field). */
export function resolveMergePeopleFieldKeys(view: ViewConfig): string[] {
  const keys = peopleGroupKeys(view);
  const pres = view.presentation;
  const fromArr = (pres?.mergePeopleFieldKeys ?? []).filter((k) => typeof k === "string" && keys.includes(k));
  if (fromArr.length > 0) {
    return fromArr;
  }
  const legacy = pres?.mergePeopleFieldKey?.trim();
  if (legacy && keys.includes(legacy)) {
    return [legacy];
  }
  if (keys.length === 1) {
    const one = keys[0];
    return one ? [one] : [];
  }
  return [];
}

/** @deprecated Use resolveMergePeopleFieldKeys; returns first key or undefined. */
export function resolveMergePeopleFieldKey(view: ViewConfig): string | undefined {
  return resolveMergePeopleFieldKeys(view)[0];
}

function buildMergedRow(bucket: ResolvedViewRow[], campusKey: string): ResolvedViewRow {
  const primary = bucket[0];
  if (!primary) {
    throw new Error("mergeResolvedRows: empty bucket");
  }
  const all = bucket;
  const campusSet = new Set<string>();
  for (const r of all) {
    const raw = r.fieldMap[campusKey]?.textValue ?? "";
    campusSet.add(normalizeCampusDisplay(raw));
  }
  const campuses = [...campusSet].sort((a, b) => a.localeCompare(b, "en"));
  const dup = cloneResolvedRow(primary);
  const campusField = dup.fieldMap[campusKey];
  if (campusField) {
    const updated: ResolvedFieldValue = {
      ...campusField,
      textValue: campuses.join("; "),
      listValue: campuses.length ? [...campuses] : [...campusField.listValue],
      isEmpty: campuses.length === 0,
    };
    dup.fields = dup.fields.map((f) => (f.key === campusKey ? updated : f));
    dup.fieldMap = { ...dup.fieldMap, [campusKey]: updated };
  }
  dup.mergedSourceRowIds = all.map((r) => r.id);
  dup.mergedCampuses = campuses;
  return dup;
}

/**
 * Collapse multiple resolved rows when they share the same program (normalized) and the same
 * combined contact emails on the configured people_group fields. Campus values are unioned; the
 * campus field text becomes "A; B" for table/print; card layouts can show `mergedCampuses` badges.
 */
function mergeResolvedRowsBySharedEmail(view: ViewConfig, rows: ResolvedViewRow[]): ResolvedViewRow[] {
  const pres = view.presentation;
  const progK = pres?.programGroupFieldKey;
  const campusK = pres?.campusFieldKey;
  const peopleKeys = resolveMergePeopleFieldKeys(view);
  if (!progK || !campusK || peopleKeys.length === 0) {
    return rows;
  }

  type Bucket = ResolvedViewRow[];
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const emailSig = combinedEmailSignatureFromPeopleFields(row, peopleKeys);
    const programRaw = row.fieldMap[progK]?.textValue ?? "";
    const progNorm = normalizeGroupKey(programRaw);
    const key = emailSig ? `${progNorm}\u0000${emailSig}` : `__single__\u0000${row.id}`;
    const list = buckets.get(key);
    if (list) {
      list.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const out: ResolvedViewRow[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.length === 1) {
      const one = bucket[0];
      if (one) out.push(one);
    } else {
      out.push(buildMergedRow(bucket, campusK));
    }
  }

  return out;
}

/**
 * Collapse rows that share the same normalized program and the same campus (picklist) value.
 * Blank campus never merges with other rows. Multiple sheet rows with the same program+campus become one display row.
 */
function mergeResolvedRowsByProgramAndCampus(view: ViewConfig, rows: ResolvedViewRow[]): ResolvedViewRow[] {
  const pres = view.presentation;
  const progK = pres?.programGroupFieldKey;
  const campusK = pres?.campusFieldKey;
  if (!progK || !campusK) {
    return rows;
  }

  type Bucket = ResolvedViewRow[];
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const programRaw = row.fieldMap[progK]?.textValue ?? "";
    const campusRaw = row.fieldMap[campusK]?.textValue ?? "";
    const progNorm = normalizeGroupKey(programRaw);
    const campusTrim = campusRaw.trim();
    const key =
      campusTrim.length > 0
        ? `${progNorm}\u0000${normalizeCampusDisplay(campusRaw)}`
        : `__single__\u0000${row.id}`;
    const list = buckets.get(key);
    if (list) {
      list.push(row);
    } else {
      buckets.set(key, [row]);
    }
  }

  const out: ResolvedViewRow[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.length === 1) {
      const one = bucket[0];
      if (one) out.push(one);
    } else {
      out.push(buildMergedRow(bucket, campusK));
    }
  }

  return out;
}

/**
 * Row merge for program-centric views: either by shared contact emails (multi-campus same person) or by
 * identical program + campus (e.g. duplicate Smartsheet lines for same offering).
 */
export function mergeResolvedRowsByProgramAndEmail(view: ViewConfig, rows: ResolvedViewRow[]): ResolvedViewRow[] {
  const pres = view.presentation;
  if (pres?.mergeProgramRowsByProgramAndCampus) {
    return mergeResolvedRowsByProgramAndCampus(view, rows);
  }
  if (!pres?.mergeProgramRowsBySharedEmail) {
    return rows;
  }
  return mergeResolvedRowsBySharedEmail(view, rows);
}
