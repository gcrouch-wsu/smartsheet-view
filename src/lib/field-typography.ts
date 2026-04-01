import type { ResolvedFieldValue } from "@/lib/config/types";

/** CSS class for optional per-field value typography (see globals `.view-text-*`). */
export function fieldValueTypographyClass(field: ResolvedFieldValue): string {
  return field.textStyle ? `view-text-${field.textStyle}` : "";
}

/** Classes for field/column labels (`.view-field-label` color comes from globals). */
export function fieldLabelClassName(field: ResolvedFieldValue, extraClass = ""): string {
  const styleClass = field.labelStyle ? `view-label-${field.labelStyle}` : "";
  return ["view-field-label", styleClass, extraClass].filter(Boolean).join(" ");
}
