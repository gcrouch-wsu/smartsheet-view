import { FieldValue } from "@/components/public/FieldValue";
import type { CardLayoutCell } from "@/components/public/layout-utils";
import type { ResolvedFieldValue } from "@/lib/config/types";

const labelClass = "view-field-label text-[color:var(--wsu-muted)]";

function FieldBlock({ rowId, field }: { rowId: number; field: ResolvedFieldValue }) {
  return (
    <div key={`${rowId}-${field.key}`} className="space-y-1">
      {!field.hideLabel && (
        <p className={labelClass}>{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}

export type CardLayoutCellMode = "full" | "header" | "value";

export function CardLayoutCellRenderer({
  rowId,
  cell,
  flexClass,
  mode = "full",
}: {
  rowId: number;
  cell: CardLayoutCell;
  flexClass?: string;
  mode?: CardLayoutCellMode;
}) {
  const baseClass = flexClass ?? "min-w-0 flex-1";

  if (cell.type === "placeholder") {
    return <div key="placeholder" className={baseClass} aria-hidden />;
  }

  if (cell.type === "text") {
    if (mode === "value") return <div key={`text-val-${cell.label}`} className={baseClass} aria-hidden />;
    return (
      <div key={`text-${cell.label}`} className={`${baseClass} space-y-1`}>
        <p className={labelClass}>{cell.label}</p>
      </div>
    );
  }

  if (mode === "header") {
    return (
      <div key={`${cell.field.key}-h`} className={baseClass}>
        {!cell.field.hideLabel && (
          <p className={labelClass}>{cell.field.label}</p>
        )}
      </div>
    );
  }

  if (mode === "value") {
    return (
      <div key={`${cell.field.key}-v`} className={baseClass}>
        <FieldValue field={cell.field} stacked />
      </div>
    );
  }

  return (
    <div key={cell.field.key} className={baseClass}>
      <FieldBlock rowId={rowId} field={cell.field} />
    </div>
  );
}
