import { mergeThemeTokens } from "@/lib/config/themes";
import type { ViewStyleConfig } from "@/lib/config/types";

const TOKEN_TO_CSS_VAR: Record<keyof ViewStyleConfig, string> = {
  backgroundColor: "--view-bg",
  cardBackground: "--view-card-bg",
  surfaceMutedBackground: "--view-surface-muted-bg",
  accentColor: "--view-accent",
  textColor: "--view-text",
  mutedColor: "--view-muted",
  borderColor: "--view-border",
  controlBackground: "--view-control-bg",
  controlText: "--view-control-text",
  controlBorder: "--view-control-border",
  controlHoverBackground: "--view-control-hover-bg",
  controlActiveBackground: "--view-control-active-bg",
  controlActiveText: "--view-control-active-text",
  fontFamily: "--view-font",
  headingFontFamily: "--view-heading-font",
  fontSize: "--view-font-size",
  headingFontSize: "--view-heading-font-size",
  fieldLabelFontSize: "--view-field-label-font-size",
  rowHeadingFontSize: "--view-row-heading-font-size",
  fontWeight: "--view-font-weight",
  headingFontWeight: "--view-heading-font-weight",
  fieldLabelFontWeight: "--view-field-label-font-weight",
  rowHeadingFontWeight: "--view-row-heading-font-weight",
  peopleNameFontWeight: "--view-people-name-font-weight",
  peopleDetailFontWeight: "--view-people-detail-font-weight",
  fontStyle: "--view-font-style",
  headingFontStyle: "--view-heading-font-style",
  fieldLabelLetterSpacing: "--view-field-label-letter-spacing",
  fieldLabelTextTransform: "--view-field-label-text-transform",
  borderRadius: "--view-radius",
  cardShadow: "--view-card-shadow",
  badgeBg: "--view-badge-bg",
  badgeText: "--view-badge-text",
  pageTitleFontSize: "--view-page-title-font-size",
  actionFontSize: "--view-action-font-size",
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
  if (tokens.surfaceMutedBackground) {
    cssVars["--wsu-stone"] = tokens.surfaceMutedBackground;
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
