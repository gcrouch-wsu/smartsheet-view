import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { getCardLayoutColumnCount, getCardLayoutRows, getRowHeadingField, getRowSummaryField, getVisibleRowFields, hasCustomCardLayout } from "@/components/public/layout-utils";
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

export function DataStacked({ view }: { view: ResolvedView }) {
  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  const dividerStyle = view.presentation?.rowDividerStyle ?? "default";
  const cardBorderClass =
    dividerStyle === "none" ? "border-0" : dividerStyle === "subtle" ? "border border-[color:var(--wsu-border)]/40" : "border border-[color:var(--wsu-border)]";
  const rowDividerClass = (rowIndex: number) =>
    rowIndex > 0
      ? dividerStyle === "none"
        ? "mt-4 pt-4"
        : dividerStyle === "subtle"
          ? "mt-4 border-t border-[color:var(--wsu-border)]/40 pt-4"
          : "mt-4 border-t border-[color:var(--wsu-border)] pt-4"
      : "";

  return (
    <div className="space-y-4">
      {view.rows.map((row) => {
        const customRows = hasCustomCardLayout(view) ? getCardLayoutRows(view, row) : [];

        if (customRows.length > 0) {
          return (
            <article
              key={row.id}
              id={`row-${row.id}`}
              className={`scroll-mt-24 rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] p-5 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
            >
              {customRows.map((cells, rowIndex) => {
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
                            <CardLayoutCellRenderer key={`h-${i}`} rowId={row.id} cell={cell} flexClass="min-w-0" mode="header" />
                          ))}
                          {paddedCells.map((cell, i) => (
                            <CardLayoutCellRenderer key={`v-${i}`} rowId={row.id} cell={cell} flexClass="min-w-0" mode="value" />
                          ))}
                        </>
                      ) : (
                        paddedCells.map((cell, i) => (
                          <CardLayoutCellRenderer key={i} rowId={row.id} cell={cell} flexClass="w-full" />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </article>
          );
        }

        const heading = getRowHeadingField(view, row);
        const summary = getRowSummaryField(view, row, heading?.key);
        const bodyFields = getVisibleRowFields(row, [heading?.key ?? "", summary?.key ?? ""]);

        return (
          <article
            key={row.id}
            id={`row-${row.id}`}
            className={`scroll-mt-24 rounded-[1.75rem] ${cardBorderClass} bg-[color:var(--wsu-paper)] p-5 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--wsu-border)] pb-4">
              <div>
                {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
                  <div>
                    {!heading.hideLabel && (
                      <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{heading.label}</p>
                    )}
                    <div className="font-view-heading mt-2 text-lg font-semibold text-[color:var(--wsu-ink)]">
                      <FieldValue field={heading} />
                    </div>
                  </div>
                )}
                {summary && (
                  <div className="mt-2 text-sm text-[color:var(--wsu-muted)]">
                    <FieldValue field={summary} />
                  </div>
                )}
              </div>
              {!view.presentation?.hideRowBadge && (
                <div className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                  Row {row.id}
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bodyFields.map((field) => (
                <FieldBlock key={`${row.id}-${field.key}`} rowId={row.id} field={field} />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
