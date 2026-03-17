import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { getRowHeadingField, getRowSummaryField, getVisibleRowFields } from "@/components/public/layout-utils";
import type { ResolvedView } from "@/lib/config/types";

export function DataCards({ view }: { view: ResolvedView }) {
  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {view.rows.map((row) => {
        const heading = getRowHeadingField(view, row);
        const summary = getRowSummaryField(view, row, heading?.key);
        const remaining = getVisibleRowFields(row, [heading?.key ?? "", summary?.key ?? ""]);

        return (
          <article
            key={row.id}
            className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-5 shadow-[0_16px_40px_rgba(35,31,32,0.06)]"
          >
            {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
              <div className="border-b border-[color:var(--wsu-border)] pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">
                  {heading.label}
                </p>
                <div className="mt-2 text-lg font-semibold text-[color:var(--wsu-ink)]">
                  <FieldValue field={heading} />
                </div>
                {summary && (
                  <div className="mt-2 text-sm text-[color:var(--wsu-muted)]">
                    <FieldValue field={summary} />
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 space-y-4">
              {remaining.map((field) => (
                <div key={`${row.id}-${field.key}`} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">
                    {field.label}
                  </p>
                  <FieldValue field={field} stacked />
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
