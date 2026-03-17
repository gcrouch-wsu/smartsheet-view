import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import { describeResolvedField, getRowHeadingField, getRowHeadingText, getRowSummaryField, getVisibleRowFields } from "@/components/public/layout-utils";
import type { ResolvedView } from "@/lib/config/types";

export function DataAccordion({ view }: { view: ResolvedView }) {
  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  return (
    <div className="space-y-3">
      {view.rows.map((row, index) => {
        const heading = getRowHeadingField(view, row);
        const summary = getRowSummaryField(view, row, heading?.key);
        const bodyFields = getVisibleRowFields(row, [heading?.key ?? "", summary?.key ?? ""]);

        return (
          <details
            key={row.id}
            open={index === 0}
            className="group overflow-hidden rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]"
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
            <div className="border-t border-[color:var(--wsu-border)] px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {heading && !(heading.hideWhenEmpty && heading.isEmpty) && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{heading.label}</p>
                    <FieldValue field={heading} stacked />
                  </div>
                )}
                {summary && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{summary.label}</p>
                    <FieldValue field={summary} stacked />
                  </div>
                )}
                {bodyFields.map((field) => (
                  <div key={`${row.id}-${field.key}`} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{field.label}</p>
                    <FieldValue field={field} stacked />
                  </div>
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
