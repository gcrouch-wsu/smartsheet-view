import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { ContributorEditButton, ContributorEditableBadge, getContributorRowAccentClass } from "@/components/public/ContributorRowControls";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { getCardLayoutColumnCount, getCardLayoutRows, hasCustomCardLayout } from "@/components/public/layout-utils";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";

function FieldBlock({ rowId, field }: { rowId: number; field: ResolvedFieldValue }) {
  return (
    <div key={`${rowId}-${field.key}`} className="space-y-1">
      {!field.hideLabel && (
        <p className="view-field-label text-[color:var(--wsu-muted)]">{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}

export function DataList({
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
  const listDividerClass =
    dividerStyle === "none" ? "" : dividerStyle === "subtle" ? "divide-y divide-[color:var(--wsu-border)]/40" : "divide-y divide-[color:var(--wsu-border)]/70";

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
      <ul className={listDividerClass}>
        {view.rows.map((row) => {
          const customRows = hasCustomCardLayout(view) ? getCardLayoutRows(view, row) : [];
          const isEditable = editableRowIds?.has(row.id) ?? false;

          if (customRows.length > 0) {
            return (
              <li key={row.id} id={`row-${row.id}`} className={`scroll-mt-24 px-5 py-5 ${getContributorRowAccentClass(isEditable)}`}>
                {isEditable && (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <ContributorEditableBadge />
                    <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />
                  </div>
                )}
                <div className="space-y-4">
                  {customRows.map((cells, rowIndex) => {
                    const rowDividerClass =
                      rowIndex > 0
                        ? dividerStyle === "none"
                          ? "pt-4"
                          : dividerStyle === "subtle"
                            ? "border-t border-[color:var(--wsu-border)]/40 pt-4"
                            : "border-t border-[color:var(--wsu-border)] pt-4"
                        : "";
                    const colCount = getCardLayoutColumnCount(view);
                    const useAlignedGrid = colCount > 1;
                    const gridClass = useAlignedGrid ? "grid gap-4" : "space-y-4";
                    const gridStyle = useAlignedGrid
                      ? { gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`, gridTemplateRows: "auto auto" }
                      : undefined;
                    const paddedCells = useAlignedGrid ? [...cells.slice(0, colCount), ...Array(Math.max(0, colCount - cells.length)).fill({ type: "placeholder" as const })] : cells;
                    return (
                    <div key={rowIndex} className={rowDividerClass}>
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
                </div>
              </li>
            );
          }

          return (
            <li key={row.id} id={`row-${row.id}`} className={`scroll-mt-24 px-5 py-5 ${getContributorRowAccentClass(isEditable)}`}>
              {isEditable && (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <ContributorEditableBadge />
                  <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {row.fields
                  .filter((field) => !(field.hideWhenEmpty && field.isEmpty))
                  .map((field) => (
                    <FieldBlock key={`${row.id}-${field.key}`} rowId={row.id} field={field} />
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
