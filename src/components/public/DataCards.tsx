import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { ContributorEditButton, ContributorEditableBadge, getContributorRowAccentClass } from "@/components/public/ContributorRowControls";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { getCardLayoutColumnCount, getCardLayoutRows, getRowHeadingField, getRowSummaryField, getVisibleRowFields, hasCustomCardLayout } from "@/components/public/layout-utils";
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

export function DataCards({
  view,
  editableRowIds,
  onEditRow,
}: {
  view: ResolvedView;
  editableRowIds?: Set<number>;
  onEditRow?: (rowId: number, triggerElement?: HTMLElement | null) => void;
}) {
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {view.rows.map((row) => {
        const customRows = hasCustomCardLayout(view) ? getCardLayoutRows(view, row) : [];
        const isEditable = editableRowIds?.has(row.id) ?? false;

        if (customRows.length > 0) {
          const colCount = getCardLayoutColumnCount(view);
          const useAlignedGrid = colCount > 1;
          const gridClass = useAlignedGrid ? "grid gap-4" : "space-y-4";
          const gridStyle = useAlignedGrid
            ? { gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gridTemplateRows: "auto auto" }
            : undefined;
          return (
            <article
              key={row.id}
              id={`row-${row.id}`}
              className={`scroll-mt-24 rounded-[1.75rem] ${cardBorderClass} ${getContributorRowAccentClass(isEditable)} bg-[color:var(--wsu-paper)] p-5 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
            >
              {isEditable && (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <ContributorEditableBadge />
                  <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />
                </div>
              )}
              {customRows.map((cells, rowIndex) => {
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
        const remaining = getVisibleRowFields(row, [heading?.key ?? "", summary?.key ?? ""]);

        return (
          <article
            key={row.id}
            id={`row-${row.id}`}
            className={`scroll-mt-24 rounded-[1.75rem] ${cardBorderClass} ${getContributorRowAccentClass(isEditable)} bg-[color:var(--wsu-paper)] p-5 shadow-[0_16px_40px_rgba(35,31,32,0.06)]`}
          >
            {isEditable && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <ContributorEditableBadge />
                <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />
              </div>
            )}
            {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
              <div className="border-b border-[color:var(--wsu-border)] pb-4">
                {!heading.hideLabel ? (
                  <>
                    <p className={fieldLabelClassName(heading)}>{heading.label}</p>
                    <div className="view-row-heading mt-2">
                      <FieldValue field={heading} />
                    </div>
                  </>
                ) : (
                  <div className="view-row-heading">
                    <FieldValue field={heading} />
                  </div>
                )}
                {summary && (
                  <div className="mt-2 text-sm text-[color:var(--wsu-muted)]">
                    <FieldValue field={summary} />
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 space-y-4">
              {remaining.map((field) => (
                <FieldBlock key={`${row.id}-${field.key}`} rowId={row.id} field={field} />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
