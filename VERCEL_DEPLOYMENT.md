# Vercel & Node: Build Guide

**General reference for shipping serverless Next.js / Node apps on Vercel** (and similar hosts): bundler choice, `npm ci`, env secrets, Postgres pooling, cache revalidation quirks, and HTTP edge cases. Many rows apply to **any** project with the same stack; some rows are **Smartsheet-specific** or note behavior observed **in this repo**.

**Maintainer pitfall log:** use this file when debugging deploys or production surprises. It is intentionally **not** linked from **`README.md`** for this project so onboarding stays self-contained there.

Each section is readable on its own. Update when live behavior contradicts an older assumption.

---

## Failures and near-misses

Symptoms that have already burned time on **Vercel builds** or **production-like** behavior. Use as a pre-deploy checklist; add rows when a deploy fails for a *new* root cause. Rows may reference Smartsheet only where noted.

| Symptom | Likely cause | What to do |
|--------|----------------|------------|
| **Vercel build fails** with bundler errors mentioning native modules, `pg`, or opaque TipTap / ProseMirror resolution | Next.js 16 default **Turbopack** for `next build` is a bad fit here | Keep **`npm run build` → `next build --webpack`** in `package.json`. Do not drop `--webpack` without a full prod build + smoke test. |
| **Vercel build fails** on TypeScript | `next build` type-checks the whole project | Run **`npx tsc --noEmit`** or **`npm run build`** locally before pushing; fix every error — Vercel matches this. |
| **Vercel install fails** at `npm ci` | `package-lock.json` out of sync with `package.json` | Regenerate lockfile locally, commit it; **`vercel.json` uses `npm ci`**, not `npm install`. |
| **Deploy “succeeds” but behavior unchanged** | Uncommitted / unpushed local fixes | Vercel only sees **git**. Verify the deployment’s commit SHA matches what you expect. |
| **Public page stale after contributor save (local only)** | **`revalidatePath`** does not behave like production inside **`next dev`** | Re-test cache refresh on a Preview/Production URL; do not assume dev mirrors prod. |
| **Contributor PATCH returns 400** on report-backed views | Report row lacks **`sheetId`** needed to target the underlying sheet | Fix Report in Smartsheet to expose sheet metadata, or use a **sheet** source for editable rows. |
| **Smartsheet 1012** on multi-contact columns | Clearing **`MULTI_CONTACT_LIST`** with **`values: []`** | Clear with **`value: ""`** only (see cell-shape section below). |
| **Config or users “reset”** after deploy | **No `DATABASE_URL`** on Vercel — filesystem not durable | Set Postgres for any real deployment; see database section. |
| **Database “too many connections”** or flaky 5xx on burst | **Pool `max` too high** for serverless | Prefer a small serverless-friendly pool (this app’s defaults are tuned for that). |
| **All admin users logged out** after password change | **`SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET` unset** — signing key derived from bootstrap password | Set a dedicated session secret in **each** Vercel env; rotate it deliberately, separate from password rotation. |
| **Preview admin sessions weird after env tweaks** | **Preview** missing its own `SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET` — falls back to derived secret for Preview | Set explicit secrets per environment (Production **and** Preview). |
| **Smartsheet writes return 502** | Upstream Smartsheet error mapped to bad gateway | Read **Smartsheet `errorCode`** and body — do not assume an app crash (see HTTP mapping table below). |

---

## Vercel: Build Configuration

### Webpack vs Turbopack is repo-specific

Next.js 16 uses Turbopack for plain `next build` by default.

This repo intentionally opts out with:

- `next dev --webpack`
- `next build --webpack`

Keep those flags here unless you re-validate the full production build, because this repo combines:

- `pg` for Postgres access
- TipTap / ProseMirror-heavy client components

Do not copy this rule blindly to every Smartsheet-backed Next.js app. A different repo may work correctly with plain `next build`.

### TypeScript runs on production builds

`next build` runs type-checking. Fix type errors locally with:

- `npx tsc --noEmit`
- `npm run build`

Vercel will fail the deployment on the same errors.

### JSX quote hazards

Straight quotes inside JSX text nodes can break builds if pasted carelessly, and Unicode smart quotes can break builds even inside attributes.

Safe rule:

- keep source files ASCII by default
- use HTML entities in JSX text when needed
- normalize pasted smart quotes before pushing

If a build fails with an unexpected-character error, inspect the file for non-ASCII punctuation first.

### Node.js version

If you want stable behavior across local and Vercel builds, pin the Vercel project to a specific LTS Node version such as 22.x.

### Use `npm ci` in Vercel

This repo's `vercel.json` uses `npm ci` for reproducible installs. Do not replace it with `npm install` in CI unless you have a specific reason.

---

## Vercel: Deploying And Debugging

### Changes must be committed before they deploy

Vercel deploys from git, not from your local working directory. Local edits do nothing until they are committed and pushed.

### How to verify a deployment includes your code

Look for a log line or behavior that only exists in the new code. Do not assume a redeploy picked up an uncommitted local fix.

### Where runtime logs live

Function logs are on the project dashboard, not just on an individual deployment page.

1. Open the Vercel project.
2. Go to **Logs**.
3. Set environment to **Production**.
4. Set console level to include info logs if needed.
5. Search for the route name or helper name involved in the failure.

### Reading Smartsheet failures

For any Smartsheet write failure, the most important facts are:

- exact payload sent
- Smartsheet HTTP status
- Smartsheet `errorCode`
- whether the failure came from our validation layer or from Smartsheet

If you only look at the Vercel request status, you will misclassify some failures.

### HTTP status mapping

Recommended mapping for Smartsheet-backed writes:

| Smartsheet status | App response | Meaning |
|---|---|---|
| 429 or error code 4003 | 429 | Rate limited, retryable |
| 401 | 502 | Upstream Smartsheet auth/config problem |
| other 4xx | 4xx or validated 400 | Bad payload or invalid request |
| 5xx | 502 | Upstream Smartsheet problem |
| timeout / network issue | 500 or 502 with retry hint | Transient failure |

Do not treat every 502 as "our code crashed". It often means the upstream provider failed or rejected the request.

---

## Vercel: Runtime Constraints

### Node.js runtime for DB and crypto routes

App Router route handlers default to Node.js, but routes that rely on:

- `pg`
- Node `crypto`
- `fs`
- password hashing helpers
- upload-token generation tied to DB or secrets

should still export:

```ts
export const runtime = "nodejs";
```

Reason: the explicit marker documents the dependency and prevents future edits from drifting toward Edge assumptions.

### Caching and invalidation

If a page reads Smartsheet-backed data through cached server fetches, a successful write should invalidate or refresh the relevant path immediately. Treat cache invalidation as part of the write contract, not as optional polish.

### Serverless cold starts

Do not rely on in-memory state surviving between requests. Vercel Functions may cold-start at any time.

### Rich text on Vercel

- Keep TipTap in client components.
- Avoid importing TipTap or ProseMirror packages into server components or API routes.
- Use `sanitize-html` server-side if HTML sanitization is required.
- Do not introduce `jsdom` on the server unless you have re-validated the full production bundle.

### Large-file intake pattern

Vercel Functions have a small request-body limit. If a Smartsheet-backed app must accept large PDFs or similar assets, do not POST file bytes through a Next.js route handler.

Recommended pattern:

1. Client requests a short-lived upload token.
2. Browser uploads directly to Blob or another object store.
3. Submit route receives metadata only: field values, object keys/URLs, upload state.
4. Submit route creates or updates the Smartsheet row from that metadata.
5. A cleanup job removes orphaned uploads that were never tied to a completed submission.

For 50MB+ files, direct browser upload is the default-safe approach.

### Public submit endpoints are still public

If you build an unauthenticated intake flow on top of Smartsheet:

- IP rate limiting reduces abuse but does not authenticate users.
- Email-domain suffix checks do not prove mailbox ownership.
- If the workflow is truly staff-only, use SSO or a verified-email loop instead of trusting `@example.edu` text input.

---

## Vercel: Database (Postgres)

### What Postgres stores in this repo

| Table area | Purpose |
|-----------|---------|
| config tables | source and view definitions |
| admin/contributor tables | managed access |
| login-attempt tables | rate limiting and auth support |

### Why `DATABASE_URL` is required

Without Postgres on Vercel:

- config does not persist reliably across deploys or instances
- managed users cannot be stored durably
- contributor editing and rate limiting break

For any real deployment, set `DATABASE_URL`.

### SSL and connection pool

Use a serverless-friendly pool and normalize SSL expectations. Small pools such as `max: 2` are often correct on Vercel/Supabase. Large pools are a common way to exhaust database limits.

By default, the app passes a sanitized `DATABASE_URL` to `pg`: **`sslmode=no-verify` in the URL is stripped** unless **`SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL=true`**, in which case the pool forces `sslmode=no-verify` and `rejectUnauthorized: false` (legacy behavior). If production connections fail after an upgrade because the host presents a cert chain Node cannot verify, use the flag only as a last resort after review; prefer fixing `DATABASE_URL` / provider certs when possible.

### Supabase Security Advisor and RLS

If you use Supabase as the Postgres provider, its Security Advisor will flag `public` tables without Row Level Security. In this repo those tables are backend-owned and accessed through server-side `pg`, not through Supabase PostgREST.

Recommended setup:

- run `sql/enable-public-rls.sql` once against an existing database
- deploy the app code so startup keeps `admin_users`, `admin_login_attempts`, `config_sources`, `config_views`, `contributor_users`, and `contributor_login_attempts` RLS-enabled
- when introducing a new backend-owned `public` table, enable RLS in the same bootstrap/code change and add that table to `sql/enable-public-rls.sql` for already-existing databases
- rerun Supabase Security Advisor after deploy and treat fresh `rls_disabled_in_public` findings as release-blocking

This is hardening, not a client-facing feature. No public/browser code should talk to those tables directly.

### PostgreSQL version

If your schema relies on `gen_random_uuid()`, verify the target Postgres version and extension support before deploy.

---

## Vercel: Auth

### Admin bootstrap

| Variable | Required | Notes |
|----------|----------|-------|
| `SMARTSHEETS_VIEW_ADMIN_USERNAME` | Yes | Bootstrap admin username |
| `SMARTSHEETS_VIEW_ADMIN_PASSWORD` | Yes | Must satisfy your local password policy |
| `SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET` | Strongly recommended | Cookie-signing secret; never set to an empty string |

Admin sessions are **stateless** (no server session table). **Global sign-out / incident response** = rotate `SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET` to a new random value and redeploy — all existing admin cookies fail verification immediately. If this variable is **unset**, the signing key is **derived from** bootstrap admin username/password, so **password changes invalidate all admin cookies**.

**Vercel env scopes:** set `SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET` for **every Vercel environment you care about** (at minimum **Production** and **Preview**, plus **Development** if you use linked local env). Omitting it on **Preview** means Preview silently uses the **derived** secret, so a **Preview** password rotation can invalidate Preview admin sessions without an obvious cause. Rotating the explicit secret takes effect **immediately** when new instances pick up the new value — there is **no** session grace period (see runbook).

### Contributor editing

| Requirement | Purpose |
|-------------|---------|
| `DATABASE_URL` | durable contributor/config storage |
| `CONTRIBUTOR_SESSION_SECRET` | cookie signing for contributor sessions |
| supported Postgres version | required by contributor tables/functions |

### Environment variables checklist

| Variable | Use |
|----------|-----|
| `SMARTSHEET_API_TOKEN` | Smartsheet API access |
| `SMARTSHEETS_VIEW_ADMIN_USERNAME` | bootstrap admin |
| `SMARTSHEETS_VIEW_ADMIN_PASSWORD` | bootstrap admin |
| `SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET` | admin cookie signing |
| `DATABASE_URL` | durable storage |
| `CONTRIBUTOR_SESSION_SECRET` | contributor cookie signing |
| `SMARTSHEET_CONNECTIONS_JSON` | optional multi-connection config |
| `SMARTSHEET_API_BASE_URL` | optional API override |
| `SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL` | optional; `true` only if TLS verification against Postgres fails and you accept relaxed SSL |

---

## Production go-live checklist (first real deployment)

Use before turning on contributor editing for a production audience (for example graduate program contacts).

1. **Vercel Production (and Preview if used)** — Set `SMARTSHEET_API_TOKEN`, bootstrap admin username/password, **`SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET`** explicitly (see **Admin bootstrap** above), `DATABASE_URL`, `CONTRIBUTOR_SESSION_SECRET`. Use `SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL=true` only if Postgres TLS verification fails and the risk is accepted after review.
2. **Audience splits (config only)** — Prefer **separate published views** per campus or audience using existing filters instead of one overloaded page.
3. **Contributor columns** — Confirm Smartsheet columns that drive row eligibility; use real mailbox addresses where registration matches email in the sheet.
4. **Smoke test** — Contributor first-time access and sign-in, edit only on authorized rows, save and verify Smartsheet + public page; exercise multi-person fields if used; quick mobile check.
5. **Admin handoff** — Operators know `/instructions/admin`, `/admin/contributors`, and the manual password-reset link flow.

---

## Maintainer engineering rules (this repo)

- Run **`npx tsc --noEmit`** or **`npm run build`** before pushing; Vercel fails on the same TypeScript errors.
- **Do not link this file from `README.md`** unless project policy changes; keep public onboarding to `README.md` only.
- New **`public` schema tables** owned by the app: enable RLS in the same change that creates or bootstraps them; extend **`sql/enable-public-rls.sql`**; rerun Supabase Security Advisor after deploy.
- Smartsheet client, column normalization, or multi-contact parsing changes: note whether the fix should be **ported** to sibling platforms or kept **repo-specific**.

---

## Smartsheet API: Cell Shapes For Row Writes

Rules below are the ones that matter most in production.

### TEXT_NUMBER / PHONE

| Operation | Cell shape |
|-----------|-----------|
| set | `{ "columnId": 123, "value": "text" }` |
| clear | `{ "columnId": 123, "value": "" }` |

Notes:

- `value` may be string, number, or boolean depending on the column.
- Do not send `value: null`.
- Do not send `objectValue` for simple text/number columns.

### PICKLIST

| Operation | Cell shape |
|-----------|-----------|
| set | `{ "columnId": 123, "value": "Option Text" }` |
| clear | `{ "columnId": 123, "value": "" }` |

Notes:

- Smartsheet defaults to `strict: true`.
- If your app intentionally allows off-list values, add `"strict": false` on the cell.
- Do not send `objectValue` for ordinary picklist writes unless you have a tested reason.

### CONTACT_LIST

| Operation | Cell shape |
|-----------|-----------|
| set | `{ "columnId": 123, "objectValue": { "objectType": "CONTACT", "email": "user@example.com" } }` |
| clear | `{ "columnId": 123, "value": "" }` |

Notes:

- At least one of `email` or `name` is required.
- Do not send both `value` and `objectValue` on the same cell.

### MULTI_CONTACT_LIST

| Operation | Cell shape |
|-----------|-----------|
| set | `{ "columnId": 123, "objectValue": { "objectType": "MULTI_CONTACT", "values": [ { "objectType": "CONTACT", "email": "a@example.com" } ] } }` |
| clear | `{ "columnId": 123, "value": "" }` |

Critical rules:

1. The contacts array key is `"values"` plural.
2. `values: []` is not a valid clear operation.
3. To clear the column, use `{ "value": "" }`.
4. Each entry must be a CONTACT object with at least `email` or `name`.

### URL attachments vs file attachments

Attaching a URL to a Smartsheet row is not the same as uploading a file to Smartsheet.

- A LINK attachment may not behave like a file attachment in downstream app code.
- Do not assume a file-style signed `attachment.url` will exist for LINK attachments.
- If your app renders Smartsheet attachments, verify the actual row-attachment payload returned by the API and handle LINK attachments explicitly.
- If downstream users need controlled access, an app-aware file access path is often safer than assuming URL attachments are a drop-in replacement for uploaded files.

---

## Smartsheet API: Reports, Sheets, And Column Metadata

### Row `sheetId` for updates

- Rows from a sheet source have a usable `sheetId`.
- Rows from a report source may not carry enough information to update safely.
- Never guess the underlying sheet when issuing a row write.

### Column IDs in reports

- Report column IDs and underlying sheet column IDs can differ.
- For writes, use column IDs grounded in the real sheet row data, not virtual report-column IDs.

### `type` vs `columnType`

Smartsheet may return both. Normalize with:

```ts
column.type ?? column.columnType ?? "TEXT_NUMBER"
```

If your schema fetch depends on column typing, request the fields needed to populate that information reliably.

---

## Smartsheet API: Known Error Codes

| Code | Meaning | Typical cause |
|------|---------|---------------|
| 1008 | request parse failure | malformed objectValue, or `value` and `objectValue` both set |
| 1012 | missing required object attributes | invalid MULTI_CONTACT clear using `values: []` |
| 4003 / HTTP 429 | rate limit | too many requests in a short interval |

---

## Smartsheet API: General Rules

- Never send both `value` and `objectValue` on the same cell.
- Never send `value: null`; use `value: ""`.
- Omitting a column from the cells array leaves it unchanged.
- `strict: true` is the default for picklists.
- Smartsheet writes are synchronous from the app's perspective.
- If you expose a public form, version the published schema separately from drafts.
- Admin-side schema-drift warnings are useful but not sufficient for public writes; re-validate live column existence and type on submit.

---

## Where To Look

### This repo

| Area | Location |
|------|---------|
| row update payload shaping | `src/lib/smartsheet.ts` |
| contributor row PATCH | `src/app/api/public/views/[slug]/rows/[rowId]/route.ts` |
| contributor serialization helpers | contributor utility files in `src/lib/` |
| config persistence | `src/lib/config/` |

### Official docs

| Resource | URL |
|----------|-----|
| Next.js route segment config | https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config |
| Next.js 16 announcement | https://nextjs.org/blog/next-16 |
| Vercel Functions limits | https://vercel.com/docs/functions/limitations |
| Vercel Blob docs | https://vercel.com/docs/vercel-blob |
| Smartsheet developer portal | https://developers.smartsheet.com/api |
| Smartsheet cells reference | https://developers.smartsheet.com/api/smartsheet/openapi/cells/cell |

---

## Summary: Do Not

- Do not remove `--webpack` from this repo without re-validating the full production build.
- Do not assume every Smartsheet-backed Next.js repo needs `--webpack`.
- Do not move DB/crypto routes toward Edge assumptions.
- Do not deploy without `DATABASE_URL` and expect durable config.
- Do not set session secrets to empty strings.
- Do not send `value: null` to Smartsheet.
- Do not send `values: []` for `MULTI_CONTACT_LIST`.
- Do not send both `value` and `objectValue` on the same cell.
- Do not assume URL attachments behave the same as file attachments.
- Do not proxy large file bodies through a Vercel Function when direct browser upload is available.
- Do not treat IP rate limiting or email suffix checks as real authentication.
