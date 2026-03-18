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

export function DataListDetail({ view }: { view: ResolvedView }) {
  const [activeRowId, setActiveRowId] = useState<number | null>(view.rows[0]?.id ?? null);

  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  const activeRow = view.rows.find((row) => row.id === activeRowId) ?? view.rows[0] ?? null;
  if (!activeRow) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`overflow-hidden rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}>
        <ul className={listDividerClass}>
          {view.rows.map((row) => {
            const rowHeading = getRowHeadingField(view, row);
            const rowSummary = getRowSummaryField(view, row, rowHeading?.key);
            const active = row.id === activeRow.id;

            return (
              <li key={row.id} id={`row-${row.id}`} className="scroll-mt-24">
                <button
                  type="button"
                  onClick={() => setActiveRowId(row.id)}
                  className={`w-full px-4 py-4 text-left transition ${
                    active
                      ? "bg-[color:var(--wsu-crimson)] text-white"
                      : "bg-transparent text-[color:var(--wsu-ink)] hover:bg-[color:var(--wsu-stone)]/50"
                  }`}
                >
                  <p className="font-semibold">{rowHeading ? describeResolvedField(rowHeading) || `Row ${row.id}` : `Row ${row.id}`}</p>
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

      <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="border-b border-[color:var(--wsu-border)] pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">Selected record</p>
          <h3 className="font-view-heading mt-2 text-2xl font-semibold text-[color:var(--wsu-ink)]">{getRowHeadingText(view, activeRow)}</h3>
          {summary && <div className="mt-2 text-sm text-[color:var(--wsu-muted)]"><FieldValue field={summary} /></div>}
        </div>
        {hasCustomCardLayout(view) ? (
          <div className="mt-5 space-y-4">
            {getCardLayoutRows(view, activeRow).map((cells, rowIndex) => {
              const colCount = getCardLayoutColumnCount(view);
              const gridClass = colCount > 1 ? `grid gap-4` : "space-y-4";
              const gridStyle = colCount > 1 ? { gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` } : undefined;
              const paddedCells = colCount > 1 ? [...cells.slice(0, colCount), ...Array(Math.max(0, colCount - cells.length)).fill({ type: "placeholder" as const })] : cells;
              return (
                <div key={rowIndex} className={rowDividerClass(rowIndex)}>
                  <div className={gridClass} style={gridStyle}>
                    {paddedCells.map((cell, i) => (
                      <CardLayoutCellRenderer
                        key={i}
                        rowId={activeRow.id}
                        cell={cell}
                        flexClass={colCount > 1 ? "min-w-0" : "w-full"}
                      />
                    ))}
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
