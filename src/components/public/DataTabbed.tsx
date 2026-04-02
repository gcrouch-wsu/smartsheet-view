"use client";

import { useState } from "react";
import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { ContributorEditButton, ContributorEditableBadge } from "@/components/public/ContributorRowControls";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import {
  customCardAlignedGridStyle,
  customCardGridScrollWrapClassName,
  describeResolvedField,
  getCardLayoutColumnCount,
  getCardLayoutRows,
  getRowHeadingField,
  getRowHeadingText,
  getRowSummaryField,
  getVisibleRowFields,
  hasCustomCardLayout,
} from "@/components/public/layout-utils";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";
import { fieldLabelClassName } from "@/lib/field-typography";

function FieldBlock({ rowId, field }: { rowId: number; field: ResolvedFieldValue }) {
  return (
    <div key={`${rowId}-${field.key}`} className="space-y-1">
      {!field.hideLabel && (
        <p className={fieldLabelClassName(field)}>{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}

function findSelectedRow(view: ResolvedView, rowId: number | null) {
  return view.rows.find((row) => row.id === rowId) ?? view.rows[0] ?? null;
}

export function DataTabbed({
  view,
  editableRowIds,
  onEditRow,
}: {
  view: ResolvedView;
  editableRowIds?: Set<number>;
  onEditRow?: (rowId: number, triggerElement?: HTMLElement | null) => void;
}) {
  const [activeRowId, setActiveRowId] = useState<number | null>(view.rows[0]?.id ?? null);

  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  const activeRow = findSelectedRow(view, activeRowId);
  if (!activeRow) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }
  const activeRowEditable = editableRowIds?.has(activeRow.id) ?? false;

  const heading = getRowHeadingField(view, activeRow);
  const summary = getRowSummaryField(view, activeRow, heading?.key);
  const bodyFields = getVisibleRowFields(activeRow, [heading?.key ?? "", summary?.key ?? ""]);

  const dividerStyle = view.presentation?.rowDividerStyle ?? "default";
  const cardBorderClass =
    dividerStyle === "none" ? "border-0" : dividerStyle === "subtle" ? "border border-[color:var(--wsu-border)]/40" : "border border-[color:var(--wsu-border)]";
  const rowDividerClass = (rowIndex: number) =>
    rowIndex > 0
      ? dividerStyle === "none"
        ? "pt-4"
        : dividerStyle === "subtle"
          ? "border-t border-[color:var(--wsu-border)]/40 pt-4"
          : "border-t border-[color:var(--wsu-border)] pt-4"
      : "";

  const detailPanelId = "record-tabbed-detail-panel";

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Records" className="flex flex-wrap gap-2">
        {view.rows.map((row) => {
          const active = row.id === activeRow.id;
          const isEditable = editableRowIds?.has(row.id) ?? false;
          const rowHeading = getRowHeadingField(view, row);
          const label = rowHeading ? describeResolvedField(rowHeading) || `Row ${row.id}` : `Row ${row.id}`;

          return (
            <button
              key={row.id}
              id={`row-${row.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={detailPanelId}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveRowId(row.id)}
              className={active ? "view-control-active px-4 py-2 text-sm font-medium" : isEditable ? "view-control-primary px-4 py-2 text-sm font-medium" : "view-control px-4 py-2 text-sm font-medium"}
            >
              {label}
            </button>
          );
        })}
      </div>

      <article
        role="tabpanel"
        id={detailPanelId}
        aria-labelledby={`row-${activeRow.id}`}
        className={`rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Selected: {getRowHeadingText(view, activeRow)}
        </p>
        <div className="border-b border-[color:var(--wsu-border)] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="view-field-label text-[color:var(--wsu-muted)]">Selected record</p>
              <h3 className="view-row-heading mt-2">
                {getRowHeadingText(view, activeRow)}
              </h3>
              {summary && <div className="mt-2 text-sm text-[color:var(--wsu-muted)]"><FieldValue field={summary} /></div>}
            </div>
            {activeRowEditable && (
              <div className="flex items-center gap-2">
                <ContributorEditableBadge />
                <ContributorEditButton rowId={activeRow.id} onEditRow={onEditRow} />
              </div>
            )}
          </div>
        </div>
        {hasCustomCardLayout(view) ? (
          <div className="mt-5 space-y-4">
            {getCardLayoutRows(view, activeRow).map((cells, rowIndex) => {
              const colCount = getCardLayoutColumnCount(view);
              const useAlignedGrid = colCount > 1;
              const gridClass = useAlignedGrid ? "grid gap-4" : "space-y-4";
              const gridStyle = useAlignedGrid ? customCardAlignedGridStyle(colCount) : undefined;
              const scrollWrap = customCardGridScrollWrapClassName(useAlignedGrid);
              const paddedCells = useAlignedGrid ? [...cells.slice(0, colCount), ...Array(Math.max(0, colCount - cells.length)).fill({ type: "placeholder" as const })] : cells;
              const gridInner = (
                <div className={gridClass} style={gridStyle}>
                  {useAlignedGrid ? (
                    <>
                      {paddedCells.map((cell, i) => (
                        <CardLayoutCellRenderer key={`h-${i}`} cell={cell} flexClass="min-w-0" mode="header" />
                      ))}
                      {paddedCells.map((cell, i) => (
                        <CardLayoutCellRenderer key={`v-${i}`} cell={cell} flexClass="min-w-0" mode="value" />
                      ))}
                    </>
                  ) : (
                    paddedCells.map((cell, i) => (
                      <CardLayoutCellRenderer key={i} cell={cell} flexClass="w-full" />
                    ))
                  )}
                </div>
              );
              return (
                <div key={rowIndex} className={rowDividerClass(rowIndex)}>
                  {scrollWrap ? <div className={scrollWrap}>{gridInner}</div> : gridInner}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
              <div className="space-y-1">
                {!heading.hideLabel && (
                  <p className={fieldLabelClassName(heading)}>{heading.label}</p>
                )}
                <FieldValue field={heading} stacked />
              </div>
            )}
            {bodyFields.map((field) => (
              <FieldBlock key={`${activeRow.id}-${field.key}`} rowId={activeRow.id} field={field} />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
