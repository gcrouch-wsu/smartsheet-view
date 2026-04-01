import { FieldValue } from "@/components/public/FieldValue";
import type { ResolvedFieldValue } from "@/lib/config/types";

const labelClass = "view-field-label text-[color:var(--wsu-muted)]";

export function FieldBlock({
  field,
  compact,
}: {
  field: ResolvedFieldValue;
  /** Tighter label/value spacing for stacked and card layouts. */
  compact?: boolean;
}) {
  const gapClass = compact ? "space-y-0.5" : "space-y-1";
  const labelExtra = compact ? "leading-tight" : "";
  return (
    <div className={gapClass}>
      {!field.hideLabel && (
        <p className={[labelClass, labelExtra].filter(Boolean).join(" ")}>{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}
