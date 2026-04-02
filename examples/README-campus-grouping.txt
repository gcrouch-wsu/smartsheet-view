Campus grouping JSON helper
---------------------------

You cannot upload the fragment file alone — Restore from JSON needs a full ViewConfig.

Fastest path (no scratch build):

1. In admin, duplicate your working graduate view OR export it (Export JSON).
2. Open the downloaded JSON. Copy the top-level "viewConfig" object (or use the GET payload's "view" object).
3. Edit: set a NEW "id" and "slug" (and usually "label") so it does not collide.
4. Merge presentation keys: open campus-grouping-presentation-fragment.json and copy those four keys
   INTO viewConfig.presentation, alongside any keys you already have (headingFieldKey, etc.).
   If your sheet uses different column field keys, change campusFieldKey / programGroupFieldKey to match.
5. Admin → New view or open the duplicate → Restore from JSON… → choose Save now (or load + Save).

Until Step D lands, the page still renders flat rows; programGroups is computed but not shown.
Publishing the experimental view is optional; keep the old view/tab as the default.
