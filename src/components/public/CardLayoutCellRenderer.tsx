import { FieldBlock } from "@/components/public/FieldBlock";
import { FieldValue } from "@/components/public/FieldValue";
import type { CardLayoutCell } from "@/components/public/layout-utils";

const labelClass = "view-field-label text-[color:var(--wsu-muted)]";

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
      <div key={`text-${cell.label}`} className={`${baseClass} space-y-0.5`}>
        <p className={`${labelClass} leading-tight`}>{cell.label}</p>
      </div>
    );
  }

  if (mode === "header") {
    return (
      <div key={`${cell.field.key}-h`} className={baseClass}>
        {!cell.field.hideLabel && (
          <p className={`${labelClass} leading-tight`}>{cell.field.label}</p>
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
      <FieldBlock field={cell.field} compact />
    </div>
  );
}
