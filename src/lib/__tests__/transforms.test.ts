import { describe, expect, it } from "vitest";

import type { SmartsheetCell, SmartsheetRow, ViewFieldConfig } from "@/lib/config/types";
import { applyTransforms, buildResolvedFieldValue, normalizeSourceValue } from "@/lib/transforms";

function createRow(): SmartsheetRow {
  return {
    id: 1,
    cellsById: {},
    cellsByTitle: {},
  };
}

describe("transforms", () => {
  it("prefers structured contact objectValue for CONTACT_LIST cells", () => {
    const cell: SmartsheetCell = {
      columnId: 10,
      columnTitle: "Director",
      columnType: "CONTACT_LIST",
      value: "fallback@wsu.edu",
      displayValue: "Fallback Name",
      objectValue: {
        objectType: "CONTACT",
        email: "structured@wsu.edu",
        name: "Structured Name",
      },
    };

    expect(normalizeSourceValue(cell)).toEqual([
      {
        email: "structured@wsu.edu",
        name: "Structured Name",
      },
    ]);
  });

  it("extracts URL tokens for link rendering", () => {
    const transformed = applyTransforms(
      "Directory https://grad.wsu.edu/programs and https://example.edu/contact",
      [{ op: "url_from_value" }],
      {
        row: createRow(),
        sourceCell: null,
      }
    );

    expect(transformed).toEqual([
      "https://grad.wsu.edu/programs",
      "https://example.edu/contact",
    ]);

    const field: ViewFieldConfig = {
      key: "website",
      label: "Website",
      source: { columnTitle: "Website" },
      render: { type: "link" },
    };

    expect(buildResolvedFieldValue(field, transformed).links).toEqual([
      {
        href: "https://grad.wsu.edu/programs",
        label: "https://grad.wsu.edu/programs",
      },
      {
        href: "https://example.edu/contact",
        label: "https://example.edu/contact",
      },
    ]);
  });

  it("sets sortValue to ISO date string for date render type", () => {
    const field: ViewFieldConfig = {
      key: "programDate",
      label: "Program Date",
      source: { columnTitle: "Program Date" },
      render: { type: "date" },
    };

    const result = buildResolvedFieldValue(field, "2024-01-15");
    expect(result.sortValue).toBe(new Date("2024-01-15").toISOString());
    // textValue should be the formatted display string, not the ISO string
    expect(result.textValue).toMatch(/Jan/);
    expect(result.textValue).not.toBe("2024-01-15");
  });

  it("does not set sortValue for non-date render types", () => {
    const field: ViewFieldConfig = {
      key: "programName",
      label: "Program Name",
      source: { columnTitle: "Program Name" },
      render: { type: "text" },
    };

    expect(buildResolvedFieldValue(field, "Biology").sortValue).toBeUndefined();
  });

  it("splits comma-separated string into array", () => {
    const transformed = applyTransforms("Lisa Lujan, Deb Marsh", [{ op: "split", delimiter: "," }], {
      row: createRow(),
      sourceCell: null,
    });
    expect(transformed).toEqual(["Lisa Lujan", "Deb Marsh"]);
  });

  it("splits contact list by comma so stacked display works", () => {
    const contacts = [
      { name: "Lisa Lujan", email: "lisa@wsu.edu" },
      { name: "Deb Marsh", email: "deb@wsu.edu" },
    ];
    const transformed = applyTransforms(contacts, [{ op: "split", delimiter: "," }], {
      row: createRow(),
      sourceCell: null,
    });
    expect(transformed).toEqual(["Lisa Lujan", "Deb Marsh"]);
  });

  it("marks empty fields for renderer suppression when emptyBehavior is hide", () => {
    const field: ViewFieldConfig = {
      key: "sharedEmail",
      label: "Shared Email",
      source: { columnTitle: "Shared Email" },
      render: { type: "text" },
      emptyBehavior: "hide",
    };

    expect(buildResolvedFieldValue(field, null)).toMatchObject({
      isEmpty: true,
      hideWhenEmpty: true,
      textValue: "",
      listValue: [],
    });
  });
});
