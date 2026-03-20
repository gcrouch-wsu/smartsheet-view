import { CARD_LAYOUT_PLACEHOLDER, CARD_LAYOUT_TEXT_PREFIX } from "@/lib/config/types";
import type { ResolvedFieldValue, ResolvedView, ResolvedViewRow } from "@/lib/config/types";

export type CardLayoutCell =
  | { type: "field"; field: ResolvedFieldValue }
  | { type: "placeholder" }
  | { type: "text"; label: string };

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

/**
 * Human-friendly title for the contributor edit drawer. Uses the same heading field as list/cards;
 * does not use the raw Smartsheet row id as the visible label (that id stays in sr-only for support).
 */
export function getContributorEditRowHeading(view: ResolvedView, row: ResolvedViewRow) {
  const heading = getRowHeadingField(view, row);
  const text = heading ? describeResolvedField(heading).trim() : "";
  if (text) {
    return text;
  }
  return null;
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

/** When cardLayout is set, returns cells grouped by row. Each cell is field, placeholder, or static text. Skips rows with no fields. */
export function getCardLayoutRows(view: ResolvedView, row: ResolvedViewRow): CardLayoutCell[][] {
  const layout = view.presentation?.cardLayout;
  if (!layout || layout.length === 0) {
    return [];
  }

  return layout
    .map((layoutRow) =>
      layoutRow.fieldKeys.map((key): CardLayoutCell | null => {
        if (key === CARD_LAYOUT_PLACEHOLDER) {
          return { type: "placeholder" };
        }
        if (key.startsWith(CARD_LAYOUT_TEXT_PREFIX)) {
          return { type: "text", label: key.slice(CARD_LAYOUT_TEXT_PREFIX.length) };
        }
        const field = row.fieldMap[key];
        if (field && fieldCanRender(field)) {
          return { type: "field", field };
        }
        return null;
      }).filter((c): c is CardLayoutCell => c != null)
    )
    .filter((cells) => cells.some((c) => c.type === "field" || c.type === "text"));
}

/** Get first field from a row of cells (for accordion/tabbed summary). */
export function getFirstFieldFromCells(cells: CardLayoutCell[]): ResolvedFieldValue | null {
  const cell = cells.find((c) => c.type === "field");
  return cell?.type === "field" ? cell.field : null;
}

/** Max number of columns across all card layout rows (for grid alignment). */
export function getCardLayoutColumnCount(view: ResolvedView): number {
  const layout = view.presentation?.cardLayout;
  if (!layout || layout.length === 0) return 0;
  return Math.max(...layout.map((row) => row.fieldKeys.length), 0);
}

/** Whether the view uses custom card layout. */
export function hasCustomCardLayout(view: ResolvedView): boolean {
  const layout = view.presentation?.cardLayout;
  return Boolean(layout && layout.length > 0);
}
