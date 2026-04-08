import { FieldValue } from "@/components/public/FieldValue";
import type { ResolvedFieldValue } from "@/lib/config/types";
import { fieldLabelClassName } from "@/lib/field-typography";

/**
 * Outer wrapper classes for a labeled field block. When the label is hidden (continuation lines like
 * email under a contact name), pull the block up so parent `space-y-*` / `gap-*` does not leave a large gap.
 */
export function fieldBlockOuterClassName(field: ResolvedFieldValue, compact?: boolean): string {
  const gapClass = compact ? "space-y-0.5" : "space-y-1";
  const tuckUnderPrevious = field.hideLabel ? " !mt-1" : "";
  return `${gapClass}${tuckUnderPrevious}`;
}

export function FieldBlock({
  field,
  compact,
}: {
  field: ResolvedFieldValue;
  /** Tighter label/value spacing for stacked and card layouts. */
  compact?: boolean;
}) {
  const labelExtra = compact ? "leading-tight" : "";
  return (
    <div className={fieldBlockOuterClassName(field, compact)}>
      {!field.hideLabel && (
        <p className={fieldLabelClassName(field, labelExtra)}>{field.label}</p>
      )}
      <FieldValue field={field} stacked />
    </div>
  );
}
