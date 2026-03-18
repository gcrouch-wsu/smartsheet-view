"use client";

import { useState } from "react";
import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { describeResolvedField, getCardLayoutColumnCount, getCardLayoutRows, getRowHeadingField, getRowHeadingText, getRowSummaryField, getVisibleRowFields, hasCustomCardLayout } from "@/components/public/layout-utils";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";

function FieldBlock({ rowId, field }: { rowId: number; field: ResolvedFieldValue }) {
  return (
    <div key={`${rowId}-${field.key}`} className="space-y-1">
      {!field.hideLabel && (
        <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}

function findSelectedRow(view: ResolvedView, rowId: number | null) {
  return view.rows.find((row) => row.id === rowId) ?? view.rows[0] ?? null;
}

export function DataTabbed({ view }: { view: ResolvedView }) {
  const [activeRowId, setActiveRowId] = useState<number | null>(view.rows[0]?.id ?? null);

  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  const activeRow = findSelectedRow(view, activeRowId);
  if (!activeRow) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {view.rows.map((row) => {
          const active = row.id === activeRow.id;
          const rowHeading = getRowHeadingField(view, row);
          const label = rowHeading ? describeResolvedField(rowHeading) || `Row ${row.id}` : `Row ${row.id}`;

          return (
            <button
              key={row.id}
              id={`row-${row.id}`}
              type="button"
              onClick={() => setActiveRowId(row.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                  : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <article className={`rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}>
        <div className="border-b border-[color:var(--wsu-border)] pb-4">
          <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">Selected record</p>
          <h3 className="font-view-heading mt-2 text-2xl font-semibold text-[color:var(--wsu-ink)]">{getRowHeadingText(view, activeRow)}</h3>
          {summary && <div className="mt-2 text-sm text-[color:var(--wsu-muted)]"><FieldValue field={summary} /></div>}
        </div>
        {hasCustomCardLayout(view) ? (
          <div className="mt-5 space-y-4">
            {getCardLayoutRows(view, activeRow).map((cells, rowIndex) => {
              const colCount = getCardLayoutColumnCount(view);
              const useAlignedGrid = colCount > 1;
              const gridClass = useAlignedGrid ? "grid gap-4" : "space-y-4";
              const gridStyle = useAlignedGrid
                ? { gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gridTemplateRows: "auto auto" }
                : undefined;
              const paddedCells = useAlignedGrid ? [...cells.slice(0, colCount), ...Array(Math.max(0, colCount - cells.length)).fill({ type: "placeholder" as const })] : cells;
              return (
                <div key={rowIndex} className={rowDividerClass(rowIndex)}>
                  <div className={gridClass} style={gridStyle}>
                    {useAlignedGrid ? (
                      <>
                        {paddedCells.map((cell, i) => (
                          <CardLayoutCellRenderer key={`h-${i}`} rowId={activeRow.id} cell={cell} flexClass="min-w-0" mode="header" />
                        ))}
                        {paddedCells.map((cell, i) => (
                          <CardLayoutCellRenderer key={`v-${i}`} rowId={activeRow.id} cell={cell} flexClass="min-w-0" mode="value" />
                        ))}
                      </>
                    ) : (
                      paddedCells.map((cell, i) => (
                        <CardLayoutCellRenderer key={i} rowId={activeRow.id} cell={cell} flexClass="w-full" />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
              <div className="space-y-1">
                {!heading.hideLabel && (
                  <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{heading.label}</p>
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
