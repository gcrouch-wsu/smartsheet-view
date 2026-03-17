import { describe, expect, it } from "vitest";
import { validateViewConfig } from "@/lib/config/validation";

describe("validateViewConfig", () => {
  it("accepts phase 2 layouts and presentation keys that match fields", () => {
    const result = validateViewConfig(
      {
        id: "directory-accordion",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory Accordion",
        layout: "accordion",
        public: false,
        presentation: {
          headingFieldKey: "name",
          summaryFieldKey: "role",
        },
        fields: [
          {
            key: "name",
            label: "Name",
            source: { columnTitle: "Name" },
            render: { type: "text" },
          },
          {
            key: "role",
            label: "Role",
            source: { columnTitle: "Role" },
            render: { type: "badge" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] }
    );

    expect(result.success).toBe(true);
    expect(result.data?.layout).toBe("accordion");
    expect(result.data?.presentation?.headingFieldKey).toBe("name");
  });

  it("rejects presentation field keys that do not exist", () => {
    const result = validateViewConfig(
      {
        id: "directory-detail",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory Detail",
        layout: "list_detail",
        public: false,
        presentation: {
          headingFieldKey: "missing",
        },
        fields: [
          {
            key: "name",
            label: "Name",
            source: { columnTitle: "Name" },
            render: { type: "text" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] }
    );

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("presentation.headingFieldKey");
  });
});
