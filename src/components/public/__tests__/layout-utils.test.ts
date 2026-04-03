import { describe, expect, it } from "vitest";
import { cardLayoutIncludesCampusBadges, getCardLayoutRows, getEditDrawerOrderedFields } from "@/components/public/layout-utils";
import type { ContributorEditableFieldDefinition } from "@/lib/contributor-utils";
import { contributorResolvedFieldStub } from "@/lib/contributor-utils";
import { CARD_LAYOUT_CAMPUS_BADGES } from "@/lib/config/types";
import type { ResolvedFieldValue, ResolvedView, ResolvedViewRow } from "@/lib/config/types";

function textField(key: string, label: string, textValue: string, hideWhenEmpty = false): ResolvedFieldValue {
  return {
    key,
    label,
    renderType: "text",
    textValue,
    listValue: textValue ? [textValue] : [],
    links: [],
    isEmpty: !textValue,
    hideWhenEmpty,
  };
}

function makeView(overrides: Partial<ResolvedView> = {}): ResolvedView {
  return {
    id: "v",
    label: "V",
    layout: "cards",
    displayTimeZone: "America/Los_Angeles",
    linkEmailsInView: false,
    linkPhonesInView: false,
    rowCount: 1,
    fields: [],
    rows: [],
    ...overrides,
  };
}

function makeRow(fieldMap: Record<string, ResolvedFieldValue>, extra?: Partial<ResolvedViewRow>): ResolvedViewRow {
  return { id: 1, fields: Object.values(fieldMap), fieldMap, ...extra };
}

describe("cardLayoutIncludesCampusBadges", () => {
  it("is true when any layout row includes the campus badges token", () => {
    const view = makeView({
      presentation: {
        cardLayout: [{ fieldKeys: ["prog"] }, { fieldKeys: [CARD_LAYOUT_CAMPUS_BADGES] }],
      },
    });
    expect(cardLayoutIncludesCampusBadges(view)).toBe(true);
  });

  it("is false when layout has no token", () => {
    const view = makeView({
      presentation: { cardLayout: [{ fieldKeys: ["prog", "other"] }] },
    });
    expect(cardLayoutIncludesCampusBadges(view)).toBe(false);
  });
});

describe("getCardLayoutRows", () => {
  it("returns campus_badges cell populated from mergedCampuses", () => {
    const row = makeRow(
      { prog: textField("prog", "Program", "Biology") },
      { mergedCampuses: ["Pullman", "Spokane"] },
    );
    const view = makeView({
      presentation: {
        campusFieldKey: "campus",
        cardLayout: [{ fieldKeys: ["prog", CARD_LAYOUT_CAMPUS_BADGES] }],
      },
    });
    const rows = getCardLayoutRows(view, row);
    expect(rows).toHaveLength(1);
    const badgeCell = rows[0]?.find((c) => c.type === "campus_badges");
    expect(badgeCell?.type === "campus_badges" && badgeCell.campuses).toEqual(["Pullman", "Spokane"]);
  });

  it("drops a layout row whose only renderable content is an empty campus_badges token", () => {
    const row = makeRow({ prog: textField("prog", "Program", "Biology") });
    // No campusFieldKey → resolvedRowCampusBadgeLabels returns []
    const view = makeView({
      presentation: {
        cardLayout: [{ fieldKeys: [CARD_LAYOUT_CAMPUS_BADGES] }],
      },
    });
    const rows = getCardLayoutRows(view, row);
    expect(rows).toHaveLength(0);
  });

  it("keeps a layout row that has a field alongside an empty campus_badges token", () => {
    const row = makeRow({ prog: textField("prog", "Program", "Biology") });
    const view = makeView({
      presentation: {
        cardLayout: [{ fieldKeys: ["prog", CARD_LAYOUT_CAMPUS_BADGES] }],
      },
    });
    const rows = getCardLayoutRows(view, row);
    expect(rows).toHaveLength(1);
    const badgeCell = rows[0]?.find((c) => c.type === "campus_badges");
    expect(badgeCell?.type === "campus_badges" && badgeCell.campuses).toEqual([]);
  });

  it("renders hidden campus field key as placeholder when hideCampusFieldInRecordDisplay is on (public)", () => {
    const row = makeRow({
      prog: textField("prog", "Program", "Biology"),
      campus: textField("campus", "Campus", "Pullman"),
    });
    const view = makeView({
      presentation: {
        campusFieldKey: "campus",
        hideCampusFieldInRecordDisplay: true,
        cardLayout: [{ fieldKeys: ["prog", "campus"] }],
      },
    });
    const rows = getCardLayoutRows(view, row);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.map((c) => c.type)).toEqual(["field", "placeholder"]);
  });

  it("renders campus as a field for contributor layout when hideCampusFieldInRecordDisplay is on", () => {
    const row = makeRow({
      prog: textField("prog", "Program", "Biology"),
      campus: textField("campus", "Campus", "Pullman"),
    });
    const view = makeView({
      presentation: {
        campusFieldKey: "campus",
        hideCampusFieldInRecordDisplay: true,
        cardLayout: [{ fieldKeys: ["prog", "campus"] }],
      },
    });
    const ed = new Map<string, ContributorEditableFieldDefinition>([
      [
        "campus",
        {
          columnId: 99,
          columnType: "PICKLIST",
          fieldKey: "campus",
          label: "Campus",
          columnTitle: "Campus",
          renderType: "badge",
        },
      ],
    ]);
    const rows = getCardLayoutRows(view, row, {
      contributorFieldKeys: new Set(["campus"]),
      contributorEditableByKey: ed,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.map((c) => c.type)).toEqual(["field", "field"]);
    const campusCell = rows[0]?.[1];
    expect(campusCell?.type === "field" && campusCell.field.key).toBe("campus");
  });
});

describe("getEditDrawerOrderedFields", () => {
  it("dedupes when the same field key appears in multiple cardLayout rows", () => {
    const row: ResolvedViewRow = {
      id: 1,
      fields: [],
      fieldMap: {
        program_name: textField("program_name", "Program", "Biology"),
        campus: textField("campus", "Campus", "Pullman"),
      },
    };
    row.fields = Object.values(row.fieldMap);

    const view: ResolvedView = {
      id: "v1",
      label: "View",
      layout: "stacked",
      displayTimeZone: "America/Los_Angeles",
      linkEmailsInView: true,
      linkPhonesInView: false,
      rowCount: 1,
      fields: [
        { key: "program_name", label: "Program", renderType: "text" },
        { key: "campus", label: "Campus", renderType: "text" },
      ],
      presentation: {
        cardLayout: [
          { fieldKeys: ["program_name", "campus"] },
          { fieldKeys: ["program_name"] },
        ],
      },
      rows: [row],
    };

    const ordered = getEditDrawerOrderedFields(view, row, new Set(["program_name", "campus"]));
    expect(ordered.map((f) => f.key)).toEqual(["program_name", "campus"]);
  });

  it("includes a contributor-only field via editable map when ResolvedView.fields omits that key", () => {
    const campusEd: ContributorEditableFieldDefinition = {
      columnId: 9,
      columnType: "PICKLIST",
      fieldKey: "campus",
      label: "Campus",
      columnTitle: "Grad Campus",
      renderType: "badge",
      options: ["Pullman"],
    };
    const editableMap = new Map<string, ContributorEditableFieldDefinition>([["campus", campusEd]]);

    const row = makeRow({ program_name: textField("program_name", "Program", "Bio") });
    const view = makeView({
      fields: [{ key: "program_name", label: "Program", renderType: "text" }],
      presentation: { cardLayout: [{ fieldKeys: ["program_name", "campus"] }] },
    });

    const ordered = getEditDrawerOrderedFields(view, row, new Set(["program_name", "campus"]), editableMap);
    expect(ordered.map((f) => f.key)).toEqual(["program_name", "campus"]);
    const campusField = ordered.find((f) => f.key === "campus");
    expect(campusField).toEqual(contributorResolvedFieldStub(campusEd));
  });
});
