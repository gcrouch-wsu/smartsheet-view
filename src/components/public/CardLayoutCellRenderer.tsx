import { FieldValue } from "@/components/public/FieldValue";
import type { CardLayoutCell } from "@/components/public/layout-utils";
import type { ResolvedFieldValue } from "@/lib/config/types";

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

export function CardLayoutCellRenderer({
  rowId,
  cell,
  flexClass,
}: {
  rowId: number;
  cell: CardLayoutCell;
  flexClass?: string;
}) {
  const baseClass = flexClass ?? "min-w-0 flex-1";

  if (cell.type === "placeholder") {
    return <div key="placeholder" className={baseClass} aria-hidden />;
  }

  if (cell.type === "text") {
    return (
      <div key={`text-${cell.label}`} className={`${baseClass} space-y-1`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-muted)]">{cell.label}</p>
      </div>
    );
  }

  return (
    <div key={cell.field.key} className={baseClass}>
      <FieldBlock rowId={rowId} field={cell.field} />
    </div>
  );
}
