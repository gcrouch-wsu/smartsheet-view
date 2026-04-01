import React, { useState } from "react";
import {
  BORDER_RADIUS_OPTIONS,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  FONT_STYLE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  HEADER_TOP_BORDER_WIDTH_OPTIONS,
  LETTER_SPACING_OPTIONS,
  SHADOW_OPTIONS,
  TEXT_TRANSFORM_OPTIONS,
} from "@/lib/config/options";
import { BUILT_IN_THEMES } from "@/lib/config/themes";
import type { ViewConfig, ViewStyleConfig } from "@/lib/config/types";
import { getContrastRatio, getContrastScore } from "@/lib/color-utils";

interface ThemeEditorProps {
  view: ViewConfig;
  update: <K extends keyof ViewConfig>(key: K, value: ViewConfig[K]) => void;
}

const COLOR_LABELS: Record<string, string> = {
  backgroundColor: "Page background",
  cardBackground: "Card/panel background",
  surfaceMutedBackground: "Muted surface background",
  accentColor: "Accent (links, buttons)",
  textColor: "Primary text",
  mutedColor: "Secondary/label text",
  borderColor: "Borders",
  controlBackground: "Control background",
  controlText: "Control text",
  controlBorder: "Control border",
  controlHoverBackground: "Control hover background",
  controlActiveBackground: "Active control background",
  controlActiveText: "Active control text",
  badgeBg: "Badge background",
  badgeText: "Badge text",
};

const COLOR_TOKENS = Object.keys(COLOR_LABELS) as Array<keyof ViewStyleConfig>;

const HEADER_COLOR_LABELS: Partial<Record<keyof ViewStyleConfig, string>> = {
  headerTopBorderColor: "Brand strip top rule",
  headerPanelBackgroundColor: "Masthead card background",
  headerPanelBorderColor: "Masthead card border",
  headerBrandSublineColor: "Brand subline (small line)",
  headerBrandTitleColor: "Brand title (large line)",
  headerSourceLabelColor: "Source label (upper line above page title)",
  headerPageTitleColor: "Page title (main h1 in header)",
  headerLiveBlurbColor: "“Live data from…” text",
  headerLiveBlurbStrongColor: "“Live data…” source name emphasis",
};
const HEADER_COLOR_TOKENS = Object.keys(HEADER_COLOR_LABELS) as Array<keyof ViewStyleConfig>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--wsu-muted)]">{title}</h4>
      {children}
    </div>
  );
}

export function ThemeEditor({ view, update }: ThemeEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentPresetId = view.themePresetId ?? "wsu_crimson";
  const currentPreset = BUILT_IN_THEMES.find((t) => t.id === currentPresetId) ?? BUILT_IN_THEMES[0];
  const hasOverrides = view.style && Object.keys(view.style).length > 0;

  const handlePresetSelect = (themeId: string) => {
    if (hasOverrides && themeId !== currentPresetId) {
      if (!window.confirm("Switching presets will reset your custom overrides. Continue?")) {
        return;
      }
    }
    update("themePresetId", themeId);
    update("style", undefined);
  };

  const updateStyle = (token: keyof ViewStyleConfig, value: string) => {
    const nextStyle = { ...view.style };
    if (value === "" || value === (currentPreset.tokens[token] as string)) {
      delete (nextStyle as Record<string, unknown>)[token];
    } else {
      (nextStyle as Record<string, string>)[token] = value;
    }
    update("style", Object.keys(nextStyle).length > 0 ? nextStyle : undefined);
  };

  const getValue = (token: keyof ViewStyleConfig) =>
    view.style?.[token] ?? (currentPreset.tokens[token] as string) ?? "";

  const getFontWeightValue = (token: "fontWeight" | "headingFontWeight") => {
    const v = getValue(token);
    if (v === "normal") return "400";
    if (v === "bold") return "700";
    return v || "400";
  };

  const getNumericFontWeightValue = (
    token:
      | "fontWeight"
      | "headingFontWeight"
      | "fieldLabelFontWeight"
      | "rowHeadingFontWeight"
      | "peopleNameFontWeight"
      | "peopleDetailFontWeight"
      | "headerBrandSublineFontWeight"
      | "headerBrandTitleFontWeight"
      | "headerSourceLabelFontWeight"
      | "headerPageTitleFontWeight",
  ) => {
    const v = getValue(token);
    if (v === "normal") return "400";
    if (v === "bold") return "700";
    return v || "400";
  };

  const renderContrastIndicator = (token: keyof ViewStyleConfig, value: string) => {
    if (token !== "accentColor" && token !== "textColor") return null;
    const bgToken: keyof ViewStyleConfig = token === "accentColor" ? "backgroundColor" : "cardBackground";
    const bgColor = getValue(bgToken) || "#ffffff";
    const fgColor = value || "#000000";
    const ratio = getContrastRatio(fgColor, bgColor);
    const score = getContrastScore(ratio);
    return (
      <p className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${
        score === "pass" ? "text-emerald-600" : score === "warn" ? "text-amber-600" : "text-rose-600"
      }`}>
        Contrast: {ratio.toFixed(2)}:1 ({score})
      </p>
    );
  };

  return (
    <div className="space-y-4">
      <Section title="Theme preset">
        <div className="grid gap-2 sm:grid-cols-3">
          {BUILT_IN_THEMES.map((theme) => {
            const isActive = currentPresetId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handlePresetSelect(theme.id)}
                className={`flex min-h-[56px] items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)]/5"
                    : "border-[color:var(--wsu-border)] bg-white hover:border-[color:var(--wsu-crimson)]"
                }`}
              >
                <span className="text-sm font-semibold text-[color:var(--wsu-ink)]">{theme.label}</span>
                <div className="flex -space-x-1">
                  <div className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: theme.tokens.accentColor }} />
                  <div className="h-3 w-3 rounded-full border border-white" style={{ backgroundColor: theme.tokens.backgroundColor }} />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-[color:var(--wsu-crimson)] hover:underline"
      >
        {isExpanded ? "Hide customization" : "Customize look & feel"}
        {hasOverrides && !isExpanded && (
          <span className="rounded-full bg-[color:var(--wsu-crimson)] px-1.5 py-0.5 text-[10px] text-white">
            {Object.keys(view.style || {}).length}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-6 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-5">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Section title="Colors">
              <div className="space-y-4">
                {COLOR_TOKENS.map((token) => (
                  <div key={token}>
                    <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">
                      {COLOR_LABELS[token]}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-[color:var(--wsu-border)]">
                        <input
                          type="color"
                          value={(getValue(token) || "").match(/#[0-9A-Fa-f]{3,6}/)?.[0] ?? "#ffffff"}
                          onChange={(e) => updateStyle(token, e.target.value)}
                          className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer"
                        />
                      </div>
                      <div className="relative min-w-0 flex-1">
                        <input
                          type="text"
                          value={view.style?.[token] ?? ""}
                          onChange={(e) => updateStyle(token, e.target.value)}
                          placeholder={currentPreset.tokens[token] as string}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-2.5 py-1.5 font-mono text-xs"
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
                    {renderContrastIndicator(token, getValue(token))}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Typography">
              <div className="space-y-5">

                {/* ── Families ── */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Families</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Body font</label>
                      <select value={getValue("fontFamily")} onChange={(e) => updateStyle("fontFamily", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">All body text, cell values, descriptions</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Heading font</label>
                      <select value={getValue("headingFontFamily")} onChange={(e) => updateStyle("headingFontFamily", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Page title, section title, row headings, field labels (masthead has its own controls)</p>
                    </div>
                  </div>
                </div>

                {/* ── Sizes ── */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Sizes</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Body size</label>
                      <select value={getValue("fontSize")} onChange={(e) => updateStyle("fontSize", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">All body text and cell values</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Page title size</label>
                      <select value={getValue("pageTitleFontSize")} onChange={(e) => updateStyle("pageTitleFontSize", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Main page h1 (e.g. "Graduate Program Contact List")</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Section title size</label>
                      <select value={getValue("headingFontSize")} onChange={(e) => updateStyle("headingFontSize", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">View label h2 below tabs (e.g. "Faculty")</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Row heading size</label>
                      <select value={getValue("rowHeadingFontSize")} onChange={(e) => updateStyle("rowHeadingFontSize", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Card, list, accordion, and table row titles</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Field label size</label>
                      <select value={getValue("fieldLabelFontSize")} onChange={(e) => updateStyle("fieldLabelFontSize", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Column headers and field labels in cards/lists</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Action button size</label>
                      <select value={getValue("actionFontSize")} onChange={(e) => updateStyle("actionFontSize", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Contributor sign in, Print/PDF, layout switcher pills</p>
                    </div>
                  </div>
                </div>

                {/* ── Weights ── */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Weights</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Body weight</label>
                      <select value={getFontWeightValue("fontWeight")} onChange={(e) => updateStyle("fontWeight", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">All body text</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Heading weight</label>
                      <select value={getFontWeightValue("headingFontWeight")} onChange={(e) => updateStyle("headingFontWeight", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Section title and row headings only (page title in header uses masthead controls)</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Row heading weight</label>
                      <select value={getNumericFontWeightValue("rowHeadingFontWeight")} onChange={(e) => updateStyle("rowHeadingFontWeight", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Card, list, accordion, and table row titles</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Field label weight</label>
                      <select value={getNumericFontWeightValue("fieldLabelFontWeight")} onChange={(e) => updateStyle("fieldLabelFontWeight", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Column headers and field labels in cards/lists</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">People name weight</label>
                      <select value={getNumericFontWeightValue("peopleNameFontWeight")} onChange={(e) => updateStyle("peopleNameFontWeight", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Name line in grouped people fields (people_group)</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">People contact weight</label>
                      <select value={getNumericFontWeightValue("peopleDetailFontWeight")} onChange={(e) => updateStyle("peopleDetailFontWeight", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Email and phone lines in grouped people fields</p>
                    </div>
                  </div>
                </div>

                {/* ── Style & case ── */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Style & case</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Body style</label>
                      <select value={getValue("fontStyle")} onChange={(e) => updateStyle("fontStyle", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_STYLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Normal or italic on all body text</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Heading style</label>
                      <select value={getValue("headingFontStyle")} onChange={(e) => updateStyle("headingFontStyle", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {FONT_STYLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Normal or italic on page title, section title, row headings</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Field label spacing</label>
                      <select value={getValue("fieldLabelLetterSpacing")} onChange={(e) => updateStyle("fieldLabelLetterSpacing", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {LETTER_SPACING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Letter spacing on column headers and card field labels</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Field label case</label>
                      <select value={getValue("fieldLabelTextTransform")} onChange={(e) => updateStyle("fieldLabelTextTransform", e.target.value)} className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm">
                        {TEXT_TRANSFORM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <p className="mt-0.5 text-[10px] text-[color:var(--wsu-muted)]">Uppercase, capitalize, or none on column headers and labels</p>
                    </div>
                  </div>
                </div>

              </div>
            </Section>

            <Section title="Shape & shadow">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Corner radius</label>
                  <select
                    value={getValue("borderRadius")}
                    onChange={(e) => updateStyle("borderRadius", e.target.value)}
                    className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                  >
                    {BORDER_RADIUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Card shadow</label>
                  <select
                    value={getValue("cardShadow")}
                    onChange={(e) => updateStyle("cardShadow", e.target.value)}
                    className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                  >
                    {SHADOW_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>
          </div>

          <div className="mt-8 space-y-6 border-t border-[color:var(--wsu-border)] pt-8">
            <Section title="Header & masthead">
              <p className="text-xs text-[color:var(--wsu-muted)]">
                Typography and colors for the public page header (logo row, source label, page title, live-data line) and the masthead card. Uses the same reset-to-preset behavior as above.
              </p>
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Masthead card & top rule</p>
                  {HEADER_COLOR_TOKENS.map((token) => (
                    <div key={token}>
                      <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">
                        {HEADER_COLOR_LABELS[token]}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg border border-[color:var(--wsu-border)]">
                          <input
                            type="color"
                            value={(getValue(token) || "").match(/#[0-9A-Fa-f]{3,6}/)?.[0] ?? "#ffffff"}
                            onChange={(e) => updateStyle(token, e.target.value)}
                            className="absolute inset-[-4px] h-[calc(100%+8px)] w-[calc(100%+8px)] cursor-pointer"
                          />
                        </div>
                        <div className="relative min-w-0 flex-1">
                          <input
                            type="text"
                            value={view.style?.[token] ?? ""}
                            onChange={(e) => updateStyle(token, e.target.value)}
                            placeholder={currentPreset.tokens[token] as string}
                            className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-2.5 py-1.5 font-mono text-xs"
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
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Top rule thickness</label>
                    <select
                      value={getValue("headerTopBorderWidth")}
                      onChange={(e) => updateStyle("headerTopBorderWidth", e.target.value)}
                      className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                    >
                      {HEADER_TOP_BORDER_WIDTH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Masthead corner radius</label>
                    <select
                      value={getValue("headerPanelBorderRadius")}
                      onChange={(e) => updateStyle("headerPanelBorderRadius", e.target.value)}
                      className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                    >
                      {BORDER_RADIUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Masthead shadow</label>
                    <select
                      value={getValue("headerPanelShadow")}
                      onChange={(e) => updateStyle("headerPanelShadow", e.target.value)}
                      className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                    >
                      {SHADOW_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Brand lines (next to logo)</p>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Subline font</label>
                        <select
                          value={getValue("headerBrandSublineFontFamily")}
                          onChange={(e) => updateStyle("headerBrandSublineFontFamily", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Subline size</label>
                        <select
                          value={getValue("headerBrandSublineFontSize")}
                          onChange={(e) => updateStyle("headerBrandSublineFontSize", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Subline weight</label>
                        <select
                          value={getNumericFontWeightValue("headerBrandSublineFontWeight")}
                          onChange={(e) => updateStyle("headerBrandSublineFontWeight", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Title font</label>
                        <select
                          value={getValue("headerBrandTitleFontFamily")}
                          onChange={(e) => updateStyle("headerBrandTitleFontFamily", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Title size</label>
                        <select
                          value={getValue("headerBrandTitleFontSize")}
                          onChange={(e) => updateStyle("headerBrandTitleFontSize", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Title weight</label>
                        <select
                          value={getNumericFontWeightValue("headerBrandTitleFontWeight")}
                          onChange={(e) => updateStyle("headerBrandTitleFontWeight", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Title style</label>
                        <select
                          value={getValue("headerBrandTitleFontStyle")}
                          onChange={(e) => updateStyle("headerBrandTitleFontStyle", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_STYLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Title letter-spacing</label>
                        <select
                          value={getValue("headerBrandTitleLetterSpacing")}
                          onChange={(e) => updateStyle("headerBrandTitleLetterSpacing", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {LETTER_SPACING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Source label & page title</p>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Source label font</label>
                        <select
                          value={getValue("headerSourceLabelFontFamily")}
                          onChange={(e) => updateStyle("headerSourceLabelFontFamily", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Source label size</label>
                        <select
                          value={getValue("headerSourceLabelFontSize")}
                          onChange={(e) => updateStyle("headerSourceLabelFontSize", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Source label weight</label>
                        <select
                          value={getNumericFontWeightValue("headerSourceLabelFontWeight")}
                          onChange={(e) => updateStyle("headerSourceLabelFontWeight", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Source label tracking</label>
                        <select
                          value={getValue("headerSourceLabelLetterSpacing")}
                          onChange={(e) => updateStyle("headerSourceLabelLetterSpacing", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {LETTER_SPACING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Source label case</label>
                        <select
                          value={getValue("headerSourceLabelTextTransform")}
                          onChange={(e) => updateStyle("headerSourceLabelTextTransform", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {TEXT_TRANSFORM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Page title font</label>
                        <select
                          value={getValue("headerPageTitleFontFamily")}
                          onChange={(e) => updateStyle("headerPageTitleFontFamily", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Page title size (header only)</label>
                        <select
                          value={getValue("headerPageTitleFontSize")}
                          onChange={(e) => updateStyle("headerPageTitleFontSize", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Page title weight</label>
                        <select
                          value={getNumericFontWeightValue("headerPageTitleFontWeight")}
                          onChange={(e) => updateStyle("headerPageTitleFontWeight", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_WEIGHT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Page title style</label>
                        <select
                          value={getValue("headerPageTitleFontStyle")}
                          onChange={(e) => updateStyle("headerPageTitleFontStyle", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_STYLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Page title tracking</label>
                        <select
                          value={getValue("headerPageTitleLetterSpacing")}
                          onChange={(e) => updateStyle("headerPageTitleLetterSpacing", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {LETTER_SPACING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--wsu-border)]">Live data line</p>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Line size</label>
                        <select
                          value={getValue("headerLiveBlurbFontSize")}
                          onChange={(e) => updateStyle("headerLiveBlurbFontSize", e.target.value)}
                          className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                        >
                          {FONT_SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <p className="text-xs text-[color:var(--wsu-muted)]">
            Tokens with × are overrides. Click × to reset to the preset default.
          </p>
        </div>
      )}
    </div>
  );
}
