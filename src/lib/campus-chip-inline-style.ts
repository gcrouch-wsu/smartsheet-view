import type { CSSProperties } from "react";
import type { CampusBadgePresentationStyle } from "@/lib/config/types";

/** Bare numbers become px (CSS font-size / border-radius need a unit; plain "40" is invalid). */
export function normalizeCssSizeValue(raw: string): string {
  const v = raw.trim();
  if (/^-?(\d+|\d*\.\d+)$/.test(v)) {
    return `${v}px`;
  }
  return v;
}

/** Inline React `style` for campus pill chips (strips & people_group name chips). */
export function campusChipInlineStyle(style: CampusBadgePresentationStyle | undefined): CSSProperties | undefined {
  if (!style) {
    return undefined;
  }
  const out: CSSProperties = {};
  if (style.fontSize) out.fontSize = normalizeCssSizeValue(style.fontSize);
  if (style.fontWeight) out.fontWeight = style.fontWeight;
  if (style.fontFamily) out.fontFamily = style.fontFamily;
  if (style.background) out.background = style.background;
  if (style.color) out.color = style.color;
  if (style.borderColor) out.borderColor = style.borderColor;
  if (style.borderRadius) out.borderRadius = normalizeCssSizeValue(style.borderRadius);
  return Object.keys(out).length > 0 ? out : undefined;
}
