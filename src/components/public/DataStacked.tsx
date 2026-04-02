import { CardLayoutCellRenderer } from "@/components/public/CardLayoutCellRenderer";
import { ContributorEditButton, ContributorEditableBadge, getContributorRowAccentClass } from "@/components/public/ContributorRowControls";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldBlock } from "@/components/public/FieldBlock";
import { FieldValue } from "@/components/public/FieldValue";
import {
  customCardAlignedGridStyle,
  customCardGridScrollWrapClassName,
  getCardLayoutColumnCount,
  getCardLayoutRows,
  getRowHeadingField,
  getRowSummaryField,
  getVisibleRowFields,
  hasCustomCardLayout,
} from "@/components/public/layout-utils";
import type { ResolvedView } from "@/lib/config/types";
import { fieldLabelClassName } from "@/lib/field-typography";

export function DataStacked({
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
    <div className="space-y-3 md:space-y-4">
      {view.rows.map((row) => {
        const customRows = hasCustomCardLayout(view) ? getCardLayoutRows(view, row) : [];
        const isEditable = editableRowIds?.has(row.id) ?? false;

        if (customRows.length > 0) {
          return (
            <article
              key={row.id}
              id={`row-${row.id}`}
              className={`scroll-mt-24 rounded-2xl sm:rounded-[1.75rem] ${cardBorderClass} ${getContributorRowAccentClass(isEditable)} bg-[color:var(--wsu-paper)] p-4 shadow-[0_16px_40px_rgba(35,31,32,0.06)] sm:p-5`}
            >
              {isEditable && (
                <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                  <ContributorEditableBadge />
                  <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />
                </div>
              )}
              {customRows.map((cells, rowIndex) => {
                const colCount = getCardLayoutColumnCount(view);
                const useAlignedGrid = colCount > 1;
                const gridClass = useAlignedGrid ? "grid gap-2 sm:gap-3 md:gap-4" : "space-y-2 sm:space-y-3 md:space-y-4";
                const gridStyle = useAlignedGrid ? customCardAlignedGridStyle(colCount) : undefined;
                const scrollWrap = customCardGridScrollWrapClassName(useAlignedGrid);
                const paddedCells = useAlignedGrid ? [...cells.slice(0, colCount), ...Array(Math.max(0, colCount - cells.length)).fill({ type: "placeholder" as const })] : cells;
                const gridInner = (
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
                );
                return (
                  <div key={rowIndex} className={rowDividerClass(rowIndex)}>
                    {scrollWrap ? <div className={scrollWrap}>{gridInner}</div> : gridInner}
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
            className={`scroll-mt-24 rounded-2xl sm:rounded-[1.75rem] ${cardBorderClass} ${getContributorRowAccentClass(isEditable)} bg-[color:var(--wsu-paper)] p-4 shadow-[0_16px_40px_rgba(35,31,32,0.06)] sm:p-5`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--wsu-border)] pb-3 sm:gap-4 sm:pb-4">
              <div>
                {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
                  <div>
                    {!heading.hideLabel && (
                      <p className={fieldLabelClassName(heading)}>{heading.label}</p>
                    )}
                    <div className="view-row-heading mt-2">
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
                <div className="flex items-center gap-2">
                  {isEditable && <ContributorEditableBadge />}
                  <div className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                    Row {row.id}
                  </div>
                  {isEditable && <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />}
                </div>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {bodyFields.map((field) => (
                <div key={`${row.id}-${field.key}`}>
                  <FieldBlock field={field} compact />
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
