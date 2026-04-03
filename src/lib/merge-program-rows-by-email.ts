import { normalizeCampusDisplay, normalizeGroupKey } from "@/lib/campus-grouping";
import type { ResolvedFieldValue, ResolvedViewRow, ViewConfig } from "@/lib/config/types";

function cloneResolvedRow(row: ResolvedViewRow): ResolvedViewRow {
  const fields = row.fields.map((f) => ({
    ...f,
    listValue: [...f.listValue],
    links: f.links.map((l) => ({ ...l })),
    people: f.people?.map((p) => ({ ...p })),
  }));
  return {
    id: row.id,
    fields,
    fieldMap: Object.fromEntries(fields.map((f) => [f.key, f])),
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

export function resolveMergePeopleFieldKey(view: ViewConfig): string | undefined {
  const specified = view.presentation?.mergePeopleFieldKey?.trim();
  if (specified) {
    return specified;
  }
  const peopleFields = view.fields.filter((f) => f.render.type === "people_group");
  if (peopleFields.length === 1) {
    return peopleFields[0]?.key;
  }
  return undefined;
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
 * set of contact emails on the configured people_group field. Campus values are unioned; the
 * campus field text becomes "A; B" for table/print; card layouts can show `mergedCampuses` badges.
 */
export function mergeResolvedRowsByProgramAndEmail(view: ViewConfig, rows: ResolvedViewRow[]): ResolvedViewRow[] {
  const pres = view.presentation;
  if (!pres?.mergeProgramRowsBySharedEmail) {
    return rows;
  }
  const progK = pres.programGroupFieldKey;
  const campusK = pres.campusFieldKey;
  const peopleK = resolveMergePeopleFieldKey(view);
  if (!progK || !campusK || !peopleK) {
    return rows;
  }

  type Bucket = ResolvedViewRow[];
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const emailSig = emailSignatureFromPeopleField(row.fieldMap[peopleK]);
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
