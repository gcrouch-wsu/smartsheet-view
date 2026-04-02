import { ContributorEditButton, getContributorRowAccentClass } from "@/components/public/ContributorRowControls";
import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import type { ResolvedView } from "@/lib/config/types";

export function DataTable({
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

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
      <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
        <table className="min-w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            {view.label}: {view.rowCount} row{view.rowCount === 1 ? "" : "s"}
          </caption>
          <thead>
            <tr className="border-b border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/80">
              {view.fields.map((field) => (
                <th
                  key={field.key}
                  scope="col"
                  className="view-field-label px-4 py-3 text-[color:var(--wsu-muted)]"
                >
                  {field.label}
                </th>
              ))}
              {onEditRow && (
                <th
                  scope="col"
                  className="view-field-label px-4 py-3 text-right text-[color:var(--wsu-muted)]"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => {
              const isEditable = editableRowIds?.has(row.id) ?? false;
              return (
                <tr
                  key={row.id}
                  id={`row-${row.id}`}
                  className={`border-b border-[color:var(--wsu-border)]/70 align-top last:border-b-0 scroll-mt-24 ${getContributorRowAccentClass(isEditable)}`}
                >
                  {row.fields.map((field) => (
                    <td key={`${row.id}-${field.key}`} className="px-4 py-4 text-sm">
                      <FieldValue field={field} />
                    </td>
                  ))}
                  {onEditRow && (
                    <td className="px-4 py-4 text-right">
                      {isEditable && <ContributorEditButton rowId={row.id} onEditRow={onEditRow} compact />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
