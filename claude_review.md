# Smartsheets View - Project Roadmap

**Last updated:** 2026-03-16

---

## Vercel Deployment

The project is configured for Vercel:

- `vercel.json` – `npm ci` for reproducible installs, `npm run build` for build
- `.gitignore` – excludes `.next/`, `node_modules/`, `*.tsbuildinfo`; commit `package-lock.json`
- `config/sources/` and `config/views/` – committed and deployed with the app
- Environment variables: `SMARTSHEET_API_TOKEN`, `SMARTSHEETS_VIEW_ADMIN_USERNAME`, `SMARTSHEETS_VIEW_ADMIN_PASSWORD`

---

## 1. What This App Is

A generic, config-driven, embeddable Next.js display layer for Smartsheet. Smartsheet is the source of truth. The app fetches live data server-side, normalizes it through a declarative transform pipeline, and renders clean public pages suitable for direct linking or WordPress iframe embedding.

It is not a Smartsheet replacement, a writeback tool, or a report builder inside Smartsheet.

First deployment: GRAD Programs - Faculty Contacts and Staff Contacts views, reading from sheet ID `7763577444192132`.

Architecture layers (all built):

```text
smartsheet.ts -> public-view.ts -> transforms.ts + filters.ts -> React components
```

Stack: Next.js App Router, TypeScript, Tailwind v4, Vercel. The current deployment uses the file-based config mode; DB-backed managed mode remains future work.

---

## 2. Phase 1 - Status

**Implementation complete.** 27/27 tests pass. Production build passes.

### What is built

- Smartsheet client with multi-connection support, configurable base URL (US/EU/AU/gov), source-level ISR cache, and a real connection test.
- Full `value` / `displayValue` / `objectValue` handling with configurable `level` fetch support, including CONTACT_LIST, MULTI_CONTACT_LIST, and MULTI_PICKLIST normalization.
- File-based source and view config that already covers field selection, field order, label overrides, filters, sorts, tab order, helper-column preference, fallback columns, and coalesce chains.
- Public pages that support multiple named views per slug, shareable `?view=` URLs, and optional `?layout=` switching between `table`, `cards`, and `list`.
- Sheet and report read paths in the data layer, including preserved `row.sheetId` metadata for report rows.
- Transform engine with 16 supported ops: `trim`, `split`, `extract_emails`, `extract_phones`, `dedupe`, `filter_empty`, `to_contact_list`, `contact_names`, `contact_emails`, `join`, `lowercase`, `uppercase`, `format_date`, `url_from_value`, `coalesce`, and `reset_to_source`.
- Filter engine with all 8 Phase 1 operators and contact-aware comparable normalization that ignores Smartsheet contact metadata strings.
- Sort engine with multi-column sort, numeric-aware comparison, stable row-id tiebreaker, and dedicated `sortValue` support for date render types.
- Full Phase 1 render vocabulary: `text`, `multiline_text`, `list`, `mailto`, `mailto_list`, `phone`, `phone_list`, `link`, `date`, `badge`, and `hidden`.
- `emptyBehavior: "hide"` implemented end-to-end across table, cards, and list layouts.
- Public-route resilience: loading skeleton, route-level error page, empty state component, field-level transform fault isolation, and schema-drift warnings logged server-side when configured columns no longer exist.
- WordPress embedding support: `Content-Security-Policy: frame-ancestors *`, `embed=1` chrome reduction, and `postMessage` height reporting from embedded pages.
- Public JSON API at `/api/public/views/[slug]` that returns the fully resolved page payload for a slug.
- WSU visual language: crimson accents, neutral cards, restrained typography, and mobile-safe layouts.
- Automated coverage for transforms, filters/sorting, view resolution, and Smartsheet normalization using JSON fixtures.

### Deployment validation still recommended

- Run live QA against the GRAD Programs sheet with real credentials.
- Verify mixed email/name fields against current production data.
- Test the WordPress iframe integration with the intended embed snippet or parent listener.

---

## 3. Phase 2 - Status

**Phase 2 complete in the file-backed deployment mode.** 27/27 tests pass. Production build passes.

### What is built

- Runtime validation for `SourceConfig`, `ViewConfig`, nested field config, transforms, filters, sort rules, and view presentation settings.
- Expanded config store contracts that now cover read and write flows for sources, views, delete operations, and publish state in file-backed lite mode.
- Admin route surface at `/admin`, `/admin/sources`, `/admin/sources/[id]`, `/admin/views`, `/admin/views/[id]`, and `/admin/views/[id]/preview`, protected by server-side HTTP Basic auth in middleware.
- Admin API surface for source create/update/delete, schema fetch, view create/update/delete, preview fetch, and publish/unpublish.
- Source registry UI that supports multiple source registrations, sheet/report source types, connection testing, schema inspection, and source-level fetch/caching options.
- View builder UI for layout selection, field mapping, filters, default sort, transforms, title-or-ID selector entry, visibility, tab order, and embed output.
- Reusable starter templates for common directory layouts.
- Preview flow that uses the same resolved renderer contract as public pages, bypasses source caching for admin checks, and surfaces schema-drift warnings before publish.
- Save and publish flows both block any transition to a public view when the current schema no longer satisfies the configured field/filter selectors.
- Phase 2 layout vocabulary implemented end-to-end: `tabbed`, `stacked`, `accordion`, and `list_detail`, alongside the original `table`, `cards`, and `list` layouts.
- Presentation controls for choosing heading and summary fields instead of hard-coding row header behavior to `row.fields[0]`.
- WordPress embed helper output in the builder, on top of the existing `embed=1` and height-report runtime support.
- Delete operations for sources and views, with source deletion blocked while views still reference that source.
- File-backed admin auth via `SMARTSHEETS_VIEW_ADMIN_USERNAME` and `SMARTSHEETS_VIEW_ADMIN_PASSWORD`.

### Still future / incomplete

- DB-backed managed mode with encrypted credentials at rest.
- Richer report hardening for duplicate-title collisions across multi-sheet reports.
- A true unsaved-draft preview API path; current preview is save-first.
- Packaged operator docs for the parent-page embed listener and broader deployment/onboarding guidance.
---

## 4. Phase 3 - Platform Polish

Goal: make the project easier to operate and more reusable across non-GRAD deployments.

### 4.1 Row Detail Pages

Route: `/view/[slug]/rows/[rowId]`

- Full-field detail view for a single row.
- Useful when table or card layouts intentionally hide lower-priority fields.

### 4.2 Attachments Rendering

- Add optional attachment fetching and rendering when a source opts in.
- Keep attachment access server-side so API tokens stay private.

### 4.3 Theme Refinement

- Expand visual polish once the admin and rendering model are stable.
- Keep the visual system restrained and compatible with iframe embedding.

### 4.4 Cache Revalidation Improvements

- Consider webhook-driven cache invalidation once source registration exists.
- Keep short TTL revalidation as a valid fallback for simpler deployments.

### 4.5 Optional Usability Enhancements

- Client-side search for large public views.
- Multi-deployment or multi-space support if the project needs to serve many organizations from one codebase.

---

## 5. Architectural Constraints That Shape Future Work

These decisions are already present in the code and should be treated as real constraints, not loose suggestions:

| Constraint | Implication |
|---|---|
| All Smartsheet API calls are server-side only | Client components and public API consumers only receive resolved public data. |
| File and future DB modes must share the same config schema | The admin builder cannot invent a second view model. |
| The current `ConfigStore` covers reads only | Phase 2 needs an explicit write contract; the DB migration is not just an import swap for admin flows. |
| A single public slug can group multiple views, but all grouped views must share one source | Future multi-view pages cannot quietly mix data sources without changing `loadPublicPage`. |
| `ResolvedFieldValue` and `ResolvedView` are the renderer contract | New layouts should consume resolved public data, not raw Smartsheet cells. |
| `sortValue` is intentionally separate from `textValue` | Future render types that need display formatting but raw sort semantics should follow the same pattern. |
| `normalizeComparable` strips Smartsheet contact metadata strings | Contact filters should match names and emails, not internal object-type markers. |
| Layout types and presentation settings are part of the shared config schema and renderer contract | New layouts or row-header behaviors require coordinated schema, preview, and renderer updates. |
| The public JSON API returns a resolved page payload per slug, not one isolated view | Headless consumers get the full page/view bundle and should select the active view client-side. |

