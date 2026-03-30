import { describe, expect, it } from "vitest";
import { validateViewConfig } from "@/lib/config/validation";

describe("validateViewConfig", () => {
  it("accepts supported layouts and presentation keys that match fields", () => {
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

  it("preserves themePresetId and editing config in validated output", () => {
    const result = validateViewConfig(
      {
        id: "directory-editing",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory Editing",
        layout: "table",
        public: false,
        themePresetId: "wsu_sage",
        editing: {
          enabled: true,
          contactColumnIds: [101],
          editableColumnIds: [102, 103],
          showLoginLink: false,
        },
        fields: [
          {
            key: "name",
            label: "Name",
            source: { columnId: 102, columnTitle: "Name" },
            render: { type: "text" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.themePresetId).toBe("wsu_sage");
    expect(result.data?.editing).toEqual({
      enabled: true,
      contactColumnIds: [101],
      editableColumnIds: [102, 103],
      editableFieldGroups: [],
      showLoginLink: false,
      showContributorInstructions: true,
    });
  });

  it("parses editableFieldGroups in editing config", () => {
    const result = validateViewConfig(
      {
        id: "directory-groups",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory with groups",
        layout: "table",
        public: false,
        fields: [
          { key: "coordinator", label: "Coordinator", source: { columnId: 201 }, render: { type: "text" } },
          { key: "coordinator_email", label: "Coordinator email", source: { columnId: 202 }, render: { type: "text" } },
        ],
        editing: {
          enabled: true,
          contactColumnIds: [101],
          editableColumnIds: [],
          editableFieldGroups: [
            {
              id: "coordinators",
              label: "Grad program coordinators",
              attributes: [
                { attribute: "name", fieldKey: "coordinator", columnId: 201 },
                { attribute: "email", fieldKey: "coordinator_email", columnId: 202 },
              ],
            },
          ],
        },
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.editing?.editableFieldGroups).toHaveLength(1);
    expect(result.data?.editing?.editableFieldGroups?.[0]).toEqual({
      id: "coordinators",
      label: "Grad program coordinators",
      attributes: [
        { attribute: "name", fieldKey: "coordinator", columnId: 201 },
        { attribute: "email", fieldKey: "coordinator_email", columnId: 202 },
      ],
    });
  });

  const TINY_VALID_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("accepts header logo with required alt text", () => {
    const result = validateViewConfig(
      {
        id: "with-logo",
        slug: "logo-page",
        sourceId: "grad-programs",
        label: "Logo page",
        layout: "table",
        public: false,
        presentation: {
          headerLogoDataUrl: TINY_VALID_PNG,
          headerLogoAlt: "Organization crest",
        },
        fields: [
          { key: "name", label: "Name", source: { columnTitle: "Name" }, render: { type: "text" } },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.headerLogoAlt).toBe("Organization crest");
    expect(result.data?.presentation?.headerLogoDataUrl).toBe(TINY_VALID_PNG);
  });

  it("rejects header logo without alt text", () => {
    const result = validateViewConfig(
      {
        id: "bad-logo",
        slug: "bad",
        sourceId: "grad-programs",
        label: "Bad",
        layout: "table",
        public: false,
        presentation: {
          headerLogoDataUrl: TINY_VALID_PNG,
        },
        fields: [
          { key: "name", label: "Name", source: { columnTitle: "Name" }, render: { type: "text" } },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("headerLogoAlt"))).toBe(true);
  });
});

