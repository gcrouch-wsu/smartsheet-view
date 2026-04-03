import { describe, expect, it } from "vitest";
import { getCardLayoutRows, getEditDrawerOrderedFields } from "@/components/public/layout-utils";
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
});
