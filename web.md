# Contributor tutorial (web / LMS version)

Use this document when you build a **standalone webpage** (HTML, WordPress, Canvas, etc.) with screenshots to walk graduate program contacts through editing their card on a **Smartsheet View** page. Copy sections below as needed; replace `YOUR_VIEW_URL` with the real public link.

**Related in this repo**

- Live, accessible guide (no login): **`/instructions/contributor`** on the deployed app (source: `src/app/instructions/contributor/page.tsx`). Keep wording aligned when you change the product.
- **Admin** documentation: `Admin_Instruction.md`
- **Deploy / Vercel pitfalls:** `VERCEL_DEPLOYMENT.md`
- **Repo overview:** `README.md`

---

## For page authors: suggested image assets

Save images with clear names (e.g. `contributor-01-catalog-signin.png`). Use consistent browser width (e.g. 1280px) and **avoid** capturing real student PII—use a **staging** view or blur cells.

| # | Suggested filename | What to capture |
|---|-------------------|-----------------|
| **1** | `01-public-page-overview.png` | The published view home: header, optional program list/cards, and the **status / action** area showing **Contributor sign in** (and **Print / PDF** if enabled). Shows the starting point. |
| **2** | `02-contributor-menu.png` | Click **Contributor sign in** (or equivalent): flyout or expanded area with **Sign in** vs **First-time access** (or **Create password**). |
| **3** | `03-first-time-access-form.png` | **First-time access** form: WSU email, new password, confirm. No need to show password values. |
| **4** | `04-sign-in-form.png` | Returning user **Sign in**: email + password fields. |
| **5** | `05-row-editable-indicator.png` | After sign-in: one **program card** (or row) that belongs to the contributor—show the crimson **left accent** and/or **Editable** strip on the row and the **Edit** button. Other rows without **Edit** optional in same shot for contrast. |
| **6** | `06-card-edit-mode.png` | Same card **after Edit**: emphasized border, **Editing Entry** title, **Cancel** and **Save Changes**. Shows inline edit shell (typical for **cards**, **stacked**, **list**, **accordion**, etc.). |
| **7** | `07-fields-inputs-vs-readonly.png` | Close-up of a few fields: **editable** fields as white boxes with visible border; **read-only** values as plain text without an input—so contributors know what they can change. |
| **8** | `08-grouped-people-block.png` | If your view uses **grouped role / people** fields: one block with name, email, optional campus, **Add person** / **Remove**, or fixed numbered slots **without** add/remove. Optional: **Clear this role** on a single contact column. |
| **9** | `09-save-or-error.png` | Either a clean state after **Save Changes**, or a **red error** banner with readable message (staging). Explain they should read the message and retry or email support. |
| **10** | `10-table-layout-drawer.png` | **Only if this audience uses table layout:** row with **Edit** opening a **side drawer** instead of inline card—full-height panel with fields and save. Caption that behavior differs from cards but steps are the same. |

---

## Narrative you can paste under each screenshot

### Welcome

You update your program’s public listing yourself. Open the link you were given (`YOUR_VIEW_URL`). You do **not** need a Smartsheet account—only the contributor login for this site.

### Screenshot 1 — Find sign-in

In the header or status area, use **Contributor sign in**.

### Screenshots 2–4 — Account

- **First visit:** choose **First-time access**, enter your **`@wsu.edu`** email, and create a **contributor password** (separate from your WSU password). You can register only if your email already appears on **your** program row in the sheet behind this page.
- **Later visits:** choose **Sign in** and enter the same email and contributor password.

### Screenshot 5 — Your row

After sign-in, find **your** program. Only rows where your email is authorized show an **Edit** control. Other programs may be visible for context but are not yours to edit.

### Screenshots 6–7 — Edit and save

1. Click **Edit** on your card.
2. Change values only in fields that look like **form controls** (boxes, dropdowns). Plain text without a box is **read-only**.
3. Click **Save changes** when finished. Use **Cancel** to leave without saving.

If your page uses a **table** instead of cards, **Edit** may open a **panel on the side**—the same rules apply.

### Screenshot 8 — Grouped contacts

Some pages show **coordinators or contacts** in grouped blocks (one person per block, or fixed “slot” rows). Use **Add person** / **Remove** when those buttons appear. Fixed slot roles may not allow adding rows—only edit the slots shown. Single contact columns may offer **Clear this role**.

### Screenshot 9 — If something fails

Read the error text. Try again; if it persists, contact your administrator (e.g. **gradschool@wsu.edu**) with the page address, program name, time, and exact message.

---

## Short reference (merged from former contributor doc)

### Who can register

Your **`@wsu.edu`** email must appear in the view’s configured **contact** column for **that row**. If it does not, you cannot create an account for that page—ask your admin.

### Password rules (contributor password)

- At least 8 characters  
- At least one uppercase letter  
- At least one number  
- At least one special character (e.g. `!` `*` `_`)

### Merged rows

Some views **combine** multiple Smartsheet lines into one card (same program, multi-campus). You still edit **one** form; campus may appear as badges or a list. Saving updates the row the system uses for editing—keep duplicate lines in Smartsheet consistent except where campus differs.

### Password reset

There is usually **no self-service reset**. Contact **gradschool@wsu.edu** (or the address your admin gives you) for a reset link.

### Troubleshooting (quick)

| Problem | What to check |
|--------|----------------|
| Cannot create account | Email not on the **row’s** contact field for that view. |
| No **Edit** button | Wrong row, editing disabled, or email not in eligibility column. |
| Save fails | Note exact message; retry; email support with URL, row, time. |

---

## Maintainer note

When product copy or flows change, update:

1. This file (and your hosted tutorial page).
2. `src/app/instructions/contributor/page.tsx` so the in-app guide stays in sync.
