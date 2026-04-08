# Per-coordinator campus badges (inline)

**Document type:** product contract + implementation notes  
**Status:** implemented against §2 (engineering); release sign-off still depends on pilot views, accessibility, and content approval outside this file.  
**Product:** Smartsheet View (`smartsheet-view`)  
**Last updated:** 2026-04-08

---

## 1. Goal

For numbered coordinator slots (`1`, `2`, `3`), the app should read each slot's matching Smartsheet campus picklist and show **one optional inline campus badge beside that slot's coordinator name**.

This feature must:

- keep slot pairing strict (`1 -> 1`, `2 -> 2`, `3 -> 3`)
- render campus only as inline UI next to the correct person **when that person has a display name** (see R5)
- avoid creating a standalone public campus row or column for this feature
- keep row-level or program-level campus UI separate from per-person campus badges
- let contributors edit the same three campus picklists beside the matching slot name controls

---

## 2. Source-of-truth behavior

### 2.1 Allowed values and normalization

| Source value | Normalization | Public result |
|-------------|---------------|---------------|
| `Do Not Show` | Trimmed, case-insensitive match | No badge |
| Empty / whitespace-only | Trimmed to empty | No badge |
| `Everett` | Exact approved label after trim | Badge `Everett` |
| `Global` | Exact approved label after trim | Badge `Global` |
| `Pullman` | Exact approved label after trim | Badge `Pullman` |
| `Spokane` | Exact approved label after trim | Badge `Spokane` |
| `Tri-Cities` | Exact approved label after trim | Badge `Tri-Cities` |
| `Vancouver` | Exact approved label after trim | Badge `Vancouver` |
| Anything else | Not approved after trim | No badge |

Rules:

- Trim whitespace before comparison.
- Treat `Do Not Show` case-insensitively.
- Do not infer campuses from partial text.
- Do not fuzzy-match campuses.
- Fail closed for unrecognized values.

### 2.2 Product rules

- `R1`: Render exactly one badge only when a slot's normalized value equals one approved campus.
- `R2`: Render no badge for `Do Not Show`, blank, whitespace-only, or unrecognized values.
- `R3`: Slot `N` campus applies only to slot `N`.
- `R4`: One slot can render at most one badge.
- `R5`: The badge appears inside the same coordinator output, **immediately after the corresponding non-empty name**. There is **no** public campus pill or print suffix if the slot has no name (email-only rows may still appear without a campus badge). No standalone public campus field, row, or column for this feature.
- `R6`: Row-level or program-level campus UI remains separate from per-person coordinator campus UI.

### 2.3 Contributor layout

For numbered coordinator slots:

- each slot keeps its existing name / email / phone grouping
- the matching `Designee N Campus` dropdown appears beside that slot's name control when both **name** and **campus** attributes exist for that slot
- if only a campus attribute exists (no name column in config), a standalone campus control is used for that row
- campus `N` never edits slot `M` when `N != M`
- after save, the public page reflects the same slot's badge behavior from `2.1` and `2.2`

This is a numbered-slot feature. Delimited multi-person groups are not the product model for campus badges.

### 2.4 Print / PDF

On the print route, `FieldValue` receives `plainValueLinks`:

- **Links** (mailto, tel, external URLs) render as plain text.
- **Per-coordinator campus** next to a name renders as **plain text** after an **em dash** (e.g. `Ada — Pullman`), not as the rounded chip used on screen.
- If there is **no name**, campus is **not** shown in print (same as R5 on the public page).

---

## 3. Resolution and visibility (numbered slots)

- A coordinator **slot** is treated as having no public `people_group` row unless at least one of **name**, **email**, or **phone** has non-empty text after trim. **Campus alone does not create a visible row** (data may still be stored on the resolved entry for internal consistency).
- **View row visibility:** Public resolution drops sheet rows when every resolved field on that row is empty (including a `people_group` whose slots are all empty as above). A row that only had campus picklists filled and no other columns would disappear unless another field on the view still has content.
- Schema drift warnings for role groups include **campus** selectors on numbered slots, the same way as name, email, and phone.

---

## 4. Implementation map

Primary modules:

- `src/lib/config/types.ts` — slot `campus`, `ResolvedPersonRoleEntry.campus`, editable `campus` attribute
- `src/lib/config/validation.ts` — parses `campus` on slots and editable groups
- `src/lib/role-groups.ts` — detects `… N Campus` columns
- `src/lib/public-view.ts` — resolves campus text, `isEmpty` without contact fields, `collectSelectorsFromRoleGroup` includes campus
- `src/lib/coordinator-campus-badge.ts` — normalization / approved list
- `src/components/public/FieldValue.tsx` — chip vs `plainValueLinks` suffix; badge only with name
- `src/lib/contributor-utils.ts` — multi-person campus parse/serialize, derived groups + options
- `src/components/public/ContributorFieldControl.tsx` — campus beside name or standalone
- `src/components/admin/SourceForm.tsx` — campus column per slot
- `src/components/admin/ViewBuilder.tsx` — role-group overlap includes campus selectors

---

## 5. Tests (current)

- `src/lib/__tests__/coordinator-campus-badge.test.ts` — normalization unit tests
- `src/lib/__tests__/public-view.test.ts` — resolution, drift including campus, slot pairing, campus-only `isEmpty`
- `src/lib/__tests__/contributor-utils.test.ts` — serialize/parse including campus
- `src/lib/__tests__/role-groups.test.ts` — title parsing and cluster with campus
- `src/lib/__tests__/multi-person.test.ts` — fixed-slot parse order
- `src/components/public/__tests__/ContributorFieldControl.test.tsx` — beside-name layout, campus-only fallback
- `src/components/public/__tests__/FieldValue.test.tsx` — chip vs print suffix, no badge without name

---

## 6. Sign-off outside this document

Pilot slugs, accessibility wording, content/legal approval, and rollout/rollback remain **process** items: confirm them before calling a release “done” in your org. This file describes **product + code behavior** only.

---

## 7. One-line summary

**Numbered-slot campus badges are implemented with strict slot pairing, name-gated public badges, campus included in schema drift, and print using a plain em-dash suffix after the name.**

## 8. External review notes

When re-running automated or human review, **confirm the checkout** (path and branch) matches this repo. False failures often come from an older tree or a different folder clone. Contract checks in current code live at:

- `resolveNumberedRoleGroupPeople`: `isEmpty` uses **name/email/phone only** (`anyContactValue`), not campus.
- `collectSelectorsFromRoleGroup`: numbered slots include **`slot.campus`**.
- `PersonSummary` in `FieldValue.tsx`: first line is shown **only when `nameTrimmed`**; campus is **chip or print em-dash suffix** only with `showCampusBesideName` (`campus` + name).
- Tests: `public-view.test.ts` (drift, R5 campus-only slot, 1→1 / 2→2), `FieldValue.test.tsx` (no badge without name, print suffix), `ContributorFieldControl.test.tsx` (beside name / standalone).
