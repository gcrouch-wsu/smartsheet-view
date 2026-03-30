# Admin Instructions

Use this guide to connect Smartsheet sources, build public views, publish changes, and manage contributor access.

## What Admins Do Here

- create and test Smartsheet sources
- build public views with fields, filters, layout, and branding
- preview and publish updates
- manage contributor editing and password reset links
- manage admin accounts

## Before You Start

Required environment values:

- `SMARTSHEET_API_TOKEN`
- `SMARTSHEETS_VIEW_ADMIN_USERNAME`
- `SMARTSHEETS_VIEW_ADMIN_PASSWORD`
- `SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET`
- `DATABASE_URL`
- `CONTRIBUTOR_SESSION_SECRET` if contributor editing is enabled

If you use Supabase for Postgres:

- backend-owned tables in `public` must keep RLS enabled
- update `sql/enable-public-rls.sql` when a new backend-owned `public` table is added
- rerun Supabase Security Advisor after deploy and treat new `rls_disabled_in_public` findings as release-blocking

## Build And Publish A View

1. Create a source using the numeric Smartsheet sheet or report ID.
2. Use `Test connection` to confirm the source works.
3. Create a view and configure setup, fields, filters, editing, and branding.
4. Preview the result.
5. Publish only after checking field labels, layout, filters, and contributor settings.

If publishing is blocked, schema drift is the usual cause. That means a required Smartsheet column was changed, removed, or renamed.

## Contributor Access

- Contributors can create an account only when their `@wsu.edu` email appears in the configured contact field on the Smartsheet row.
- Editable fields control what they can change after sign-in.
- Use multi-person groups when contributors need `Add person` / `Remove` controls instead of plain text entry.
- Contributor passwords are stored as one-way hashes and cannot be viewed by admins.
- If a contributor forgets a password, generate a reset link from `/admin/contributors`.

## Admin Accounts

The bootstrap owner account comes from environment variables. Additional managed admins can be created in the admin UI.

Admin password rule:

- at least 8 characters
- at least 1 uppercase letter
- at least 1 number
- at least 1 special character such as `!`, `*`, or `_`

## Release Checklist

1. Confirm environment values and database connectivity.
2. Confirm RLS is enabled on backend-owned public tables.
3. Preview the public page and verify layout, filters, search, and branding.
4. If contributor editing is enabled, test:
   - first-time access
   - sign in
   - row eligibility
   - save to Smartsheet
   - password reset flow
5. Commit and push changes before expecting Vercel to deploy them.

## Reference Docs

- `README.md`
- `VERCEL_DEPLOYMENT.md`
- `/instructions/contributor`
- `/instructions/admin`
