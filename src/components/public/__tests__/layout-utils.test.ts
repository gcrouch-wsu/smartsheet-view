import { describe, expect, it } from "vitest";
import { getEditDrawerOrderedFields } from "@/components/public/layout-utils";
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
