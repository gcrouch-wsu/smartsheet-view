# Smartsheet View

**Smartsheet is the source of truth. This app is the public window into it.**

Staff manage data in Smartsheet as they always have—no changes to their workflow. This Next.js app connects to Smartsheet and makes selected data available as clean, branded, and accessible public webpages without exposing the raw spreadsheet.

## Key Features

- **Visual Admin Builder**: Configure data sources and public views with a four-tab builder (Setup, Fields, Filters, Preview).
- **Flexible Layouts**: Display data as Tables, Cards, Lists, Accordions, Tabbed panels, or List-Detail views.
- **Advanced Theme System**: 12 customizable design tokens (colors, fonts, radius) with live WCAG AA contrast validation.
- **Smart Transforms**: Auto-suggest render types (e.g., Email -> mailto, Picklist -> badge) and data transformations (Split, Date Format).
- **Schema Drift Protection**: Automatic checks block publishing if Smartsheet columns are renamed or removed.
- **Universal Embed**: Standalone pages or iframe embeds for WordPress/CMS with automatic height reporting.

## Documentation

For a full technical specification, including the data model, implementation phases, and future roadmap, please refer to:
- **[project_spec.md](./project_spec.md)**

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

### 3. Run Development Server
```bash
npm run dev
```

## Vercel Deployment

1. Push to GitHub and connect the repository in Vercel.
2. Configure environment variables in the Vercel project settings.
3. Deploy. The build uses `npm ci` and `npm run build` as defined in `vercel.json`.

**Note:** For Vercel deployments, set `DATABASE_URL` to persist admin users and enable full config management (create, edit, delete sources and views). Without it, the filesystem is read-only and config changes will not persist.

## Project Structure

- `src/app/` – Next.js App Router (Public views and Admin API)
- `src/components/` – UI components (Public layouts and Admin Builder)
- `src/lib/` – Business logic (Smartsheet client, transforms, filters)
- `config/sources/` – Source configuration files (JSON)
- `config/views/` – View configuration files (JSON)
- `config/themes/` – Custom theme preset files (JSON)
