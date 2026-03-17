# Admin UI Rebuild Plan

**Goal:** Configure everything in admin and show the configured pages. Admins control data display and page appearance (colors, fonts, background, etc.).

---

## Current Implementation State

What is already built — do not re-implement, only extend:

| Area | Status | Notes |
|------|--------|-------|
| Auth / session | ✅ Built | `requireAdminPageAccess()` guards all admin routes; bootstrap owner + managed users (file or Postgres); scrypt password hashing; session tokens |
| Admin dashboard | ✅ Built | Stat cards, recent sources/views list, session info panel |
| Source form | ✅ Built | `SourceForm.tsx` — connection test, schema fetch inline |
| ViewBuilder (v2) | ✅ Built | `ViewBuilder.tsx` ~1063 lines — four-tab layout (Setup, Fields, Filters & Sort, Preview); schema-aware column picker; arrange/reorder; transform badges; unmapped field highlighting; theme preset picker; publish/unpublish; delete; duplicate; toast feedback |
| Config types | ✅ Built | `ViewStyleConfig` (12 tokens + deprecated `primaryColor`); `ThemeConfig`; `ViewPresentationConfig`; `ViewConfig.fixedLayout?`; `ViewConfig.themePresetId?` |
| Layout types | ✅ Built | table, cards, list, tabbed, stacked, accordion, list_detail |
| Config validation | ✅ Built | `src/lib/config/validation.ts` — validates all layouts, render types, filter ops, transform ops |
| Templates | ✅ Built | 6 directory templates; `applyViewTemplate()` sets layout + presentation + starter fields |
| Public layouts | ✅ Built | All 7 layout components; `ViewRenderer.tsx` dispatches; `layout-utils.ts` heading/summary helpers |
| Schema drift check | ✅ Built | `collectSchemaDriftWarnings()` — blocks publish on drift; `admin-management.ts` also runs drift on save when `public: true` |
| Embed support | ✅ Built | `?embed=1` on public view; `EmbedHeightReporter` posts height to parent |
| Theme system | ✅ Built | `src/lib/config/themes.ts` — 3 built-in presets (WSU Crimson, Minimal, Dark); `mergeThemeTokens(presetId, overrides)`; `ViewStyleWrapper` maps tokens to `--view-*` CSS vars |
| Preview API | ✅ Built | `POST /api/admin/preview` — accepts full `ViewConfig`, returns `{ rows, fields, warnings, rowCount }`; no save required |
| Delete operations | ✅ Built | `deleteAdminView` / `deleteAdminSource` in `admin-management.ts`; source delete checks for referencing views |
| View duplication | ✅ Built | `duplicateAdminView` — copies view with `draft_` slug prefix, resets `public: false` |
| Toast system | ✅ Built | `useToast()` hook wired in all ViewBuilder actions |

**Known bugs — original list (pre-Phase 3 build):**

| Bug | Status | Fix |
|-----|--------|-----|
| Publish bypass ("Treat as published" checkbox) | ✅ Fixed | Checkbox removed; `saveAdminViewConfig` runs drift check when `view.public === true` |
| No delete | ✅ Fixed | `deleteAdminView` / `deleteAdminSource` in `admin-management.ts` with source safety check |
| Stale schema at publish | ✅ Fixed | `getPublicationWarnings` passes `{ fresh: true }` to `getSmartsheetSchema` |
| Layout switcher visible to public | ⚠️ Partial | `fixedLayout` toggle added to ViewBuilder Setup; public page wiring not yet confirmed |

**Known bugs — Phase 3–5 audit (found in code review):**

| # | Severity | File | Bug | Fix |
|---|----------|------|-----|-----|
| B1 | High | `ViewBuilder.tsx:435,451,461` | `startTransition` misused for async ops — save/delete/publish spinner disappears immediately; button appears idle while fetch is still in flight | Replace with per-action `useState` boolean (`isSaving`, `isDeleting`, `isPublishing`) |
| B2 | High | `ViewBuilder.tsx:928–929` | `in`/`not_in` filter array values coerced to string on first edit — filter silently stops matching | On change, parse back to array when `filter.op` is `in` or `not_in`: `raw.split(",").map(s => s.trim()).filter(Boolean)` |
| B3 | High | `admin-management.ts:94–99` | Slug collision on duplicate — duplicating a `draft_faculty` view produces another `draft_faculty`; multiple views share a slug | Check existing slugs and append `_2`, `_3`… until unique |
| B4 | Med | `ViewBuilder.tsx:601–634` | Presentation key fields (headingFieldKey, summaryFieldKey, indexFieldKey) are free-text inputs — a typo silently breaks heading/summary rendering | Replace with `<select>` dropdowns populated from `view.fields` |
| B5 | Med | `ViewStyleWrapper.tsx:39–44` | `primaryColor` overwrites `accentColor` for `--view-accent` because it appears later in `Object.entries` iteration — deprecated field silently wins | Skip `primaryColor` in the CSS var loop when `accentColor` is already set |
| B6 | Med | `ViewStyleWrapper.tsx:47–48` | `--wsu-crimson-dark` set to same value as accent — all hover states lose darkening effect | Do not set `--wsu-crimson-dark` from theme tokens; let the existing CSS definition handle it, or add an `accentColorDark` token |
| B7 | Low | `ViewBuilder.tsx:597` | Tab order `\|\| 0` fallback: clearing the field stores `0` instead of `undefined` | Change to `parseOptionalNumber(event.target.value) ?? 1` |

**Scope gaps — Phase 4 (not yet implemented):**

| Gap | Spec Reference | Status |
|-----|---------------|--------|
| Full token override UI (all 12 tokens) | Phase 4.2 — color pickers, font dropdowns, radius slider per token | ❌ Only accent color override is implemented |
| WCAG contrast check on color pickers | Theme Token Set — warn below 4.5:1, block below 3:1 | ❌ Not implemented |
| Preset color swatches on theme cards | Phase 4.2 — cards should show what a theme looks like before applying | ❌ Cards show name only |
| Preset switch confirmation modal | Design Choices — "Switching will reset your customizations. Continue?" | ❌ Not implemented; switching preset silently replaces tokens |

**Minor issues — Phase 3–5 audit:**

| # | File | Issue |
|---|------|-------|
| M1 | `ViewBuilder.tsx:1048–1060` | Dead code: old `<section className="... hidden">` publish outputs block still in DOM — remove |
| M2 | `ViewBuilder.tsx` | ARIA tab roles missing: `role="tablist"` on nav, `role="tab"` + `aria-selected` on buttons, `role="tabpanel"` on content divs |
| M3 | `ViewBuilder.tsx:514` | Template card selected state uses `view.layout === template.layout` — highlights card on any matching layout, not just when that template was applied; track `lastAppliedTemplateId` in local state |
| M4 | `ViewBuilder.tsx:805` | Unmapped field tooltip uses `title` attribute — inaccessible on touch; replace with visible amber text label |
| M5 | `ViewBuilder.tsx:513` | Template card buttons lack `min-h-[44px]` (layout buttons have it); add for touch consistency |
| M6 | `ViewStyleWrapper.tsx:30–34` | `hasAny` check is dead code — `mergeThemeTokens` always returns a non-empty object via `DEFAULT_THEME` fallback; remove |

---

## Design Choices (Locked)

| Choice | Selection | Notes |
|--------|-----------|-------|
| **Scope** | Option C: Shared themes with per-view overrides | Define reusable themes; each view can override specific values. |
| **Controls** | Option C: Presets + custom overrides | Pick a preset (e.g. WSU Crimson), then optionally tweak individual values. |
| **Defaults** | Option B: Single default theme, best practices | New views use a polished default theme (WSU Crimson or equivalent). |
| **CSS approach** | Option B: Named theme tokens | Small set of tokens (accent, background, cardBg, fontFamily, etc.) mapped to CSS variables. |
| **Font strategy** | Curated system + web-safe list | No external font loading by default; offer a curated list of system fonts (system-ui, Georgia, etc.) + optionally one web font per preset. Google Fonts only if explicitly added. |
| **Preset merge** | Reset to preset, then re-apply overrides | Switching presets resets all tokens to the new preset's defaults, then re-applies any token that was explicitly overridden before the switch. Show confirmation if overrides will be reset. |
| **Responsive admin** | Top-header nav wraps on ≤768px | Admin uses a top header card with horizontal pill nav. On narrow viewports, action buttons and nav pills wrap; ViewBuilder tab panels stack vertically. |

---

## Theme Token Set

Extends the existing `ViewStyleConfig` (currently: primaryColor, accentColor, borderRadius).

| Token | CSS Variable | Purpose | Example |
|-------|-------------|---------|---------|
| `backgroundColor` | `--view-bg` | Page background | `#f8f6f3` |
| `cardBackground` | `--view-card-bg` | Card/panel background | `#ffffff` |
| `accentColor` | `--view-accent` | Links, buttons, highlights | `#a60f2d` |
| `textColor` | `--view-text` | Primary text | `#231f20` |
| `mutedColor` | `--view-muted` | Secondary/label text | `#6b7280` |
| `borderColor` | `--view-border` | Borders | `#e5e7eb` |
| `fontFamily` | `--view-font` | Body font | `system-ui` |
| `headingFontFamily` | `--view-heading-font` | Headings (optional; inherits body if unset) | Same or different |
| `borderRadius` | `--view-radius` | Card/button radius | `0.5rem` |
| `cardShadow` | `--view-card-shadow` | Card drop shadow | `0 4px 6px -1px rgba(0,0,0,0.1)` |
| `badgeBg` | `--view-badge-bg` | Badge render type background | `#f3f4f6` |
| `badgeText` | `--view-badge-text` | Badge render type text | `#374151` |

**Accessibility constraint:** Color picker for `accentColor` and `textColor` must show a live WCAG AA contrast ratio against their paired background token. Warn (yellow) below 4.5:1; block save (red) below 3:1.

**Embed note:** When `?embed=1` is active, theme CSS variables are still applied to the view container. Outer host page styles do not override them.

---

## columnType → Render Type Auto-Suggestion

When a column is selected from the schema picker, auto-suggest a default render type and warn about incompatible transforms. Admin may override.

| Smartsheet Column Type | Suggested Render Type | Suggested Transforms | Notes |
|------------------------|----------------------|---------------------|-------|
| `TEXT_NUMBER` | `text` | — | Numbers render as text by default |
| `DATE` | `date` | `format_date` | Produces sortValue (ISO) automatically |
| `DATETIME` | `date` | `format_date` | Same as DATE |
| `PICKLIST` | `badge` | — | Single-select; badge color uses theme tokens |
| `MULTI_PICKLIST` | `list` | `split` | Multi-value; splits on delimiter |
| `CONTACT_LIST` | `mailto` | `contact_emails` | Single contact; extracts email(s) |
| `MULTI_CONTACT_LIST` | `mailto_list` | `contact_emails` | Multiple contacts; extracts all emails |
| `CHECKBOX` | `badge` | — | true/false as badge |
| `DURATION` | `text` | — | Raw string |
| `ABSTRACT_DATETIME` | `date` | `format_date` | — |

---

## Implementation Phases

### Phase 1: Quick Wins

#### 1.1 Wire `fixedLayout` flag on public page
- **File:** `src/app/view/[slug]/page.tsx`
- **Change:** When `view.fixedLayout === true`: (a) hide the layout switcher UI, and (b) ignore the `?layout=` query param. Admin-configured layout is authoritative. Do NOT delete the switcher code — it remains useful for views without `fixedLayout`.
- **Admin UI:** ViewBuilder Setup tab — add "Lock layout for viewers" toggle that sets `fixedLayout`.
- **Scope:** ~10 lines in public page; ~5 lines in ViewBuilder

#### 1.2 Add back navigation (breadcrumbs)
- **Files:** ViewBuilder pages, SourceForm pages, admin users pages
- **Change:** Breadcrumb links (e.g. Dashboard → Views → [View Name], Dashboard → Sources → [Source Name])
- **Scope:** ~10 lines each

#### 1.3 Delete operations
- **Files:** `src/lib/config/admin-store-interface.ts`, `src/lib/config/admin-store.ts`, `src/lib/config/file-store.ts`, ViewBuilder UI, SourceForm UI
- **Change:** Add `deleteSourceConfig(id)` and `deleteViewConfig(id)` to `ConfigAdminStore`. Add corresponding API routes. Add "Delete" button to ViewBuilder and SourceForm with confirmation dialog.
- **Source delete safety:** Before deleting a source, check whether any views reference it (`view.sourceId === id`). If references exist, block the delete and show: "N view(s) use this source. Remove or reassign them first."
- **Scope:** ~30 lines in store + ~20 lines each for API routes + UI buttons

#### 1.4 Fix publish bypass
- **File:** `src/components/admin/ViewBuilder.tsx`
- **Change:** Remove "Treat as published after next save" checkbox. Publication state may only change via the `/api/admin/views/[id]/publish` route (which runs schema drift check). The save route must not accept `public: true` in the body.
- **Scope:** ~15 lines removed from ViewBuilder; add guard in save route

#### 1.5 Fix stale schema at publish
- **File:** `src/app/api/admin/views/[id]/publish/route.ts`
- **Change:** The publish route currently calls `getSmartsheetSchema` which respects the source's `cacheTtlSeconds` TTL. This means drift check can run against a stale schema. In the publish route only, bypass the cache (e.g. pass `forceRefresh: true` or `ttl: 0`) so drift is checked against the live schema.
- **Scope:** ~5 lines in publish route; ensure `getSmartsheetSchema` accepts a bypass option

#### 1.6 Add toast / notification system
- **File:** New `src/components/admin/Toast.tsx` (or use a library such as `sonner`)
- **Change:** Admin actions (save, publish, delete, test connection) currently have no visible success/error feedback. Add a lightweight toast stack. All admin form submissions show a toast on success or error.
- **Scope:** ~40 lines + wiring in all admin action handlers

---

### Phase 2: Schema-Aware Column Picker

#### 2.1 Column picker returns Smartsheet column type
- **Requirement:** When a source is selected, fetch schema. Column picker shows `{ title, type }` per column. Selection stores `columnId`, `columnTitle`, and **`columnType`** (e.g. `TEXT_NUMBER`, `PICKLIST`, `CONTACT_LIST`, `MULTI_CONTACT_LIST`).
- **Config change:** Extend `FieldSourceSelector` / `ViewFieldSource` to include `columnType?: string` when selected from schema. Also extend `ViewFilterConfig` (filter column picker selects a schema column, so `columnType` belongs there). `ViewSortConfig` uses a view field key (`field: string`), not a raw column ref — sort picker selects from view fields, not schema columns directly; `columnType` does not belong on `ViewSortConfig`.
- **API:** Schema endpoint already returns `SmartsheetColumn[]` with `type`. Confirm `type` is present in response.
- **UI:** Replace column-title text inputs with searchable dropdowns. Each option shows `title` and `type` (e.g. `Program Name (TEXT_NUMBER)`). On select, store `columnId`, `columnTitle`, `columnType`.
- **Auto-suggest:** On column selection, auto-populate render type and suggest compatible transforms per the mapping table above. Admin may override.

---

### Phase 3: ViewBuilder Restructure ✅ Implemented (bugs B1–B4, B7; minor M1–M5)

> **Dependency met:** Phase 6 preview API is built; Preview tab uses it.

#### 3.1 Four-tab layout
- **Setup** — Label, slug, source, `fixedLayout` toggle, layout picker (visual cards), tab order, publish state, **theme preset + overrides**, view duplication button
- **Fields** — Schema-aware field mapping; collapsed field cards with up/down reorder; transforms as badge chips; column picker shows title + type; auto-suggested render type shown on column select
- **Filters & Sort** — Two sections; column picker from schema (returns columnId, columnTitle, columnType); filter operator list driven by columnType
- **Preview** — Live preview panel powered by `POST /api/admin/preview` (Phase 6); resolved rows; schema drift warnings; row count; viewport width selector (full, tablet 768px, mobile 375px)

#### 3.2 View duplication
- **Setup tab:** "Duplicate view" button creates a copy with a new ID and `draft_` prefix on the slug, then opens the copy in the ViewBuilder.
- **API:** `POST /api/admin/views/[id]/duplicate`

#### 3.3 Responsive admin layout
- Current layout: full-width top header card with horizontal pill nav (`/admin/layout.tsx`). Not a sidebar.
- On ≤768px: header action buttons wrap; nav pills wrap to multiple rows. Consider collapsing nav to a "Menu" dropdown on very narrow viewports.
- Tab panels in ViewBuilder stack vertically on narrow viewports.
- Column picker dropdowns must be touch-friendly (min 44px tap targets).

---

### Phase 4: Theme / Visual Customization ✅ Implemented (bugs B5–B6; scope gaps: full token UI, WCAG check, swatches, preset switch modal)

#### 4.1 Theme config schema
- **Shared themes:** New config type `ThemeConfig` (id, label, tokens). Storage is file-backed (`config/themes/*.json`), consistent with how `ConfigStore` and `ConfigAdminStore` currently work. There is no DB-backed config store yet — when one is added, themes follow the same migration path. Do not add a separate storage mechanism.
- **Per-view overrides:** Extend `ViewConfig.style` to include the full 12-token set. When a theme is applied, view inherits theme tokens; overrides replace specific tokens only.
- **Default theme:** One built-in non-deletable default ("WSU Crimson") used when no theme is selected. Built-in themes are code-defined, not stored in config files.
- **Types:** Update `ViewStyleConfig` in `src/lib/config/types.ts` with all 12 tokens. Add `ThemeConfig` type.

#### 4.2 Theme UI
- **Setup tab:** Theme section with preset cards (WSU Crimson, Minimal, Dark, etc.). "Customize" expands to token overrides (color pickers with WCAG contrast indicator, font dropdowns, radius slider).
- **Preset switch behavior:** Switching preset resets all tokens to the new preset; if the admin had custom overrides, show a modal: "Switching will reset your customizations. Continue?" with Cancel / Reset & Apply.
- **Overrides UI:** Each token row shows the inherited value (from preset) in muted gray and a small "Override" button. Once overridden, the row shows a colored pill with a "Reset to preset" ×.

#### 4.3 CSS application
- **Tokens → CSS variables:** At render time, merge preset tokens + view overrides → set CSS variables on the view container (both public page and preview).
- **Variable names:** Use the `--view-*` prefix as defined in the token table above.
- **Components:** Audit all public layout components to replace hardcoded `--wsu-*` values with `--view-*` equivalents where the intent is view-theming. Preserve `--wsu-*` only for admin UI chrome.
- **Badge tokens:** `badge` render type must use `--view-badge-bg` and `--view-badge-text` instead of hardcoded values.

---

### Phase 5: Template UX ✅ Implemented

#### 5.1 Prominent template cards
- **Setup tab:** Templates as visual cards (layout icon + name + brief description), shown before any fields are added or as a "Start from template" section. Not buried in a dropdown.
- **On apply:** Apply template → auto-switch to Fields tab; highlight unmapped field slots (fields with no `columnId` set) in orange; show tooltip "Map this field to a column".

#### 5.2 Template slots
- Templates define field slots (key, suggested label, suggested render type). Admin maps each slot to a schema column via the column picker.
- Column picker auto-suggest: when a slot has a suggested render type, filter the column list to show compatible columnTypes first.

---

### Phase 6: Preview from Unsaved Config ✅ Implemented

#### 6.1 New API endpoint
- **Route:** `POST /api/admin/preview`
- **Body:** Full view config (no saved ID required)
- **Response:** `{ rows: ResolvedViewRow[], fields: ResolvedViewField[], warnings: string[], rowCount: number }` — `fields` is `ResolvedViewField[]` (the resolved field-config list, same shape as `ResolvedView.fields`; used to render column headers in the preview)
- **Auth:** Requires admin session (same `requireAdminAccess` guard as other admin API routes)
- **Use:** Powers live preview in ViewBuilder Preview tab without saving

#### 6.2 Validation
- Accept "mostly valid" config; return partial results + validation errors for invalid parts.
- Schema drift: compare config column refs to live schema; flag missing/renamed columns.

#### 6.3 Preview viewport simulation
- The Preview tab renders the resolved view inside an iframe-like container.
- Viewport width selector: Full width / Tablet (768px) / Mobile (375px).
- Theme tokens from unsaved config are applied to the preview container.

---

## Suggested Implementation Order

Phases 1–6 have been implemented. The remaining work is bug fixes and scope gaps from the Phase 3–5 audit.

**Completed:**

| Phase | Status |
|-------|--------|
| Phase 1.4 (publish bypass fix) | ✅ Done |
| Phase 1.5 (stale schema at publish) | ✅ Done |
| Phase 1.1 (fixedLayout wiring — admin toggle) | ✅ Done (public page wiring to confirm) |
| Phase 1.2 (breadcrumbs) | ✅ Done |
| Phase 1.3 (delete operations) | ✅ Done |
| Phase 1.6 (toast system) | ✅ Done |
| Phase 2 (schema-aware column picker) | ✅ Done |
| Phase 6 (preview API) | ✅ Done |
| Phase 3 (ViewBuilder tabs) | ✅ Done — with bugs B1–B4, B7 and minor issues M1–M5 |
| Phase 4 (theme — types, presets, CSS vars) | ✅ Done — with bugs B5–B6 and scope gaps (full token UI, WCAG check) |
| Phase 5 (template UX) | ✅ Done |

**Remaining work (priority order):**

| Order | Item | Rationale |
|-------|------|-----------|
| 1 | Fix B1 — `startTransition` misuse | High: save/delete/publish buttons give false "done" signal |
| 2 | Fix B2 — filter array → string coercion | High: `in`/`not_in` filters silently broken after first edit |
| 3 | Fix B3 — duplicate slug collision | High: multiple views with same slug corrupt public routing |
| 4 | Fix B4 — presentation keys as free-text | Med: typos silently break heading/summary; replace with dropdowns |
| 5 | Fix B5 — `primaryColor` overrides `accentColor` in CSS vars | Med: deprecated field wins over current field |
| 6 | Fix B6 — `--wsu-crimson-dark` loses hover contrast | Med: all hover states identical to normal states |
| 7 | Fix B7 — tab order `\|\| 0` | Low |
| 8 | Remove M1 dead hidden section | Low |
| 9 | Add ARIA tab roles (M2) | Accessibility |
| 10 | Fix M3 template card selected state | Low |
| 11 | Fix M4 unmapped tooltip → visible label | Accessibility/touch |
| 12 | Add M5 `min-h-[44px]` to template cards | Touch targets |
| 13 | Remove M6 `hasAny` dead code | Cleanup |
| 14 | Phase 4 scope gap — full 12-token override UI | Future: color pickers, font dropdowns, radius slider |
| 15 | Phase 4 scope gap — WCAG contrast check | Future: warn/block on low contrast |
| 16 | Phase 4 scope gap — preset color swatches | Future: show theme colors before applying |
| 17 | Phase 4 scope gap — preset switch confirmation modal | Future |

---

## Column Picker Contract (Schema-Aware)

When a column is selected from the schema picker, the selection must include:

| Field | Type | Purpose |
|-------|------|---------|
| `columnId` | number | Stable reference; survives renames |
| `columnTitle` | string | Human-readable; fallback if ID lookup fails |
| `columnType` | string | Smartsheet type (TEXT_NUMBER, PICKLIST, CONTACT_LIST, etc.); drives render type suggestions and transform validity |

Schema API response shape (already in `SmartsheetColumn`):

```ts
interface SmartsheetColumn {
  id: number;
  index: number;
  title: string;
  type: string;      // Required for picker
  options?: string[];
  locked?: boolean;
}
```

Extend `FieldSourceSelector`, `ViewFieldSource`, and `ViewFilterConfig` in `types.ts` to include `columnType?: string`. Do **not** add `columnType` to `ViewSortConfig` — sort uses a view field key (`field: string`), not a raw column reference.

---

## File Touchpoints (Summary)

| Area | Files |
|------|-------|
| fixedLayout wiring | `src/app/view/[slug]/page.tsx` |
| Breadcrumbs | ViewBuilder pages, SourceForm pages, admin users pages |
| Delete operations | `src/lib/config/admin-store-interface.ts`, `admin-store.ts`, `file-store.ts`, new delete API routes |
| Publish bypass fix | `src/components/admin/ViewBuilder.tsx`, save API route |
| Toast system | New `src/components/admin/Toast.tsx`; wired in all admin forms |
| Column picker | ViewBuilder field editor, filter editor, sort editor |
| Schema API | `src/app/api/admin/sources/[id]/schema/route.ts` (confirm `type` in response) |
| Config types | `src/lib/config/types.ts` — extend `FieldSourceSelector`, `ViewFieldSource`, `ViewFilterConfig` with `columnType?` (not `ViewSortConfig`); extend `ViewStyleConfig` to full 12-token set; add `ThemeConfig` |
| ViewBuilder tabs | `src/app/admin/views/[id]/page.tsx`, `src/components/admin/ViewBuilder.tsx` |
| View duplication | New `src/app/api/admin/views/[id]/duplicate/route.ts` |
| Theme config storage | New `src/lib/config/theme-store.ts`; `config/themes/` dir for file mode |
| CSS variables | All public layout components — replace `--wsu-*` theme values with `--view-*` |
| Preview API | New `src/app/api/admin/preview/route.ts` |
| Preview viewport | `src/components/admin/PreviewPanel.tsx` (new) |
| Public page styling | `src/app/view/[slug]/page.tsx` — inject CSS variables from resolved theme + overrides |
