import { describe, expect, it } from "vitest";
import {
  applyRecordSuppressionToResolvedRow,
  buildRecordSuppressionRedactFieldKeySet,
  omitRecordSuppressedRowsFromResolvedView,
  statusRawTriggersRecordSuppression,
} from "@/lib/record-suppression";
import type { LayoutType, ResolvedFieldValue, ResolvedView, ResolvedViewRow, ViewConfig } from "@/lib/config/types";

function linkField(key: string, href: string): ResolvedFieldValue {
  return {
    key,
    label: "File",
    renderType: "link",
    textValue: "Doc",
    listValue: ["Doc"],
    links: [{ label: "Doc", href }],
    isEmpty: false,
    hideWhenEmpty: false,
  };
}

function textField(key: string, value: string): ResolvedFieldValue {
  return {
    key,
    label: key,
    renderType: "text",
    textValue: value,
    listValue: value ? [value] : [],
    links: [],
    isEmpty: !value,
    hideWhenEmpty: false,
  };
}

function rowWith(fields: ResolvedFieldValue[]): ResolvedViewRow {
  return {
    id: 1,
    fields,
    fieldMap: Object.fromEntries(fields.map((f) => [f.key, f])),
  };
}

describe("record-suppression", () => {
  it("statusRawTriggersRecordSuppression matches hide and delete case-insensitively", () => {
    expect(statusRawTriggersRecordSuppression("Hide", undefined)).toBe(true);
    expect(statusRawTriggersRecordSuppression("DELETE", undefined)).toBe(true);
    expect(statusRawTriggersRecordSuppression("Published", undefined)).toBe(false);
    expect(statusRawTriggersRecordSuppression("Hide, Published", undefined)).toBe(true);
  });

  it("buildRecordSuppressionRedactFieldKeySet defaults to all link fields", () => {
    const view: ViewConfig = {
      id: "v",
      slug: "s",
      label: "L",
      sourceId: "src",
      layout: "cards",
      public: true,
      fields: [
        { key: "status", label: "Status", source: { columnTitle: "S" }, render: { type: "text" } },
        { key: "file", label: "File", source: { columnTitle: "F" }, render: { type: "link" } },
      ],
    };
    expect([...buildRecordSuppressionRedactFieldKeySet(view)]).toEqual(["file"]);
  });

  it("applyRecordSuppressionToResolvedRow clears link field and sets recordSuppression", () => {
    const view: ViewConfig = {
      id: "v",
      slug: "s",
      label: "L",
      sourceId: "src",
      layout: "cards",
      public: true,
      presentation: {
        recordSuppressedFileStatusFieldKey: "status",
        recordSuppressedFileHideStatusFieldInPublicBody: true,
      },
      fields: [
        { key: "status", label: "Status", source: { columnTitle: "S" }, render: { type: "text" } },
        { key: "file", label: "File", source: { columnTitle: "F" }, render: { type: "link" } },
      ],
    };
    const base = rowWith([
      textField("status", "Hide"),
      linkField("file", "https://example.com/x"),
    ]);
    const out = applyRecordSuppressionToResolvedRow(view, base);
    expect(out.recordSuppression?.statusDisplay).toBe("Hide");
    expect(out.recordSuppression?.redactedFieldKeys).toEqual(["file"]);
    expect(out.fieldMap.file?.links).toEqual([]);
    expect(out.fieldMap.file?.isEmpty).toBe(true);
    expect(out.fieldMap.status?.textValue).toBe("Hide");
    expect(out.fields.some((f) => f.key === "status")).toBe(false);
  });

  it("omitRecordSuppressedRowsFromResolvedView drops suppressed rows for anonymous public", () => {
    const view: ResolvedView = {
      id: "v",
      label: "L",
      layout: "cards" as LayoutType,
      displayTimeZone: "UTC",
      linkEmailsInView: true,
      linkPhonesInView: false,
      rowCount: 2,
      fields: [],
      rows: [
        { id: 1, fields: [], fieldMap: {} },
        {
          id: 2,
          fields: [],
          fieldMap: {},
          recordSuppression: { statusDisplay: "Delete", redactedFieldKeys: ["f"], statusFieldKey: "s" },
        },
      ],
    };
    const out = omitRecordSuppressedRowsFromResolvedView(view);
    expect(out.rows.map((r) => r.id)).toEqual([1]);
    expect(out.rowCount).toBe(1);
  });
});
