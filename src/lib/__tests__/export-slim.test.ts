import { describe, expect, it } from "vitest";
import type { AdminViewPreview } from "@/lib/public-view";
import { buildSlimViewExportPayload } from "@/lib/export-slim";

describe("buildSlimViewExportPayload", () => {
  it("returns slim rows and field metadata without full view theme", () => {
    const preview = {
      viewConfig: { id: "v1", label: "L", sourceId: "s1" },
      schemaWarnings: [],
      fetchedAt: "2025-01-01T00:00:00.000Z",
      resolvedView: {
        id: "v1",
        label: "L",
        layout: "table",
        displayTimeZone: "America/Los_Angeles",
        linkEmailsInView: true,
        linkPhonesInView: false,
        rowCount: 1,
        fields: [{ key: "name", label: "Name", renderType: "text" }],
        rows: [
          {
            id: 10,
            fields: [
              {
                key: "name",
                label: "Name",
                renderType: "text",
                textValue: "Ada",
                listValue: [],
                links: [],
                isEmpty: false,
                hideWhenEmpty: false,
              },
            ],
            fieldMap: {
              name: {
                key: "name",
                label: "Name",
                renderType: "text",
                textValue: "Ada",
                listValue: [],
                links: [],
                isEmpty: false,
                hideWhenEmpty: false,
              },
            },
          },
        ],
      },
    } as unknown as AdminViewPreview;

    const out = buildSlimViewExportPayload(preview);
    expect(out.format).toBe("slim");
    expect(out.fields).toEqual([{ key: "name", label: "Name", renderType: "text" }]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].id).toBe(10);
    expect(out.rows[0].cells).toHaveLength(1);
    expect(out.rows[0].cells[0]).toMatchObject({ key: "name", textValue: "Ada" });
    expect("style" in (out as object)).toBe(false);
  });
});
