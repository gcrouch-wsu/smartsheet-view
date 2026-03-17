# Smartsheet View Project Spec

## Status Addendum

As of 2026-03-16, the file-backed deployment path has completed both Phase 1 and Phase 2.

### Deployment (Vercel)

The app is configured for Vercel deployment:

- `vercel.json` specifies `npm run build` and `npm ci` for reproducible installs
- `.gitignore` excludes `.next/`, `node_modules/`, and `*.tsbuildinfo` so no stale build artifacts are committed
- `config/sources/` and `config/views/` are committed and deployed with the app
- Set environment variables in the Vercel project: `SMARTSHEET_API_TOKEN`, `SMARTSHEETS_VIEW_ADMIN_USERNAME`, `SMARTSHEETS_VIEW_ADMIN_PASSWORD`

Current status:

- public rendering engine is complete
- admin builder routes and APIs are complete and protected by HTTP Basic auth
- source registration, schema fetch, delete support, view builder, preview, and publish/unpublish are complete
- Phase 2 layouts are implemented in the shared renderer path
- DB-backed managed mode remains future work
- richer report hardening and operator docs remain future work

## 1. Product Summary

Build a generic, embeddable Next.js app that reads Smartsheet data and renders it as clean public webpages.

Primary requirements:

- Smartsheet remains the source of truth.
- The app works for `GRAD Programs` first, but is not hardcoded to that sheet.
- The app supports both normalization styles:
  - helper columns in Smartsheet for governance
  - app-layer transforms for faster setup and flexibility
- The app can render multiple named views from one source, such as `Faculty` and `Staff`.
- The app is suitable for direct linking or iframe embedding in WordPress.

The app must not depend on exported `.xlsx` files. Those files are reference data only. The production source is the Smartsheet API.

## 2. Reference App To Reuse

Use the `scholarship-review-platform` project as the implementation reference (when available in the same workspace).

Reuse directly or adapt the following patterns:

- `src/lib/smartsheet.ts`
  - server-only Smartsheet client
  - connection test
  - schema fetch
  - row fetch
  - attachment fetch
- `src/app/api/admin/connections/[id]/schema/route.ts`
  - server route pattern for decrypting credentials and returning schema safely
- `src/app/admin/scholarships/[id]/cycles/[cycleId]/builder/FieldMappingBuilder.tsx`
  - config-builder UX
  - layout preview concepts
  - section/tabs model
  - save/preview workflow
- `src/app/admin/scholarships/[id]/cycles/[cycleId]/preview/PreviewNomineeList.tsx`
  - preview loop using live row data
- `src/app/reviewer/layout.tsx`
  - clean application shell
  - restrained WSU visual language
- `src/app/globals.css`
  - WSU color tokens and base styling direction

Do not reuse the scholarship app's auth, reviewer workflows, or scholarship-specific database schema unless and until the admin UI phase requires them.

## 3. Product Positioning

This app is a generic presentation layer for Smartsheet.

It is not:

- a Smartsheet replacement
- a writeback tool in phase 1
- a spreadsheet import/export tool
- a report builder inside Smartsheet

It is:

- a configurable read-only viewer
- a normalization and rendering layer on top of Smartsheet
- a public-facing display app for sheets and reports

## 4. Core Principles

1. Smartsheet is the source of truth.
2. The app reads from Smartsheet live or with a short cache.
3. The app never requires per-sheet hardcoded code paths.
4. The same config model must support both:
   - normalized helper columns in Smartsheet
   - raw columns transformed in the app
5. Public rendering must be read-only at first.
6. Configuration must be declarative.
7. The admin UI, when added, must write the same config schema used by file-based config.

## 5. Supported Source Modes

### 5.1 Sheet Mode

Use a Smartsheet sheet ID as the source.

Best when:

- one master sheet is canonical
- views are derived by filtering/reordering columns in the app
- helper columns exist in the sheet

This is the right mode for `GRAD Programs`.

### 5.2 Report Mode

Use a Smartsheet report ID as the source.

Best when:

- Smartsheet users already maintain report filters
- a report is the business-approved public subset
- the app still needs cleaner rendering than native Smartsheet publish

Notes:

- Reports are read-only presentation sources in this project.
- If a report spans multiple source sheets, the app must preserve row `sheetId` metadata internally.
- Report mode should be supported, but sheet mode is the initial priority.

### 5.3 Dual Normalization Strategy

For every displayed field, the app should support this resolution order:

1. Preferred helper/normalized column in Smartsheet, if configured and populated
2. Fallback raw source column
3. App transform pipeline
4. Empty-state handling

This allows a sheet owner to gradually improve data quality in Smartsheet without requiring new code.

## 6. Smartsheet Compatibility Requirements

The app must be built around actual Smartsheet API behavior, not assumptions from Excel exports.

### 6.1 Column And Cell Handling

The fetch layer must preserve:

- column ID
- column title
- column index
- column type
- column options
- locked state where available
- row ID
- cell `value`
- cell `displayValue`
- cell `objectValue` when available

### 6.2 Contact Columns

Implementation requirements:

- `CONTACT_LIST`
  - treat `value` as email
  - treat `displayValue` as the person name shown in Smartsheet
- `MULTI_CONTACT_LIST`
  - fetch with the appropriate `level` and `include=objectValue`
  - use `objectValue` to access the underlying contacts and email addresses
- `MULTI_PICKLIST`
  - also fetch with `include=objectValue` where needed

### 6.3 Base URL

Do not hardcode only `https://api.smartsheet.com/2.0`.

Support a configurable API base URL so the app can work with:

- `https://api.smartsheet.com/2.0`
- `https://api.smartsheet.eu/2.0`
- `https://api.smartsheet.au/2.0`
- `https://api.smartsheetgov.com/2.0`

Default to the US base URL for this project.

### 6.4 Official API Notes Verified

Relevant Smartsheet docs used to verify the design:

- API introduction: https://developers.smartsheet.com/api/smartsheet/introduction
- Cell value/contact behavior: https://developers.smartsheet.com/api/smartsheet/openapi/contacts
- Sheet cell/objectValue behavior: https://developers.smartsheet.com/api/smartsheet/openapi/sheets/sheet
- Report row schema: https://developers.smartsheet.com/api/smartsheet/openapi/reports/reportrow
- Contact object schema: https://developers.smartsheet.com/api/smartsheet/openapi/schemas/contactobjectvalue

## 7. Target Users

### 7.1 Content/Admin User

This user:

- knows Smartsheet
- owns or manages a sheet/report
- wants to choose what data is shown
- may or may not want to add helper columns in Smartsheet
- wants to publish a clean public view

### 7.2 Public Viewer

This user:

- opens a public webpage or embedded iframe
- searches, scans, and clicks useful links
- does not edit anything

## 8. Functional Scope

## 8.1 Phase 1 Scope

- connect to a Smartsheet sheet by ID
- fetch schema and rows server-side
- define one or more public views by config
- choose columns and order
- rename display labels
- filter rows by configurable rules
- transform raw values for display
- render responsive table/list/card layouts
- embed safely in WordPress

## 8.2 Phase 2 Scope

Status: complete in the current file-backed deployment mode.

- admin UI for source + view setup
- preview transformed rows before publishing
- schema drift checks
- support report sources
- multiple source registrations
- reusable layout templates

## 8.3 Out Of Scope For Initial Build

- editing Smartsheet data
- row updates/writeback
- per-view authentication
- full WYSIWYG design system
- arbitrary custom code transforms per customer

## 9. Architecture

## 9.1 Stack

- Next.js App Router
- TypeScript
- server-side Smartsheet API calls only
- Vercel deployment
- Tailwind v4, matching the reference app

### 9.2 Deployment Modes

Support two config-storage modes behind one interface.

#### Lite Mode

- no database
- config stored in JSON files
- fastest path to production
- best for initial rollout

#### Managed Mode

- Postgres-backed config storage
- admin UI for connections and views
- encrypted tokens at rest
- borrows the connection-management pattern from the scholarship app

The rendering engine must not care whether config came from files or DB.

### 9.3 Layered Design

1. Smartsheet client layer
2. source adapter layer
3. normalization/transform layer
4. view resolver layer
5. renderer layer
6. optional admin/config layer

## 10. Proposed Project Structure

```text
src/
  app/
    layout.tsx
    globals.css
    page.tsx
    view/
      [slug]/
        page.tsx
        loading.tsx
    api/
      public/
        views/
          [slug]/
            route.ts
      admin/
        sources/
          route.ts
          [id]/
            route.ts
            schema/route.ts
        views/
          route.ts
          [id]/
            route.ts
            preview/route.ts
            publish/route.ts
  components/
    public/
      ViewTabs.tsx
      DataTable.tsx
      DataCards.tsx
      DataList.tsx
      EmptyState.tsx
    admin/
      SourceForm.tsx
      ViewBuilder.tsx
      TransformEditor.tsx
      PreviewPanel.tsx
  lib/
    smartsheet.ts
    sources.ts
    normalize.ts
    transforms.ts
    filters.ts
    renderers.ts
    config/
      types.ts
      store.ts
      file-store.ts
      db-store.ts
config/
  sources/
  views/
```

## 11. Configuration Model

The project must be config-driven.

### 11.1 Source Config

```json
{
  "id": "grad-programs",
  "label": "GRAD Programs",
  "sourceType": "sheet",
  "smartsheetId": 7763577444192132,
  "connectionKey": "default",
  "apiBaseUrl": "https://api.smartsheet.com/2.0",
  "cacheTtlSeconds": 120,
  "fetchOptions": {
    "includeObjectValue": true,
    "includeColumnOptions": true,
    "level": 2
  }
}
```

### 11.2 View Config

```json
{
  "id": "faculty",
  "sourceId": "grad-programs",
  "slug": "graduate-program-contacts",
  "label": "Faculty Contacts",
  "description": "Graduate faculty contacts by program",
  "layout": "table",
  "public": true,
  "defaultSort": [
    { "field": "programName", "direction": "asc" }
  ],
  "filters": [
    { "columnTitle": "Program Status", "op": "equals", "value": "Active" }
  ],
  "fields": [
    {
      "key": "programName",
      "label": "Program Name",
      "source": { "columnTitle": "Program Name" },
      "render": { "type": "text" }
    },
    {
      "key": "directorEmails",
      "label": "Graduate Program Director Email",
      "source": {
        "preferredColumnTitle": "Graduate Program Director Email",
        "fallbackColumnTitle": "Graduate Program Director Email"
      },
      "transforms": [
        { "op": "extract_emails" },
        { "op": "dedupe" }
      ],
      "render": { "type": "mailto_list" }
    }
  ]
}
```

### 11.3 Field Resolution Model

Each field should support:

- `source.columnId` or `source.columnTitle`
- `source.preferredColumnId` or `preferredColumnTitle`
- `source.fallbackColumnId` or `fallbackColumnTitle`
- `source.coalesce` for multiple candidate columns
- ordered `transforms`
- `render.type`
- `emptyBehavior`

## 12. Transform Engine

The transform engine is the heart of the generic design.

It must work with:

- clean helper columns
- messy text columns
- contact columns
- multi-value text

### 12.1 Built-In Transform Operations

Initial transform set:

- `trim`
- `split`
- `coalesce`
- `extract_emails`
- `extract_phones`
- `dedupe`
- `filter_empty`
- `to_contact_list`
- `contact_names`
- `contact_emails`
- `join`
- `lowercase`
- `uppercase`
- `format_date`
- `url_from_value`

### 12.2 Rules For Ambiguous Data

Some source strings are ambiguous, for example:

- `Lisa Lujan, marshdj@wsu.edu`
- `bmorton@wsu.edu, Sherley Alvarez`

The app must treat these as best-effort parsing cases, not guaranteed structured contact data.

Design rule:

- deterministic transforms are built-in
- ambiguous data should be overridable by helper columns
- field config can prefer a normalized helper column when available

### 12.3 Grad Programs Example

For `GRAD Programs`, the app should support both of these configurations:

#### Governance-first

- use helper columns such as `Staff Coordinator Emails Clean`
- render directly with minimal transform

#### App-first

- use raw `Staff Graduate Program Coordinator Email`
- apply `extract_emails`
- render as `mailto_list`

Both should use the same field config shape.

### 12.4 Initial Grad Programs Build Target

The first real deployment target is the Smartsheet master sheet with ID `7763577444192132`.

This source currently drives two simple derived reports in Smartsheet:

- `Faculty Contacts`
- `Staff Contacts`

The app should replace those export/report-style outputs with config-defined views that read from the master sheet directly.

#### Faculty view

Initial field set:

- `GRAD Campus`
- `Program Name`
- `Department/School`
- `Program Details`
- `Graduate Program Director Name`
- `Graduate Program Director Email`
- `Faculty Graduate Program Coordinator or Designee`
- `Faculty Graduate Program Coordinator Email`

#### Staff view

Initial field set:

- `Program Name`
- `GRAD Campus`
- `Department/School`
- `Program Details`
- `Faculty Graduate Program Coordinator Email`
- `Faculty Graduate Program Coordinator or Designee`
- `Staff Graduate Program Coordinator or Designee`
- `Staff Graduate Program Coordinator Email`
- `Staff Graduate Program Coordinator Phone Number`
- `Program Shared Email`

#### Known source-data examples that must render correctly

- `Lisa Lujan, marshdj@wsu.edu, thuy.bernhard@wsu.edu`
- `Lisa Lujan, Deb Marsh`
- `(509) 335-9542, (509) 335-0691`

Implementation implications:

- the app must suppress trailing blank master-sheet rows
- the app must not assume an `Email`-labeled column contains only email addresses
- the first public deliverable should be one URL that can switch between `Faculty` and `Staff` views without separate deployments

## 13. Filtering And Sorting

Support per-view filters and sorts.

### 13.1 Filter Operators

- `equals`
- `not_equals`
- `contains`
- `not_contains`
- `in`
- `not_in`
- `is_empty`
- `not_empty`

### 13.2 Sort Support

- ascending
- descending
- multi-column sort

### 13.3 Row Inclusion

Rows with a blank primary field, such as blank `Program Name`, must be suppressible by config.

For `GRAD Programs`, this should be enabled by default to avoid rendering the trailing blank rows.

## 14. Rendering Model

## 14.1 Collection Layouts

Phase 1 layouts:

- `table`
- `cards`
- `list`

Phase 2 layouts:

- `tabbed`
- `stacked`
- `accordion`
- `list_detail`

The phase 2 layout vocabulary should borrow directly from the successful patterns already present in `FieldMappingBuilder.tsx`.

### 14.2 Field Render Types

Initial field render types:

- `text`
- `multiline_text`
- `list`
- `mailto`
- `mailto_list`
- `phone`
- `phone_list`
- `link`
- `date`
- `badge`
- `hidden`

### 14.3 Multiple Views Per Page

The public page should support:

- one source with multiple named views
- tabs or a dropdown switcher
- shareable URLs, for example `?view=faculty`

For `GRAD Programs`, the first production page should include at least:

- `Faculty Contacts`
- `Staff Contacts`

### 14.4 Visual Direction

The app should intentionally resemble the scholarship app's clean, practical style:

- WSU crimson accents
- neutral zinc cards and borders
- restrained typography
- generous spacing
- readable tables
- mobile-safe stacking

Use the scholarship app as the style benchmark, not as a literal copy of its reviewer workflow.

## 15. Public Routes

Recommended route model:

- `/`
  - landing page or redirect
- `/view/[slug]`
  - public rendered page
- `/view/[slug]?view=faculty`
  - specific named view
- `/api/public/views/[slug]`
  - normalized JSON for debugging or headless use

Optional later:

- `/view/[slug]/rows/[rowId]`
  - row detail page

## 16. Admin Routes

Phase 2 route model:

- `/admin`
- `/admin/sources`
- `/admin/sources/[id]`
- `/admin/views`
- `/admin/views/[id]`
- `/admin/views/[id]/preview`

Admin capabilities:

- register a Smartsheet source
- test connection
- fetch schema
- choose columns
- define fields
- define transforms
- preview rows
- publish/unpublish a view

The admin flow should visually and structurally echo the scholarship app's connection + builder + preview flow.

## 17. API Design

## 17.1 Smartsheet Client

Extend the reference app's `src/lib/smartsheet.ts` into a generic client that supports:

- test connection
- get sheet schema
- get report schema
- get rows with `value`, `displayValue`, and `objectValue`
- get attachments later if enabled

### 17.2 Internal App APIs

Initial APIs:

- `GET /api/public/views/[slug]`
  - returns resolved config + normalized rows for one public view

Later admin APIs:

- `POST /api/admin/sources`
- `POST /api/admin/sources/[id]/schema`
- `POST /api/admin/views/[id]/preview`
- `POST /api/admin/views/[id]/publish`

## 18. Configuration Storage Strategy

### 18.1 MVP

Store sources and views as JSON in the repo.

Why:

- fastest to ship
- no DB dependency
- easy to diff
- good fit for one initial deployment

### 18.2 Future

Add a DB-backed config repository behind the same interface.

Why:

- needed for a true self-service admin tool
- supports many sources/views without git edits
- aligns with the reference app's strengths

## 19. Security

- Smartsheet API tokens are server-side only
- tokens are never exposed to the browser
- current lite-mode admin routes are protected with HTTP Basic auth via `SMARTSHEETS_VIEW_ADMIN_USERNAME` and `SMARTSHEETS_VIEW_ADMIN_PASSWORD`
- managed mode stores tokens encrypted at rest
- public pages are read-only
- iframe embedding must be allowed
- avoid response bodies that leak raw credentials or internal config secrets

## 20. Caching And Performance

The app should support short server-side caching.

Recommended default:

- 60 to 300 seconds

Cache should be configurable per source or per view.

Rationale:

- reduces Smartsheet API traffic
- still feels current enough for directory-style use cases

Do not build the architecture around stale exports.

## 21. Error Handling

Public pages must handle:

- invalid source/view slug
- Smartsheet auth failure
- missing sheet/report access
- schema drift
- empty result sets
- transform failure on one field without crashing the whole page

Admin preview should surface:

- unknown column references
- type mismatches
- ambiguous parsing results where relevant

## 22. Schema Drift

Because Smartsheet columns can be renamed or removed, schema drift must be a first-class concept.

Minimum behavior:

- field configs should prefer stable column IDs where possible
- titles can be used for friendly display and import mapping
- admin preview should flag missing column IDs
- public render should degrade gracefully and log drift

This is another direct concept to borrow from the scholarship app.

## 23. WordPress Embedding

The public route must support iframe embedding cleanly.

Requirements:

- responsive width
- predictable height behavior, ideally with stripped embed chrome and optional height reporting to the parent page
- no admin chrome on public pages
- optional `embed=1` mode to reduce outer padding/header

Phase 2 can add simple copy-paste embed snippets and a parent-page listener for embed height messages.

## 24. Testing Strategy

Minimum automated coverage:

- transform unit tests
- filter/sort unit tests
- view resolution tests
- Smartsheet response normalization tests using fixtures

Manual QA:

- `GRAD Programs` source renders `Faculty` and `Staff` views correctly
- mixed email/name fields parse as expected
- helper-column override beats raw transform fallback
- blank rows do not render
- mobile layout remains usable
- iframe embed works in WordPress

## 25. Delivery Plan

### Phase 1: Public Viewer MVP

- scaffold Next.js app in this folder
- port and extend Smartsheet client from the scholarship app
- add file-based source/view config
- implement transform engine
- implement `table`, `cards`, and `list` renderers
- ship `GRAD Programs` with `Faculty` and `Staff` views

Deliverable:

- one public URL that reads live Smartsheet data and renders both views cleanly

### Phase 2: Generic Admin Builder

Status: complete in lite mode (file-backed config). Managed mode remains a later follow-on.

- add source registry
- add connection test and schema fetch UI
- add view builder using scholarship app builder patterns
- add preview mode and publish/unpublish flow
- harden admin access and publication checks for shared deployments
- add source/view delete operations with safe source-delete blocking
- add schema drift warnings/checks
- support report sources in the admin flow
- add reusable layout templates

Deliverable:

- internal tool for defining new public views without code edits and publishing them safely

### Phase 3: Polish

- report-source multi-sheet hardening
- theme refinement
- embed helper docs
- optional row detail pages
- optional attachments rendering

Deliverable:

- production-ready reusable Smartsheet display platform

## 26. Immediate Recommendation

Status note:

- this sequence has been completed through Phase 2 in the current file-backed deployment
- the next recommendation is to treat managed mode, report hardening, and operational polish as follow-on work


Build the core engine first, not the admin UI.

Sequence:

1. Next.js scaffold in `smartsheets_view`
2. Reuse and extend the scholarship app's Smartsheet client
3. Implement the config schema and transform engine
4. Ship `GRAD Programs` with `Faculty` and `Staff` views from file-based config
5. Add the builder UI only after the rendering model is proven

This sequence keeps the architecture generic while still getting a real, useful app in front of users quickly.

