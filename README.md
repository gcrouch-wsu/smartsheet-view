# Smartsheet View

**Smartsheet is the source of truth. This app is the public window into it.**

Staff manage data in Smartsheet as they always have—no changes to their workflow. This Next.js app connects to Smartsheet and makes selected data available as clean, branded, and accessible public webpages without exposing the raw spreadsheet.

## Key Features

- **Visual Admin Builder**: Configure sources and public views with a five-section builder (**Setup**, **Fields**, **Filters & Sort**, **Editing**, **Preview**).
- **Custom Header WYSIWYG**: Rich text editor for page headers with headings, bold, italic, underline, alignment, bullet lists, text color, highlighting, and links. Use `{{PUBLIC_URL}}` to insert a live, clickable link to the current view.
- **Flexible Layouts**: Tables, Cards, Lists, Stacked, Accordions, Tabbed panels, and List–Detail.
- **Advanced Theme System**: 12 customizable design tokens (colors, fonts, radius) with live WCAG AA contrast validation.
- **Smart Transforms**: Auto-suggest render types (e.g., Email -> mailto, Picklist -> badge) and data transformations (Split, Date Format).
- **Schema Drift Protection**: Automatic checks block publishing if Smartsheet columns are renamed or removed.
- **Universal Embed**: Standalone pages or iframe embeds for WordPress/CMS with automatic height reporting.
- **Contributor Row Editing**: Smartsheet contacts (e.g., coordinators) can edit assigned rows on the public view (WSU email + password; row scope from contact columns; per-view editable fields and multi-person groups). Requires Postgres and `CONTRIBUTOR_SESSION_SECRET` in production.
- **Public accessibility**: Skip link, search **live regions**, landmark/nav labels, table **captions** / **scope**, **dialog** focus trap and return focus from **Edit**, **tab**/**tabpanel** patterns on public views.
- **Header branding (admin)**: In **Setup → Page header & branding**, optional PNG/JPEG logo (≤256KB, **alt text** required for save) plus optional **two text lines** beside the logo (organization + unit), with a vertical rule—stored in view config. Shown at the top of the public header when visible.
- **Instruction pages**: `/instructions/contributor` (linked when a contributor is signed in) and `/instructions/admin` (linked from the admin nav as **Setup guide**) — static, accessible guides that deploy with the app on Vercel.

**Optional local docs (not versioned here):** Teams can keep their own copies of specs or deployment notes (e.g. `PROJECT_SPEC.md`, `VERCEL_DEPLOYMENT.md`, `future_build_view.md`) beside this repo for internal use only.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```
Edit `.env` with your Smartsheet and Admin credentials:
- `SMARTSHEET_API_TOKEN`: Your Smartsheet API token.
- `SMARTSHEETS_VIEW_ADMIN_USERNAME`: Initial admin username.
- `SMARTSHEETS_VIEW_ADMIN_PASSWORD`: Initial admin password.
- `DATABASE_URL` (Optional): Connect to Postgres for durable admin users and config (sources/views) on Vercel. When set, sources and views are stored in Postgres instead of config files, enabling create/edit/delete on serverless deployments.
- `CONTRIBUTOR_SESSION_SECRET` (Required for contributor editing): Secret used to sign contributor session cookies.

Postgres requirement:
- The app expects **PostgreSQL 13 or newer**.
- The schema uses `gen_random_uuid()` without installing `pgcrypto` at app startup.
- This is compatible with Vercel Postgres / Neon style hosted Postgres, but older Postgres versions are not supported.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Admin: Creating a Source

Go to **Admin → Sources** and click **Create source**. You’ll configure:

| Field | Purpose |
|-------|---------|
| **Source ID** | Internal identifier for this app. Must be unique, URL-safe (no spaces or special characters). Used in URLs and when linking views. Set once at creation and cannot be changed. Example: `grad-programs` |
| **Label** | Display name shown in the admin UI. Can include spaces and punctuation. Can be changed anytime. Example: `Graduate Programs` |
| **Source type** | Choose **Sheet** or **Report** to match your Smartsheet asset. |
| **Smartsheet ID** | The numeric ID from Smartsheet. Find it in the sheet/report URL: `https://app.smartsheet.com/sheets/XXXXXXXXXXXXXXX` or `.../reports/XXXXXXXXXXXXXXX` — the long number is the ID. |

After saving, use **Test connection** to verify the Smartsheet API can reach the sheet or report. Then create **Views** that select columns and define how data is displayed.

## Vercel Deployment

1. Push to GitHub and connect the repository in Vercel.
2. Configure environment variables in the Vercel project settings.
3. Deploy. The build uses `npm ci` and `npm run build` as defined in `vercel.json` (**production builds use `next build --webpack`**—keep that flag unless you re-validate TipTap and `pg` bundles).

**Note:** For Vercel deployments, set `DATABASE_URL` to persist admin users and enable full config management (create, edit, delete sources and views). Without it, the filesystem is read-only and config changes will not persist.

**Contributor editing:** Requires `DATABASE_URL`, **`CONTRIBUTOR_SESSION_SECRET`**, and **PostgreSQL 13+** (`gen_random_uuid()` on contributor tables). Contributor API routes use **`export const runtime = "nodejs"`** (Node-only APIs).

**Rich text (custom header):** Sanitized server-side with **`sanitize-html`** only—avoid introducing **`jsdom`** on the server bundle for Vercel.

## Project Structure

- `src/app/` – Next.js App Router (Public views and Admin API)
- `src/components/` – UI components (Public layouts and Admin Builder)
- `src/lib/` – Business logic (Smartsheet client, transforms, filters)
- `config/sources/` – Source configuration files (JSON, fallback when DB not used)
- `config/views/` – View configuration files (JSON, fallback when DB not used)
- `config/themes/` – Custom theme preset files (JSON)
