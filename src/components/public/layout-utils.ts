import type { CSSProperties } from "react";
import { resolvedRowCampusBadgeLabels } from "@/lib/campus-grouping";
import {
  CARD_LAYOUT_CAMPUS_BADGES,
  CARD_LAYOUT_PLACEHOLDER,
  CARD_LAYOUT_TEXT_PREFIX,
  type CampusBadgePresentationStyle,
  type ResolvedFieldValue,
  type ResolvedView,
  type ResolvedViewRow,
} from "@/lib/config/types";

export type CardLayoutCell =
  | { type: "field"; field: ResolvedFieldValue }
  | { type: "placeholder" }
  | { type: "text"; label: string }
  | { type: "campus_badges"; campuses: string[]; style?: CampusBadgePresentationStyle };

function fieldCanRender(field: ResolvedFieldValue) {
  return !(field.hideWhenEmpty && field.isEmpty);
}

/** Minimal resolved field for contributor edit ordering when a cell is empty or hidden on the public card. */
export function buildStubResolvedField(view: ResolvedView, key: string): ResolvedFieldValue | null {
  const meta = view.fields.find((f) => f.key === key);
  if (!meta) {
    return null;
  }
  const base: ResolvedFieldValue = {
    key: meta.key,
    label: meta.label,
    renderType: meta.renderType,
    textValue: "",
    listValue: [],
    links: [],
    isEmpty: true,
    hideWhenEmpty: false,
    hideLabel: false,
    textStyle: meta.textStyle,
    labelStyle: meta.labelStyle,
  };
  if (meta.renderType === "people_group") {
    base.people = [];
    base.listDisplay = "inline";
    base.peopleStyle = "plain";
  }
  return base;
}

export function describeResolvedField(field: ResolvedFieldValue) {
  if (field.renderType === "people_group" && field.people?.some((p) => !p.isEmpty)) {
    return field.people
      .filter((p) => !p.isEmpty)
      .map((p) => [p.name, p.email, p.phone].filter(Boolean).join(" "))
      .join("; ");
  }
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
export function getCardLayoutRows(
  view: ResolvedView,
  row: ResolvedViewRow,
  options?: { contributorFieldKeys?: Set<string> },
): CardLayoutCell[][] {
  const layout = view.presentation?.cardLayout;
  if (!layout || layout.length === 0) {
    return [];
  }
  const contrib = options?.contributorFieldKeys;

  return layout
    .map((layoutRow) =>
      layoutRow.fieldKeys.map((key): CardLayoutCell => {
        if (key === CARD_LAYOUT_PLACEHOLDER) {
          return { type: "placeholder" };
        }
        if (key.startsWith(CARD_LAYOUT_TEXT_PREFIX)) {
          return { type: "text", label: key.slice(CARD_LAYOUT_TEXT_PREFIX.length) };
        }
        if (key === CARD_LAYOUT_CAMPUS_BADGES) {
          const campuses = resolvedRowCampusBadgeLabels(row, view.presentation?.campusFieldKey);
          return {
            type: "campus_badges",
            campuses,
            style: view.presentation?.campusBadgeStyle,
          };
        }
        const campusKey = view.presentation?.campusFieldKey;
        if (campusKey && key === campusKey && view.presentation?.hideCampusFieldInRecordDisplay === true) {
          return { type: "placeholder" };
        }
        const field = row.fieldMap[key];
        if (field && (fieldCanRender(field) || (contrib?.has(key) ?? false))) {
          return { type: "field", field };
        }
        if (contrib?.has(key)) {
          const stub = buildStubResolvedField(view, key);
          if (stub) {
            return { type: "field", field: stub };
          }
        }
        // Field absent or hidden: keep a placeholder so column positions stay aligned
        return { type: "placeholder" };
      })
    )
    .filter((cells) =>
      cells.some(
        (c) =>
          c.type === "field" ||
          c.type === "text" ||
          (c.type === "campus_badges" && c.campuses.length > 0),
      ),
    );
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

/**
 * Field order for the contributor edit drawer: mirrors public card order (custom layout or heading/summary/body)
 * and keeps contributor-target fields even when the card would hide them as empty.
 */
export function getEditDrawerOrderedFields(
  view: ResolvedView,
  row: ResolvedViewRow,
  contributorFieldKeys: Set<string>,
): ResolvedFieldValue[] {
  const shouldShow = (field: ResolvedFieldValue) =>
    contributorFieldKeys.has(field.key) || fieldCanRender(field);

  const appendMissingContributorFields = (ordered: ResolvedFieldValue[]) => {
    const seen = new Set(ordered.map((f) => f.key));
    for (const key of contributorFieldKeys) {
      if (seen.has(key)) continue;
      const field = row.fieldMap[key] ?? buildStubResolvedField(view, key);
      if (field && shouldShow(field)) {
        ordered.push(field);
        seen.add(key);
      }
    }
    return ordered;
  };

  if (hasCustomCardLayout(view)) {
    const rows = getCardLayoutRows(view, row, { contributorFieldKeys });
    const out: ResolvedFieldValue[] = [];
    const seenKeys = new Set<string>();
    for (const cells of rows) {
      for (const cell of cells) {
        if (cell.type === "field" && shouldShow(cell.field)) {
          if (seenKeys.has(cell.field.key)) {
            continue;
          }
          seenKeys.add(cell.field.key);
          out.push(cell.field);
        }
      }
    }
    return appendMissingContributorFields(out);
  }

  const heading = getRowHeadingField(view, row);
  const summary = getRowSummaryField(view, row, heading?.key);
  const out: ResolvedFieldValue[] = [];
  if (heading && shouldShow(heading)) {
    out.push(heading);
  }
  if (summary && summary.key !== heading?.key && shouldShow(summary)) {
    out.push(summary);
  }
  for (const field of row.fields) {
    if (field.key === heading?.key || field.key === summary?.key) {
      continue;
    }
    if (shouldShow(field)) {
      out.push(field);
    }
  }
  return appendMissingContributorFields(out);
}

/**
 * Resolves the display row for a tab/list selection when `rowId` is either the merged row id
 * or a Smartsheet source row id absorbed into a merge.
 */
export function findResolvedViewRowByIdOrMergedSource(
  rows: ResolvedViewRow[],
  rowId: number | null,
): ResolvedViewRow | null {
  if (rows.length === 0) {
    return null;
  }
  if (rowId == null) {
    return rows[0] ?? null;
  }
  return rows.find((row) => row.id === rowId || row.mergedSourceRowIds?.includes(rowId)) ?? rows[0] ?? null;
}

/** Minimum width per custom card column so multi-column layouts scroll on narrow viewports instead of collapsing. */
export const CUSTOM_CARD_COL_MIN_REM = 9;

/** Grid style for aligned custom card rows (header row + value row). */
export function customCardAlignedGridStyle(colCount: number): CSSProperties | undefined {
  if (colCount <= 1) {
    return undefined;
  }
  return {
    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
    gridTemplateRows: "auto auto",
    minWidth: `${colCount * CUSTOM_CARD_COL_MIN_REM}rem`,
  };
}

/**
 * Outer wrapper for horizontal scroll when the inner grid is wider than the card
 * (typical on phones for multi-column custom layouts).
 */
export function customCardGridScrollWrapClassName(useAlignedGrid: boolean): string | undefined {
  if (!useAlignedGrid) {
    return undefined;
  }
  return "min-w-0 -mx-1 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain px-1 [scrollbar-gutter:stable]";
}
