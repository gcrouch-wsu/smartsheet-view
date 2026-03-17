import type { ViewStyleConfig } from "@/lib/config/types";

export function ViewStyleWrapper({
  style,
  children,
}: {
  style?: ViewStyleConfig;
  children: React.ReactNode;
}) {
  if (!style?.primaryColor && !style?.accentColor && !style?.borderRadius) {
    return <>{children}</>;
  }

  const cssVars: Record<string, string> = {};
  if (style.primaryColor) {
    cssVars["--wsu-crimson"] = style.primaryColor;
    cssVars["--wsu-crimson-dark"] = style.primaryColor;
  }
  if (style.accentColor) {
    cssVars["--wsu-border"] = style.accentColor;
  }
  if (style.borderRadius) {
    cssVars["--view-radius"] = style.borderRadius;
  }

  return <div style={cssVars as React.CSSProperties}>{children}</div>;
}
