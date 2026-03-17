import type { ResolvedFieldValue, ResolvedView, ResolvedViewRow } from "@/lib/config/types";

function fieldCanRender(field: ResolvedFieldValue) {
  return !(field.hideWhenEmpty && field.isEmpty);
}

export function describeResolvedField(field: ResolvedFieldValue) {
  if (field.textValue) {
    return field.textValue;
  }
  if (field.links.length > 0) {
    return field.links.map((link) => link.label).join(", ");
  }
  if (field.listValue.length > 0) {
    return field.listValue.join(", ");
  }
  return "";
}

export function getVisibleRowFields(row: ResolvedViewRow, omittedKeys: string[] = []) {
  const omitted = new Set(omittedKeys.filter(Boolean));
  return row.fields.filter((field) => !omitted.has(field.key) && fieldCanRender(field));
}

export function getRowHeadingField(view: ResolvedView, row: ResolvedViewRow) {
  const preferred = view.presentation?.headingFieldKey ? row.fieldMap[view.presentation.headingFieldKey] : undefined;
  if (preferred && fieldCanRender(preferred)) {
    return preferred;
  }

  return row.fields.find((field) => fieldCanRender(field)) ?? row.fields[0] ?? null;
}

export function getRowSummaryField(view: ResolvedView, row: ResolvedViewRow, headingKey?: string) {
  const preferredKey = view.presentation?.summaryFieldKey;
  const preferred = preferredKey ? row.fieldMap[preferredKey] : undefined;
  if (preferred && preferred.key !== headingKey && fieldCanRender(preferred)) {
    return preferred;
  }

  return row.fields.find((field) => field.key !== headingKey && fieldCanRender(field)) ?? null;
}

export function getRowHeadingText(view: ResolvedView, row: ResolvedViewRow) {
  const heading = getRowHeadingField(view, row);
  const text = heading ? describeResolvedField(heading) : "";
  return text || `Row ${row.id}`;
}

/** Field used for A-Z index. Uses indexFieldKey if set, else headingFieldKey, else first field. */
export function getIndexField(view: ResolvedView, row: ResolvedViewRow) {
  const key = view.presentation?.indexFieldKey ?? view.presentation?.headingFieldKey;
  const preferred = key ? row.fieldMap[key] : undefined;
  if (preferred && fieldCanRender(preferred)) {
    return preferred;
  }
  return getRowHeadingField(view, row);
}

export function getIndexText(view: ResolvedView, row: ResolvedViewRow) {
  const field = getIndexField(view, row);
  const text = field ? describeResolvedField(field) : "";
  return text || `Row ${row.id}`;
}
