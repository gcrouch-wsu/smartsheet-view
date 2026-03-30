# Admin Instructions

Use this guide to connect Smartsheet sources, build public views, publish changes, and manage contributor access.

## Overview

This app does not replace Smartsheet. Smartsheet is still the source of truth. The admin builder controls how that data is displayed, filtered, branded, and optionally edited by contributors.

Main workflow:

1. Create a source.
2. Create a view connected to that source.
3. Configure setup, fields, filters, editing, and branding.
4. Preview the result.
5. Publish when it is ready.

Contributor passwords are stored as one-way hashes and cannot be viewed by admins. Use reset links instead.

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

## Sources

A source tells the app which Smartsheet sheet or report to read.

When creating a source, enter:

- a Source ID for internal use
- a Label for the admin and public UI
- the source type: `sheet` or `report`
- the numeric Smartsheet ID from the URL

After saving, always use `Test connection`.

## Setup And Layout

Use the Setup tab to define the structure of the page.

Important controls:

- `Source`: which Smartsheet source the view reads from
- `Label`: the public-facing view name
- `Slug`: the URL path
- `View ID`: fixed after creation
- `Description`: optional supporting copy
- `Tab order`: order when multiple views share a slug
- `Heading field key`: primary card/accordion title
- `Summary field key`: secondary card/accordion text

Layout controls:

- start with a layout preset
- override the layout if needed: table, cards, accordion, tabbed, list/detail, and similar patterns
- for card-style layouts, use `Custom card layout` when you want multiple fields in one row, placeholders for alignment, or static text inside cards

Display controls in Setup:

- `Page Header & Branding` controls logo, custom text, theme, and header visibility
- `Content Area` controls title section, tabs, counts, and the layout switcher below the header
- when contributor editing is enabled, Setup also controls whether the public page shows the contributor login link and contributor instructions link

## Fields And Display

Use the Fields tab to choose what appears on the public page and how it renders.

Basic workflow:

1. Load columns from the selected source.
2. Check the columns you want.
3. Edit display names as needed.
4. Reorder or remove fields in `Arrange`.
5. Watch the live preview while you work.

Field controls include:

- `Render as`: text, badge, mailto, list, phone list, and others
- `Transforms`: split, format date, contact emails, contact names, reset to source, and similar cleanup rules
- `List display`: stacked or inline with a delimiter
- `Heading`: primary field for cards and accordions
- `Summary`: secondary field for cards and accordions
- `Hide label`: show the value without the field label
- `Hide when empty`: remove the field entirely when blank
- `A-Z index`: choose the field used for alphabetical navigation

Use `Hide when empty` for optional fields that only apply to some rows so the page does not show empty labels.

## Filters And Sort

Use Filters & Sort to narrow the rows and control the order users see.

- filters decide which rows appear
- default sort controls the order within the current view

If the page looks wrong but field mapping is correct, check filters and sort next.

## Editing And Groups

Use the Editing tab to control contributor editing.

Key rule:

- contact columns define **who** can edit
- editable fields and multi-person groups define **what** they can edit

Contributor access works like this:

- the contributor must have a `@wsu.edu` email in one of the selected contact columns on that row
- they can then claim access to that row
- they can edit only the selected editable fields or configured group fields

Use `Multi-person field groups` when a row stores comma-separated people data such as coordinator names, coordinator emails, or coordinator phone numbers.

Groups let contributors use `Add person` and `Remove` controls instead of editing one long text string.

The Editing tab also controls:

- `Show contributor login link`
- `Show contributor instructions link`

Hiding those links does not remove editing for someone who already has the direct URL or an active session.

## Preview And Publish

Preview before you publish.

Recommended order:

1. use live preview while building fields
2. use the Preview tab for a fuller page-level review
3. publish only after checking layout, branding, filters, search, and contributor links

If publishing is blocked, schema drift is the usual cause. That means a required Smartsheet column was changed, removed, or renamed.

After schema changes:

- refresh schema
- recheck field mappings
- recheck contributor contact columns and editable fields

## Release Checklist

1. Confirm environment values and database connectivity.
2. Confirm RLS is enabled on backend-owned public tables.
3. Preview the public page and verify layout, filters, search, branding, and contributor links.
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
