import type { CSSProperties } from "react";
import type { CampusBadgePresentationStyle } from "@/lib/config/types";

function chipStyles(style: CampusBadgePresentationStyle | undefined): CSSProperties | undefined {
  if (!style) {
    return undefined;
  }
  const out: CSSProperties = {};
  if (style.fontSize) out.fontSize = style.fontSize;
  if (style.fontWeight) out.fontWeight = style.fontWeight;
  if (style.fontFamily) out.fontFamily = style.fontFamily;
  if (style.background) out.background = style.background;
  if (style.color) out.color = style.color;
  if (style.borderColor) out.borderColor = style.borderColor;
  if (style.borderRadius) out.borderRadius = style.borderRadius;
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
  const chipClass = chipInline ? "border px-2.5 py-0.5 text-xs" : defaultChipClass;

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
