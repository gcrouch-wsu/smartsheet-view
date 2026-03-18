# Smartsheets View Future Build Plan

Private planning document for `smartsheets_view` only. Do not commit.

## Current Baseline

The app already has the core display platform in place:

- Admin builder for sources and views
- Public layouts for table, cards, list, accordion, tabbed, stacked, and list-detail
- Per-view theme token overrides with live contrast feedback
- Schema-drift checks before publish
- Public search, A-Z index, preview, and embed output

That means the remaining work for items 1, 2, and 3 is mostly productization, seeded examples, and documentation rather than inventing the rendering pipeline from scratch.

## Delivery Order

1. Reusable custom themes
2. Example gallery with placeholder data
3. Instructions and examples webpage

Item 3 depends on item 2 because the docs should reuse the seeded example gallery rather than invent a second demo system.

---

## 1. Reusable Custom Themes In Admin

### Goal

Move from per-view token overrides only to named, reusable custom theme presets that admins can create once and apply across many views.

### What Exists Today

- Built-in presets are code-defined in `src/lib/config/themes.ts`
- `ThemeEditor` already exposes all 12 tokens and shows contrast feedback
- Views already support `themePresetId` plus per-view `style` overrides

### Gaps To Close

- No theme persistence layer
- No theme CRUD routes
- No named custom themes in the admin
- No safe distinction between built-in presets and admin-created presets

### Implementation Plan

#### Phase 1: Data model and storage

- Add a theme store alongside the existing source/view store interfaces.
- Extend the store interface with:
  - `listThemeConfigs()`
  - `getThemeConfigById(themeId)`
  - `saveThemeConfig(theme)`
  - `deleteThemeConfig(themeId)`
- Add file-backed theme storage at `smartsheets_view/config/themes/*.json`.
- Add DB-backed theme storage to the Postgres config layer.
- Keep built-in themes code-defined and non-deletable.
- Resolve active themes by combining built-ins plus stored themes, with stored theme ids blocked from colliding with built-ins.

#### Phase 2: Validation and merge behavior

- Add validation for `ThemeConfig` ids, labels, and all 12 tokens.
- Update `mergeThemeTokens` so it can resolve both built-in and stored presets.
- Keep per-view `style` overrides working on top of either built-in or custom presets.
- Enforce contrast rules at save time:
  - warn below 4.5:1
  - block save below 3:1 for the required token pairs

#### Phase 3: Admin API

- Add `GET/POST /api/admin/themes`.
- Add `PUT/DELETE /api/admin/themes/[id]`.
- Reject edits or deletes for built-in themes.
- Reject delete when a custom theme is currently referenced by one or more views unless the request explicitly reassigns those views first.

#### Phase 4: Admin UI

- Update `ThemeEditor` to load built-in and custom themes together.
- Add a `Create theme` action that starts from:
  - a blank default theme, or
  - a duplicate of the currently selected preset
- Add inline fields for theme name and id-safe slug generation.
- Show saved custom themes as selectable cards next to built-ins.
- Keep the current preset-switch confirmation when unsaved overrides would be lost.
- Add `Save as theme`, `Update theme`, `Duplicate theme`, and `Delete theme`.
- Keep per-view overrides visible as a separate layer so admins understand:
  - selected theme preset
  - local view overrides on top of that preset

#### Phase 5: Tests and rollout

- Add validation tests for theme persistence and contrast enforcement.
- Add store tests for file and DB modes.
- Add API tests for create, update, delete, and built-in protection.
- Add a UI smoke test plan covering:
  - create theme from preset
  - assign to view
  - update theme and verify other views pick it up
  - blocked delete when in use

### Acceptance Criteria

- Admin can create a named custom theme and reuse it across multiple views.
- Built-in themes remain immutable.
- Existing views with built-in `themePresetId` continue to render unchanged.
- Per-view overrides still work after applying a saved custom theme.
- Theme save is blocked when contrast falls below the hard minimum.

### Out Of Scope

- Public theme marketplace
- Theme import/export
- Theme version history

---

## 2. Example Gallery With Placeholder Data

### Goal

Ship realistic example sources and views so a new admin can explore every layout without first connecting a live Smartsheet asset.

### What Exists Today

- Rendering pipeline is already complete
- View templates already exist for multiple layouts
- Source model currently supports only `sheet` and `report`

### Gaps To Close

- No local example dataset type
- No seed process for example sources/views
- No admin labeling or publish restrictions for example content
- No reusable example assets for docs and demos

### Implementation Plan

#### Phase 1: Source abstraction

- Extend `SourceType` to include `example`.
- Add example-specific source fields:
  - `exampleKey`
  - optional `exampleLabel`
- Introduce a source-loading layer that routes by source type:
  - `sheet` and `report` continue through the Smartsheet client
  - `example` loads a local JSON dataset from disk
- Keep the resolved dataset shape identical to `SmartsheetDataset` so the rest of the pipeline stays unchanged.

#### Phase 2: File structure

- Add `smartsheets_view/config/examples/datasets/*.json` for normalized datasets.
- Add `smartsheets_view/config/examples/sources/*.json` for source definitions.
- Add `smartsheets_view/config/examples/views/*.json` for prebuilt view definitions.
- Start with six examples:
  - faculty-directory
  - staff-list
  - event-calendar
  - grant-recipients
  - program-guide
  - resource-library

Each example should demonstrate a distinct layout and at least one transform or render behavior that matters in real use.

#### Phase 3: Seed and reset tooling

- Add `scripts/seed-examples.mjs`.
- Add `npm run seed:examples`.
- Seed behavior should:
  - create missing example sources
  - create or update matching example views
  - avoid duplicating records on repeated runs
- Add optional `npm run seed:examples:reset` only if cleanup becomes necessary during development.

#### Phase 4: Admin behavior

- Show example sources clearly as `Example - not connected to Smartsheet`.
- Prevent publication for any view backed by an example source.
- Surface a clear message in the builder when publish is blocked for example-backed views.
- Allow preview and editing so admins can learn from the examples.
- Prefer duplicate-and-edit as the handoff path from example to production view.

#### Phase 5: Example quality bar

- Every example must include:
  - sensible field labels
  - realistic row counts
  - at least one filter or sort where relevant
  - a layout that looks complete on desktop and mobile
- Cover these behaviors across the full set:
  - mailto links
  - phone links
  - badge fields
  - formatted dates
  - multiline text
  - list-detail navigation
  - tabbed view behavior

#### Phase 6: Tests

- Add loader tests for `example` sources.
- Add validation tests for example source config.
- Add publish-gate tests to ensure example-backed views cannot go public.
- Add seed-script verification for idempotent writes.

### Acceptance Criteria

- Fresh local setup can run `npm run seed:examples` and see all example sources and views in the admin.
- Example views render through the same public-view pipeline as live Smartsheet views.
- Example-backed views cannot be published.
- Docs and future demos can reference the seeded examples directly.

### Out Of Scope

- Live sync from examples to Smartsheet
- User-uploaded CSV demo imports
- Separate example-only deployment

---

## 3. Instructions And Examples Webpage

### Goal

Add built-in product documentation and live demos so admins and end users can learn the app without leaving the deployment.

### Recommended Approach

Build this into the app first as `/docs`. Do not start with a separate site. A standalone docs site can come later if the content grows beyond what belongs in the product.

### What Exists Today

- No `/docs` route
- Existing README and project spec are developer-facing, not admin-facing
- Example gallery from item 2 can become the live demo layer once seeded

### Implementation Plan

#### Phase 1: Route structure

- Add `src/app/docs/page.tsx` as the docs landing page.
- Add subpages:
  - `src/app/docs/admin/page.tsx`
  - `src/app/docs/end-users/page.tsx`
  - `src/app/docs/examples/page.tsx`
- Add a shared docs nav component so the docs section feels like one product area.
- Add an admin header link to `/docs`.

#### Phase 2: Content model

- Keep initial content in typed data modules or MDX-lite content files inside the app repo.
- Do not over-engineer CMS editing in v1.
- Organize the admin guide into short, task-oriented sections:
  - connect a source
  - build a view
  - choose a layout
  - configure fields
  - configure filters and sort
  - preview and publish
  - theme and embed
  - troubleshoot common failures
- Organize the end-user guide into short how-to sections:
  - search and A-Z navigation
  - tab switching
  - list-detail usage
  - mobile guidance
  - reporting incorrect data

#### Phase 3: Live examples section

- Reuse the item 2 seeded examples rather than hardcoding separate demo pages.
- Show an example gallery page with:
  - example description
  - layout type
  - what the example demonstrates
  - link to the live preview
  - copyable embed snippet for examples that make sense to embed
- Keep example views clearly marked as demo content.

#### Phase 4: Supporting assets

- Capture annotated screenshots from the admin for the core builder tabs.
- Add small before-and-after transform examples for the most common operations.
- Document current supported layouts, render types, filter operators, and publish constraints from real code, not aspirational features.

#### Phase 5: UX and maintenance

- Keep docs pages fast, static, and deployable with the app.
- Add a short maintenance note at the top of each docs section with the last review date.
- Update docs as part of feature work whenever a builder tab, source model, or publish rule changes.

### Acceptance Criteria

- `/docs` exists and is navigable from the app.
- Admin guide covers the current source, view, preview, publish, theme, and embed workflows.
- End-user guide explains how to use public views.
- Live examples page reuses the seeded example gallery from item 2.
- Docs content matches actual app behavior as shipped.

### Out Of Scope

- Separate docs repo
- Full MDX blog system
- Search indexing across docs

---

## Working Rule For This File

When a feature in this file is implemented, update this plan to reflect the new baseline before adding more future work. This file should stay execution-oriented, not become a stale wishlist.
