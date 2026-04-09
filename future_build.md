# Future build (realistic goals)

Prioritized ideas that are **not** committed work—use this when planning sprints. For deploy pitfalls and env vars, see **`VERCEL_DEPLOYMENT.md`**. For what already ships, see **`README.md`** and in-app `/instructions/*`.

---

## Near term (incremental)

- **Stricter admin save validation** — e.g. Zod (or similar) on view/source JSON before persist; clearer 400s than ad-hoc messages.
- **Self-service contributor password reset** — verified-email loop so Grad School is not the only path for routine resets (today: admin-generated link from `/admin/contributors`).
- **Print / PDF polish** — print route link styling, column order, and edge cases where sort or data shape looks wrong on paper.
- **Smartsheet cell hyperlinks** — pass through hyperlinks from the API where exposed, so public view can mirror linked cells without manual field config.
- **Explicit card heading** — picker for heading field beyond “first field” / defaults where programs need a stable title column.
- **Advanced filters** — OR logic and nested groups in the view builder (today’s filters are simpler AND-style).

## Medium scope

- **In-app docs or gallery** — short `/docs` or examples for common patterns (multi-campus, role groups, contributor setup).
- **Reusable themes in Postgres** — named presets shared across views instead of only per-view overrides.
- **Custom fonts in themes** — optional `fontFamily` from hosted files or Google Fonts with performance and FOUT review.
- **E2E coverage** — browser tests for contributor claim, sign-in, edit, save (Playwright or Cypress); admin UI still optional.

## Larger / later (needs design)

- **Row grouping / campus collapse** on the public page — only with a clear model for which Smartsheet row(s) receive writes.
- **Multi-row writes** when one displayed card merges multiple sheet rows — contract with Smartsheet and conflict handling.
- **Editable CONTACT_LIST / MULTI_CONTACT_LIST in table layout** — today table uses the drawer; parity with card editors is non-trivial.
- **Single public slug spanning multiple sources** — only if a real directory needs federated sheets under one URL.
- **Bulk admin operations** — batch export/import or multi-view toggles for operators.
- **Scheduled publish / rollback** — time-based or versioned publish for controlled rollouts.

---

## Explicit non-goals (v1 product)

These remain **out of scope** for the current product unless priorities change: simultaneous editing of all merged source rows; optimistic live multi-user sync; per-field auto-save; rich conflict UI beyond Smartsheet errors; inline editing inside the data table (drawer is the table path); row create/delete from the public app; rich text or attachments beyond what the API supports today; admin “preview as contributor” inside ViewBuilder.
