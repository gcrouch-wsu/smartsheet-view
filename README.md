# Smartsheets View

A config-driven Next.js app that displays live Smartsheet data as public webpages. Supports multiple views per source, transforms, filters, and embeddable layouts.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with SMARTSHEET_API_TOKEN and admin credentials
npm run dev
```

## Vercel Deployment

1. Push to GitHub and connect the repo in Vercel.
2. Configure environment variables in the Vercel project:
   - `SMARTSHEET_API_TOKEN` (or `SMARTSHEET_CONNECTIONS_JSON`)
   - `SMARTSHEETS_VIEW_ADMIN_USERNAME`
   - `SMARTSHEETS_VIEW_ADMIN_PASSWORD`
3. Deploy. The build uses `npm ci` and `npm run build` (see `vercel.json`).

**Important:** Do not commit `.next/` or `*.tsbuildinfo`. The `.gitignore` excludes these so each Vercel build starts clean. Commit `package-lock.json` for reproducible installs.

## Project Structure

- `src/app/` – Next.js App Router pages and API routes
- `src/components/` – Public and admin UI components
- `src/lib/` – Smartsheet client, transforms, filters, config
- `config/sources/` – Source definitions (JSON)
- `config/views/` – View definitions (JSON)
