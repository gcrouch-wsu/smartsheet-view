import { EmptyState } from "@/components/public/EmptyState";
import { FieldValue } from "@/components/public/FieldValue";
import type { ResolvedView } from "@/lib/config/types";

export function DataTable({ view }: { view: ResolvedView }) {
  if (view.rows.length === 0) {
    return <EmptyState label={`No ${view.label.toLowerCase()} records found.`} />;
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/80">
              {view.fields.map((field) => (
                <th
                  key={field.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id} className="border-b border-[color:var(--wsu-border)]/70 align-top last:border-b-0">
                {row.fields.map((field) => (
                  <td key={`${row.id}-${field.key}`} className="px-4 py-4 text-sm">
                    <FieldValue field={field} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
