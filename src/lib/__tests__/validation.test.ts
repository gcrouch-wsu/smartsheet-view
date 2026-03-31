import { describe, expect, it } from "vitest";
import type { SourceConfig } from "@/lib/config/types";
import { validateSourceConfig, validateViewConfig } from "@/lib/config/validation";

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

  it("allows editing when a numbered role-group field is the editable content source", () => {
    const source: SourceConfig = {
      id: "grad-programs",
      label: "GRAD Programs",
      sourceType: "sheet",
      smartsheetId: 1,
      roleGroups: [
        {
          id: "staff",
          label: "Staff Graduate Program Coordinator",
          mode: "numbered_slots",
          slots: [
            {
              slot: "1",
              name: { columnId: 301, columnTitle: "Staff Coordinator 1" },
              email: { columnId: 302, columnTitle: "Staff Coordinator Email 1" },
            },
          ],
        },
      ],
    };

    const result = validateViewConfig(
      {
        id: "directory-role-group-editing",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory Editing",
        layout: "table",
        public: false,
        fields: [
          {
            key: "staffCoordinators",
            label: "Staff Coordinators",
            source: { kind: "role_group", roleGroupId: "staff" },
            render: { type: "people_group" },
          },
        ],
        editing: {
          enabled: true,
          contactColumnIds: [101],
          editableColumnIds: [],
        },
      },
      { knownSourceIds: ["grad-programs"], sources: [source] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.editing?.enabled).toBe(true);
  });

  it("allows editing when a trusted delimited role-group field is the editable content source", () => {
    const source: SourceConfig = {
      id: "grad-programs",
      label: "GRAD Programs",
      sourceType: "sheet",
      smartsheetId: 1,
      roleGroups: [
        {
          id: "legacy-coordinators",
          label: "Legacy Coordinators",
          mode: "delimited_parallel",
          delimited: {
            name: { source: { columnId: 201, columnTitle: "Coordinator" } },
            email: { source: { columnId: 202, columnTitle: "Coordinator Email" } },
            trustPairing: true,
          },
        },
      ],
    };

    const result = validateViewConfig(
      {
        id: "directory-trusted-role-group-editing",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory Editing",
        layout: "table",
        public: false,
        fields: [
          {
            key: "legacyCoordinators",
            label: "Legacy Coordinators",
            source: { kind: "role_group", roleGroupId: "legacy-coordinators" },
            render: { type: "people_group" },
          },
        ],
        editing: {
          enabled: true,
          contactColumnIds: [101],
          editableColumnIds: [],
        },
      },
      { knownSourceIds: ["grad-programs"], sources: [source] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.editing?.enabled).toBe(true);
  });

  it("rejects editing when only an unsafe delimited role-group field is present", () => {
    const source: SourceConfig = {
      id: "grad-programs",
      label: "GRAD Programs",
      sourceType: "sheet",
      smartsheetId: 1,
      roleGroups: [
        {
          id: "legacy-coordinators",
          label: "Legacy Coordinators",
          mode: "delimited_parallel",
          delimited: {
            name: { source: { columnId: 201, columnTitle: "Coordinator" } },
            email: { source: { columnId: 202, columnTitle: "Coordinator Email" } },
          },
        },
      ],
    };

    const result = validateViewConfig(
      {
        id: "directory-unsafe-role-group-editing",
        slug: "directory",
        sourceId: "grad-programs",
        label: "Directory Editing",
        layout: "table",
        public: false,
        fields: [
          {
            key: "legacyCoordinators",
            label: "Legacy Coordinators",
            source: { kind: "role_group", roleGroupId: "legacy-coordinators" },
            render: { type: "people_group" },
          },
        ],
        editing: {
          enabled: true,
          contactColumnIds: [101],
          editableColumnIds: [],
        },
      },
      { knownSourceIds: ["grad-programs"], sources: [source] },
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((error) => error.includes("writable role-group field"))).toBe(true);
  });

  it("preserves trusted pairing on delimited source role groups", () => {
    const result = validateSourceConfig({
      id: "grad-programs",
      label: "GRAD Programs",
      sourceType: "sheet",
      smartsheetId: 1,
      roleGroups: [
        {
          id: "legacy-coordinators",
          label: "Legacy Coordinators",
          mode: "delimited_parallel",
          delimited: {
            name: { source: { columnId: 201, columnTitle: "Coordinator" } },
            email: { source: { columnId: 202, columnTitle: "Coordinator Email" } },
            trustPairing: true,
          },
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.roleGroups?.[0]?.delimited?.trustPairing).toBe(true);
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

