import React, { useState } from "react";
import { BUILT_IN_THEMES } from "@/lib/config/themes";
import type { ViewConfig, ViewStyleConfig } from "@/lib/config/types";
import { getContrastRatio, getContrastScore } from "@/lib/color-utils";

interface ThemeEditorProps {
  view: ViewConfig;
  update: (key: keyof ViewConfig, value: any) => void;
}

const STYLE_TOKEN_LABELS: Record<keyof ViewStyleConfig, string> = {
  backgroundColor: "Page background",
  cardBackground: "Card/panel background",
  accentColor: "Accent color (links, buttons)",
  textColor: "Primary text",
  mutedColor: "Secondary/label text",
  borderColor: "Borders",
  fontFamily: "Body font",
  headingFontFamily: "Heading font",
  borderRadius: "Card/button radius",
  cardShadow: "Card drop shadow",
  badgeBg: "Badge background",
  badgeText: "Badge text",
  primaryColor: "Primary color (deprecated)",
};

const COLOR_TOKENS: Array<keyof ViewStyleConfig> = [
  "backgroundColor",
  "cardBackground",
  "accentColor",
  "textColor",
  "mutedColor",
  "borderColor",
  "badgeBg",
  "badgeText",
];

const TEXT_TOKENS: Array<keyof ViewStyleConfig> = [
  "fontFamily",
  "headingFontFamily",
  "borderRadius",
  "cardShadow",
];

export function ThemeEditor({ view, update }: ThemeEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentPresetId = view.themePresetId ?? "wsu_crimson";
  const currentPreset = BUILT_IN_THEMES.find((t) => t.id === currentPresetId) ?? BUILT_IN_THEMES[0];
  const hasOverrides = view.style && Object.keys(view.style).length > 0;

  const handlePresetSelect = (themeId: string) => {
    if (hasOverrides && themeId !== currentPresetId) {
      if (!window.confirm("Switching presets will reset your custom style overrides. Continue?")) {
        return;
      }
    }
    update("themePresetId", themeId);
    update("style", {}); // Reset overrides
  };

  const updateStyle = (token: keyof ViewStyleConfig, value: string) => {
    const nextStyle = { ...view.style, [token]: value };
    // If the value matches the preset, we could remove it from overrides, 
    // but for simplicity we'll just keep it as an explicit override for now.
    if (value === "") {
      delete (nextStyle as any)[token];
    }
    update("style", Object.keys(nextStyle).length > 0 ? nextStyle : undefined);
  };

  const renderContrastIndicator = (token: keyof ViewStyleConfig, value: string) => {
    if (token !== "accentColor" && token !== "textColor") return null;

    // Check against background or card background depending on where it's usually used
    const bgToken: keyof ViewStyleConfig = token === "accentColor" ? "backgroundColor" : "cardBackground";
    const bgColor = view.style?.[bgToken] || currentPreset.tokens[bgToken] || "#ffffff";
    const fgColor = value || currentPreset.tokens[token] || "#000000";

    const ratio = getContrastRatio(fgColor, bgColor);
    const score = getContrastScore(ratio);

    return (
      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
        <span className={`h-2 w-2 rounded-full ${
          score === "pass" ? "bg-emerald-500" : score === "warn" ? "bg-amber-500" : "bg-rose-500"
        }`} />
        <span className={score === "pass" ? "text-emerald-700" : score === "warn" ? "text-amber-700" : "text-rose-700"}>
          Contrast: {ratio.toFixed(2)}:1 ({score.toUpperCase()})
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Theme</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BUILT_IN_THEMES.map((theme) => {
          const isActive = currentPresetId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handlePresetSelect(theme.id)}
              className={`group relative min-h-[64px] rounded-2xl border p-4 text-left transition ${
                isActive
                  ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)]/5"
                  : "border-[color:var(--wsu-border)] bg-white hover:border-[color:var(--wsu-crimson)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--wsu-ink)]">{theme.label}</p>
                <div className="flex -space-x-1">
                  <div 
                    className="h-4 w-4 rounded-full border border-white" 
                    style={{ backgroundColor: theme.tokens.accentColor }} 
                    title="Accent"
                  />
                  <div 
                    className="h-4 w-4 rounded-full border border-white" 
                    style={{ backgroundColor: theme.tokens.backgroundColor }} 
                    title="Background"
                  />
                  <div 
                    className="h-4 w-4 rounded-full border border-white" 
                    style={{ backgroundColor: theme.tokens.textColor }} 
                    title="Text"
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-[color:var(--wsu-crimson)] hover:underline"
      >
        {isExpanded ? "Hide customization" : "Customize theme tokens…"}
        {hasOverrides && !isExpanded && (
          <span className="rounded-full bg-[color:var(--wsu-crimson)] px-1.5 py-0.5 text-[10px] text-white">
            {Object.keys(view.style || {}).length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-6 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-4">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--wsu-muted)]">Colors</h4>
              <div className="space-y-4">
                {COLOR_TOKENS.map((token) => (
                  <div key={token}>
                    <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">
                      {STYLE_TOKEN_LABELS[token]}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-xl border border-[color:var(--wsu-border)]">
                        <input
                          type="color"
                          value={view.style?.[token] || currentPreset.tokens[token] || "#ffffff"}
                          onChange={(e) => updateStyle(token, e.target.value)}
                          className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer"
                        />
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={view.style?.[token] || ""}
                          onChange={(e) => updateStyle(token, e.target.value)}
                          placeholder={currentPreset.tokens[token] as string}
                          className="w-full rounded-xl border border-[color:var(--wsu-border)] bg-white px-3 py-2 font-mono text-xs focus:border-[color:var(--wsu-crimson)] focus:outline-none"
                        />
                        {view.style?.[token] && (
                          <button
                            type="button"
                            onClick={() => updateStyle(token, "")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--wsu-muted)] hover:text-rose-600"
                            title="Reset to preset"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    {renderContrastIndicator(token, view.style?.[token] || "")}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--wsu-muted)]">Typography & Shape</h4>
              <div className="space-y-4">
                {TEXT_TOKENS.map((token) => (
                  <div key={token}>
                    <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">
                      {STYLE_TOKEN_LABELS[token]}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={view.style?.[token] || ""}
                        onChange={(e) => updateStyle(token, e.target.value)}
                        placeholder={currentPreset.tokens[token] as string}
                        className="w-full rounded-xl border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm focus:border-[color:var(--wsu-crimson)] focus:outline-none"
                      />
                      {view.style?.[token] && (
                        <button
                          type="button"
                          onClick={() => updateStyle(token, "")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--wsu-muted)] hover:text-rose-600"
                          title="Reset to preset"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-xl bg-white p-3 text-[10px] text-[color:var(--wsu-muted)]">
                <p className="font-semibold text-[color:var(--wsu-ink)]">Pro tip:</p>
                <p className="mt-1">Tokens marked with <span className="text-rose-600">×</span> are overrides. Click the <span className="text-rose-600">×</span> to reset them to the preset default.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
