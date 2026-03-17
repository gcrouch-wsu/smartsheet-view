import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import type { ResolvedView } from "@/lib/config/types";

export function DataList({ view }: { view: ResolvedView }) {
  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
      <ul className="divide-y divide-[color:var(--wsu-border)]/70">
        {view.rows.map((row) => (
          <li key={row.id} id={`row-${row.id}`} className="scroll-mt-24 px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {row.fields
                .filter((field) => !(field.hideWhenEmpty && field.isEmpty))
                .map((field) => (
                  <div key={`${row.id}-${field.key}`} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">
                      {field.label}
                    </p>
                    <FieldValue field={field} stacked />
                  </div>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
