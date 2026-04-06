import { describe, expect, it } from "vitest";
import {
  applyRecordSuppressionToResolvedRow,
  buildRecordSuppressionRedactFieldKeySet,
  statusRawTriggersRecordSuppression,
} from "@/lib/record-suppression";
import type { ResolvedFieldValue, ResolvedViewRow, ViewConfig } from "@/lib/config/types";

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
});
