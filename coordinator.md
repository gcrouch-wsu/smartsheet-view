# Feasibility: Campus badges from Smartsheet coordinator columns

## Question

Three new Smartsheet columns were added, each a **dropdown** with:

- Do Not Show  
- Everett  
- Global  
- Pullman  
- Spokane  
- Tri-Cities  
- Vancouver  

**Goal:** Read these values and, for every value **other than** “Do Not Show,” show a **campus badge** immediately to the right of the associated coordinator’s name so students know whom to contact on which campuses. The badge must **not consume its own column width** in the public view (e.g. table layout): it stays **inline** on the same line as the name, not a separate grid/table column for campus.

## Product requirements (agreed)

These rules are the target behavior; implementation would follow them in config and UI.

| Rule | Detail |
|------|--------|
| **When to show a badge** | Only when a **campus option is selected** in that row’s campus dropdown—i.e. the cell has one of the real campus values (Everett, Global, Pullman, Spokane, Tri-Cities, Vancouver). |
| **When not to show** | If the dropdown is **“Do Not Show”** or the cell is **empty**, **no badge** for that coordinator slot (same visible outcome: nothing beside the name for campus). |
| **Pairing** | **Strictly one-to-one:** designee slot 1 uses campus column 1, slot 2 uses column 2, slot 3 uses column 3—the same structural pairing as name/email/phone per slot in the role-group model. |
| **No multi-campus per person (current sheet)** | One dropdown per slot; a person does not get multiple inline badges from a single column without a sheet or model change. |
| **Layout (no extra column)** | Campus appears **only as an inline chip to the right of the person’s name** within the same cell/block as that coordinator—not as a **separate view column** or labeled field row that would reserve full column width for campus alone. (Smartsheet still has separate source columns; the app **merges display** next to the name.) |

Normalization (e.g. trim, case-insensitive match for “Do Not Show”) can be decided at implementation time so Smartsheet display text stays reliable.

## Short answer

**Yes, this is feasible.** This repository (**smartsheet-view**) already **reads Smartsheet** via the API and already has **campus chip UI** (`CampusBadgeStrip`, merged-row campus badges). What is **not** implemented yet is wiring the three new **per-designee campus** columns into **inline display next to each coordinator name** (and treating `Do Not Show` as hidden). That would be a focused feature on top of the existing stack.

---

## 1. Reading the new columns from Smartsheet

### API

Smartsheet returns columns (with titles and IDs) and row cells. Dropdown (**PICKLIST**) cells expose the selected option as text (e.g. `Pullman`, `Do Not Show`) in the API payload.

### In this codebase

- Sheet data is fetched and normalized into **field keys** driven by **view/source config** (column IDs, labels, role groups, etc.).
- **Feasible:** Add three fields (or extend **role group** attributes) that map to:
  - `Staff Grad Prog Coord or Designee 1 Campus`
  - `Staff Grad Prog Coord or Designee 2 Campus`
  - `Staff Grad Prog Coord or Designee 3 Campus`  
  Prefer **column IDs** in config once discovered, so renames in Smartsheet are less brittle than title-only matching.

### Logic

- **`Do Not Show` or empty:** **no badge** for that slot.
- **Any selected real campus:** **show one badge** with that label, **inline** immediately to the right of that slot’s coordinator name—**same visual line / same table cell** as the name where applicable, not a dedicated campus column (reuse or mirror `CampusBadgeStrip` styling for consistency).

---

## 2. Showing a badge “to the right of the coordinator’s name”

### Data pairing

**One coordinator (designee) slot ↔ one campus column** (1 ↔ 1, 2 ↔ 2, 3 ↔ 3), aligned with existing **role group** patterns (name / email / phone per slot). The app already models **parallel columns** under a shared coordinator prefix in `role-groups` logic; campus would follow the same slot alignment.

### Rendering in smartsheet-view

| Piece today | Relevance |
|-------------|-----------|
| `CampusBadgeStrip` | Chip styling for campus labels; can be reused or adapted for **inline** badges (e.g. `inline-flex` beside the name, tight gap, **no block-level strip** that implies a full-width row/column). |
| `MergedRowCampusBadges` | Row-level merged campuses after email/campus merge — **different** from per-person badges; keep both concepts distinct. |
| `FieldValue` / card layouts | Likely place to render **name + optional inline badge** when a field is a “person” line and a sibling campus field exists. |

**Feasibility:** **High**, with UI work so campus is **composed into the people-group name line** (table, cards, lists) rather than exposed as its own column or duplicate labeled row—implementation should keep **name + optional badge** as one inline run of content.

### Smartsheet-only display

Native Smartsheet grid still is **not** ideal for rich HTML badges; **this app** is the right place for the student-facing experience.

---

## 3. Edge cases to plan for

- **Empty cell:** **No badge** (same outcome as “Do Not Show”).
- **Multiple campuses for one person:** Current sheet design is **one dropdown per slot**; two campuses would need another column or sheet change.
- **“Global”:** Show as a normal badge unless product owners want different styling (config-only change).
- **Print / export:** If you add inline badges in the web view, decide whether **print export** and **contributor** views should match (may need parallel changes in print CSS or export HTML).

---

## 4. Summary

| Item | Assessment |
|------|------------|
| Read dropdown values via Smartsheet API | **Feasible** (already how the app is fed) |
| Map new columns into this app’s config | **Feasible** (column IDs + view/source config) |
| Ignore `Do Not Show`; badge other options | **Feasible** (simple conditional in render or transform layer) |
| Place badge beside the correct coordinator name **without a separate view column** | **Feasible** with 1:1 slot pairing and **inline** composition in `FieldValue` / table cells (not mapping campus as its own public field column) |
| Reuse existing campus chip look | **Feasible** via `CampusBadgeStrip` or shared styles |

**Conclusion:** The approach is **technically sound** and **well aligned with this repository**. Implementation is **new feature work** (config + rendering), not a fundamental platform limitation.
