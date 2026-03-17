import type { ThemeConfig, ViewStyleConfig } from "@/lib/config/types";

export const BUILT_IN_THEMES: ThemeConfig[] = [
  {
    id: "wsu_crimson",
    label: "WSU Crimson",
    tokens: {
      backgroundColor: "#f8f6f3",
      cardBackground: "#ffffff",
      accentColor: "#a60f2d",
      textColor: "#231f20",
      mutedColor: "#6b7280",
      borderColor: "#e5e7eb",
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "system-ui, sans-serif",
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
      accentColor: "#2563eb",
      textColor: "#1f2937",
      mutedColor: "#6b7280",
      borderColor: "#e5e7eb",
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "system-ui, sans-serif",
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
      accentColor: "#60a5fa",
      textColor: "#f9fafb",
      mutedColor: "#9ca3af",
      borderColor: "#4b5563",
      fontFamily: "system-ui, sans-serif",
      headingFontFamily: "system-ui, sans-serif",
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
