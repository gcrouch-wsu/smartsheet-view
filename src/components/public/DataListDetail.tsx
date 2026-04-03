"use client";

import { useState } from "react";
import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { DataStacked } from "@/components/public/DataStacked";
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
import type { ProgramGroup } from "@/lib/campus-grouping";
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

export function DataListDetail({
  view,
  programGroups,
  editableRowIds,
  onEditRow,
}: {
  view: ResolvedView;
  programGroups?: ProgramGroup[];
  editableRowIds?: Set<number>;
  onEditRow?: (rowId: number, triggerElement?: HTMLElement | null) => void;
}) {
  const [activeRowId, setActiveRowId] = useState<number | null>(view.rows[0]?.id ?? null);

  if (programGroups && programGroups.length > 0) {
    return <DataStacked view={view} programGroups={programGroups} editableRowIds={editableRowIds} onEditRow={onEditRow} />;
  }

  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  const activeRow = view.rows.find((row) => row.id === activeRowId) ?? view.rows[0] ?? null;
  if (!activeRow) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }
  const activeRowEditable = editableRowIds?.has(activeRow.id) ?? false;

  const heading = getRowHeadingField(view, activeRow);
  const summary = getRowSummaryField(view, activeRow, heading?.key);
  const bodyFields = getVisibleRowFields(activeRow, [heading?.key ?? "", summary?.key ?? ""]);

  const dividerStyle = view.presentation?.rowDividerStyle ?? "default";
  const listDividerClass =
    dividerStyle === "none" ? "" : dividerStyle === "subtle" ? "divide-y divide-[color:var(--wsu-border)]/40" : "divide-y divide-[color:var(--wsu-border)]/70";
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

  const detailTitleId = `list-detail-record-title-${activeRow.id}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        aria-label="Records list"
        className={`overflow-hidden rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
      >
        <ul className={listDividerClass}>
          {view.rows.map((row) => {
            const rowHeading = getRowHeadingField(view, row);
            const rowSummary = getRowSummaryField(view, row, rowHeading?.key);
            const active = row.id === activeRow.id;
            const isEditable = editableRowIds?.has(row.id) ?? false;

            return (
              <li key={row.id} id={`row-${row.id}`} className="scroll-mt-24">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveRowId(row.id)}
                  className={`w-full px-4 py-4 text-left transition ${
                    active
                      ? "bg-[color:var(--wsu-crimson)] text-white"
                      : "bg-transparent text-[color:var(--wsu-ink)] hover:bg-[color:var(--wsu-stone)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{rowHeading ? describeResolvedField(rowHeading) || `Row ${row.id}` : `Row ${row.id}`}</p>
                    {isEditable && <ContributorEditableBadge className={active ? "bg-white/15 text-white" : ""} />}
                  </div>
                  {rowSummary && (
                    <p className={`mt-1 text-sm ${active ? "text-white/85" : "text-[color:var(--wsu-muted)]"}`}>
                      {describeResolvedField(rowSummary) || rowSummary.label}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <article aria-labelledby={detailTitleId} className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Selected record: {getRowHeadingText(view, activeRow)}
        </p>
        <div className="border-b border-[color:var(--wsu-border)] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="view-field-label text-[color:var(--wsu-muted)]">Selected record</p>
              <h3 id={detailTitleId} className="view-row-heading mt-2">
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
