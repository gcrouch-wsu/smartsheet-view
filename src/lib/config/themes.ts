import type { ThemeConfig, ViewStyleConfig } from "@/lib/config/types";

export const BUILT_IN_THEMES: ThemeConfig[] = [
  {
    id: "wsu_crimson",
    label: "WSU Crimson",
    tokens: {
      backgroundColor: "#f8f6f3",
      cardBackground: "#ffffff",
      surfaceMutedBackground: "#f4efe9",
      accentColor: "#a60f2d",
      textColor: "#231f20",
      mutedColor: "#6b7280",
      borderColor: "#e5e7eb",
      controlBackground: "#ffffff",
      controlText: "#6b7280",
      controlBorder: "#e5e7eb",
      controlHoverBackground: "rgba(166, 15, 45, 0.08)",
      controlActiveBackground: "#a60f2d",
      controlActiveText: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "system-ui, sans-serif",
      fontSize: "1rem",
      headingFontSize: "1.25rem",
      fieldLabelFontSize: "0.75rem",
      rowHeadingFontSize: "1.125rem",
      fontWeight: "normal",
      headingFontWeight: "normal",
      fieldLabelFontWeight: "600",
      rowHeadingFontWeight: "600",
      peopleNameFontWeight: "500",
      fontStyle: "normal",
      headingFontStyle: "normal",
      fieldLabelLetterSpacing: "0.2em",
      fieldLabelTextTransform: "uppercase",
      borderRadius: "1.75rem",
      cardShadow: "0 16px 40px rgba(35,31,32,0.06)",
      badgeBg: "#f3f4f6",
      badgeText: "#374151",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    tokens: {
      backgroundColor: "#ffffff",
      cardBackground: "#ffffff",
      surfaceMutedBackground: "#f3f4f6",
      accentColor: "#2563eb",
      textColor: "#1f2937",
      mutedColor: "#6b7280",
      borderColor: "#e5e7eb",
      controlBackground: "#ffffff",
      controlText: "#4b5563",
      controlBorder: "#d1d5db",
      controlHoverBackground: "rgba(37, 99, 235, 0.08)",
      controlActiveBackground: "#2563eb",
      controlActiveText: "#ffffff",
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "system-ui, sans-serif",
      fontSize: "1rem",
      headingFontSize: "1.125rem",
      fieldLabelFontSize: "0.75rem",
      rowHeadingFontSize: "1.125rem",
      fontWeight: "normal",
      headingFontWeight: "normal",
      fieldLabelFontWeight: "600",
      rowHeadingFontWeight: "600",
      peopleNameFontWeight: "500",
      fontStyle: "normal",
      headingFontStyle: "normal",
      fieldLabelLetterSpacing: "0.16em",
      fieldLabelTextTransform: "uppercase",
      borderRadius: "0.5rem",
      cardShadow: "0 1px 3px rgba(0,0,0,0.08)",
      badgeBg: "#eff6ff",
      badgeText: "#1e40af",
    },
  },
  {
    id: "dark",
    label: "Dark",
    tokens: {
      backgroundColor: "#1f2937",
      cardBackground: "#374151",
      surfaceMutedBackground: "#2b3442",
      accentColor: "#60a5fa",
      textColor: "#f9fafb",
      mutedColor: "#9ca3af",
      borderColor: "#4b5563",
      controlBackground: "#1f2937",
      controlText: "#e5e7eb",
      controlBorder: "#4b5563",
      controlHoverBackground: "rgba(96, 165, 250, 0.14)",
      controlActiveBackground: "#60a5fa",
      controlActiveText: "#0f172a",
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "system-ui, sans-serif",
      fontSize: "1rem",
      headingFontSize: "1.125rem",
      fieldLabelFontSize: "0.75rem",
      rowHeadingFontSize: "1.125rem",
      fontWeight: "normal",
      headingFontWeight: "normal",
      fieldLabelFontWeight: "600",
      rowHeadingFontWeight: "600",
      peopleNameFontWeight: "500",
      fontStyle: "normal",
      headingFontStyle: "normal",
      fieldLabelLetterSpacing: "0.16em",
      fieldLabelTextTransform: "uppercase",
      borderRadius: "0.5rem",
      cardShadow: "0 4px 6px rgba(0,0,0,0.3)",
      badgeBg: "#4b5563",
      badgeText: "#e5e7eb",
    },
  },
];

const DEFAULT_THEME = BUILT_IN_THEMES[0];

/** Merge preset tokens with view overrides. */
export function mergeThemeTokens(
  presetId: string,
  overrides?: Partial<ViewStyleConfig>
): ViewStyleConfig {
  const preset = BUILT_IN_THEMES.find((t) => t.id === presetId) ?? DEFAULT_THEME;
  const base = { ...preset.tokens } as ViewStyleConfig;
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined && value !== "") {
        (base as Record<string, unknown>)[key] = value;
      }
    }
  }
  return base;
}
