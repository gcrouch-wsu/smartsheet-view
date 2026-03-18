import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { describeResolvedField, getCardLayoutRows, getFirstFieldFromCells, getRowHeadingField, getRowHeadingText, getRowSummaryField, getVisibleRowFields, hasCustomCardLayout } from "@/components/public/layout-utils";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";

function FieldBlock({ rowId, field }: { rowId: number; field: ResolvedFieldValue }) {
  return (
    <div key={`${rowId}-${field.key}`} className="space-y-1">
      {!field.hideLabel && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}

export function DataAccordion({ view }: { view: ResolvedView }) {
  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  const dividerStyle = view.presentation?.rowDividerStyle ?? "default";
  const cardBorderClass =
    dividerStyle === "none" ? "border-0" : dividerStyle === "subtle" ? "border border-[color:var(--wsu-border)]/40" : "border border-[color:var(--wsu-border)]";
  const innerBorderClass = dividerStyle === "none" ? "border-transparent" : dividerStyle === "subtle" ? "border-[color:var(--wsu-border)]/40" : "border-[color:var(--wsu-border)]";
  const rowDividerClass = (rowIndex: number) =>
    rowIndex > 0 ? (dividerStyle === "none" ? "mt-4 pt-4" : `mt-4 border-t ${innerBorderClass} pt-4`) : "";

  return (
    <div className="space-y-3">
      {view.rows.map((row, index) => {
        const customRows = hasCustomCardLayout(view) ? getCardLayoutRows(view, row) : [];

        if (customRows.length > 0) {
          const firstRowCells = customRows[0] ?? [];
          const firstField = getFirstFieldFromCells(firstRowCells);
          const secondField = firstRowCells.find((c) => c.type === "field" && c.field.key !== firstField?.key);
          const summaryField = secondField?.type === "field" ? secondField.field : null;
          return (
            <details
              key={row.id}
              id={`row-${row.id}`}
              open={index === 0}
              className={`group scroll-mt-24 overflow-hidden rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="text-lg font-semibold text-[color:var(--wsu-ink)]">
                    {firstField ? describeResolvedField(firstField) : getRowHeadingText(view, row)}
                  </p>
                  {summaryField && (
                    <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{describeResolvedField(summaryField) || summaryField.label}</p>
                  )}
                </div>
                <span className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)] group-open:border-[color:var(--wsu-crimson)] group-open:text-[color:var(--wsu-crimson)]">
                  {index === 0 ? "Open" : "Expand"}
                </span>
              </summary>
              <div className={`border-t ${innerBorderClass} px-5 py-5`}>
                {customRows.map((cells, rowIndex) => (
                  <div key={rowIndex} className={rowDividerClass(rowIndex)}>
                    <div className="flex flex-wrap gap-4">
                      {cells.map((cell, i) => (
                        <CardLayoutCellRenderer
                          key={i}
                          rowId={row.id}
                          cell={cell}
                          flexClass={cells.length > 1 ? "min-w-0 flex-1" : "w-full"}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          );
        }

        const heading = getRowHeadingField(view, row);
        const summary = getRowSummaryField(view, row, heading?.key);
        const bodyFields = getVisibleRowFields(row, [heading?.key ?? "", summary?.key ?? ""]);

        return (
          <details
            key={row.id}
            id={`row-${row.id}`}
            open={index === 0}
            className={`group scroll-mt-24 overflow-hidden rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-[color:var(--wsu-ink)]">{getRowHeadingText(view, row)}</p>
                {summary && <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{describeResolvedField(summary) || summary.label}</p>}
              </div>
              <span className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)] group-open:border-[color:var(--wsu-crimson)] group-open:text-[color:var(--wsu-crimson)]">
                {index === 0 ? "Open" : "Expand"}
              </span>
            </summary>
            <div className={`border-t ${innerBorderClass} px-5 py-5`}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
                  <div className="space-y-1">
                    {!heading.hideLabel && (
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{heading.label}</p>
                    )}
                    <FieldValue field={heading} stacked />
                  </div>
                )}
                {summary && (
                  <div className="space-y-1">
                    {!summary.hideLabel && (
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{summary.label}</p>
                    )}
                    <FieldValue field={summary} stacked />
                  </div>
                )}
                {bodyFields.map((field) => (
                  <FieldBlock key={`${row.id}-${field.key}`} rowId={row.id} field={field} />
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
