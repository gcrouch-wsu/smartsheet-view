import type { CSSProperties } from "react";
import type { CampusBadgePresentationStyle } from "@/lib/config/types";

/** Bare numbers become px (CSS font-size / border-radius need a unit; plain "40" is invalid). */
function normalizeCssSizeValue(raw: string): string {
  const v = raw.trim();
  if (/^-?(\d+|\d*\.\d+)$/.test(v)) {
    return `${v}px`;
  }
  return v;
}

function chipStyles(style: CampusBadgePresentationStyle | undefined): CSSProperties | undefined {
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

/** Campus labels for program group headers (and filter chip styling alignment). */
export function CampusBadgeStrip({
  campuses,
  className = "",
  badgeStyle,
}: {
  campuses: string[];
  className?: string;
  badgeStyle?: CampusBadgePresentationStyle;
}) {
  if (campuses.length === 0) {
    return null;
  }
  const chipInline = chipStyles(badgeStyle);
  const defaultChipClass =
    "rounded-full border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/40 px-2.5 py-0.5 text-xs font-medium text-[color:var(--wsu-ink)]";
  // Keep pill baseline when any custom style is set; inline borderRadius overrides rounded-full when provided.
  const chipClass = chipInline
    ? "rounded-full border px-2.5 py-0.5 font-medium leading-normal text-[color:var(--wsu-ink)]"
    : defaultChipClass;

  return (
    <div className={`mt-2 flex flex-wrap gap-1.5 ${className}`} aria-label="Campuses for this program">
      {campuses.map((c) => (
        <span key={c} className={chipClass} style={chipInline}>
          {c}
        </span>
      ))}
    </div>
  );
}
