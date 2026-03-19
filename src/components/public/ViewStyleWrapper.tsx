import { mergeThemeTokens } from "@/lib/config/themes";
import type { ViewStyleConfig } from "@/lib/config/types";

const TOKEN_TO_CSS_VAR: Record<keyof ViewStyleConfig, string> = {
  backgroundColor: "--view-bg",
  cardBackground: "--view-card-bg",
  accentColor: "--view-accent",
  textColor: "--view-text",
  mutedColor: "--view-muted",
  borderColor: "--view-border",
  fontFamily: "--view-font",
  headingFontFamily: "--view-heading-font",
  fontSize: "--view-font-size",
  headingFontSize: "--view-heading-font-size",
  fontWeight: "--view-font-weight",
  headingFontWeight: "--view-heading-font-weight",
  fontStyle: "--view-font-style",
  headingFontStyle: "--view-heading-font-style",
  borderRadius: "--view-radius",
  cardShadow: "--view-card-shadow",
  badgeBg: "--view-badge-bg",
  badgeText: "--view-badge-text",
  primaryColor: "--view-accent",
};

export function ViewStyleWrapper({
  style,
  themePresetId = "wsu_crimson",
  children,
}: {
  style?: ViewStyleConfig;
  themePresetId?: string;
  children: React.ReactNode;
}) {
  const tokens = mergeThemeTokens(themePresetId, style);
  const accent = tokens.accentColor ?? tokens.primaryColor;
  const cssVars: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    if (key === "primaryColor" && tokens.accentColor) continue;
    const varName = TOKEN_TO_CSS_VAR[key as keyof ViewStyleConfig];
    if (varName && value) {
      cssVars[varName] = value;
    }
  }

  if (accent) {
    cssVars["--wsu-crimson"] = accent;
  }
  if (tokens.borderColor) {
    cssVars["--wsu-border"] = tokens.borderColor;
  }
  if (tokens.cardBackground) {
    cssVars["--wsu-paper"] = tokens.cardBackground;
  }
  if (tokens.textColor) {
    cssVars["--wsu-ink"] = tokens.textColor;
  }
  if (tokens.mutedColor) {
    cssVars["--wsu-muted"] = tokens.mutedColor;
  }

  // Apply page background so custom/theme backgroundColor overrides the global html gradient
  if (tokens.backgroundColor) {
    cssVars.backgroundColor = tokens.backgroundColor;
  }

  // Apply body font, size, weight, style
  if (tokens.fontFamily) {
    cssVars.fontFamily = tokens.fontFamily;
  }
  if (tokens.fontSize) {
    cssVars.fontSize = tokens.fontSize;
  }
  if (tokens.fontWeight) {
    cssVars.fontWeight = tokens.fontWeight;
  }
  if (tokens.fontStyle) {
    cssVars.fontStyle = tokens.fontStyle;
  }

  return <div style={cssVars as React.CSSProperties}>{children}</div>;
}
