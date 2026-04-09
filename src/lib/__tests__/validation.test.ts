import { describe, expect, it } from "vitest";
import { CARD_LAYOUT_CAMPUS_BADGES } from "@/lib/config/types";
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

  it("rejects invalid displayTimeZone", () => {
    const base = {
      id: "tz-bad",
      slug: "tz-bad",
      sourceId: "grad-programs",
      label: "TZ bad",
      layout: "table",
      public: false,
      fields: [
        {
          key: "name",
          label: "Name",
          source: { columnTitle: "Name" },
          render: { type: "text" },
        },
      ],
    } as const;

    const result = validateViewConfig({ ...base, displayTimeZone: "Invalid/Zone" }, { knownSourceIds: ["grad-programs"] });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("displayTimeZone"))).toBe(true);
  });

  it("drops stale presentation field keys (e.g. after deleting/recreating a column)", () => {
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
          summaryFieldKey: "also_missing",
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

    expect(result.success).toBe(true);
    expect(result.data?.presentation).toBeUndefined();
  });

  it("drops stale printGroupByFieldKey when the key no longer exists", () => {
    const result = validateViewConfig(
      {
        id: "print-bad",
        slug: "print-bad",
        sourceId: "grad-programs",
        label: "Print bad",
        layout: "table",
        public: false,
        presentation: {
          printGroupByFieldKey: "missing",
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

    expect(result.success).toBe(true);
    expect(result.data?.presentation).toBeUndefined();
  });

  it("accepts printGroupByFieldKey that matches a field key", () => {
    const result = validateViewConfig(
      {
        id: "print-ok",
        slug: "print-ok",
        sourceId: "grad-programs",
        label: "Print ok",
        layout: "table",
        public: false,
        presentation: {
          printGroupByFieldKey: "name",
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

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.printGroupByFieldKey).toBe("name");
  });

  it("drops printGroupByFieldKey when it points at a hidden field (print cannot group by hidden)", () => {
    const result = validateViewConfig(
      {
        id: "print-hidden",
        slug: "print-hidden",
        sourceId: "grad-programs",
        label: "Print hidden",
        layout: "table",
        public: false,
        presentation: {
          printGroupByFieldKey: "secret",
        },
        fields: [
          {
            key: "name",
            label: "Name",
            source: { columnTitle: "Name" },
            render: { type: "text" },
          },
          {
            key: "secret",
            label: "Secret",
            source: { columnTitle: "Secret" },
            render: { type: "hidden" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] }
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation).toBeUndefined();
  });

  it("drops stale campusFieldKey when the field was removed", () => {
    const result = validateViewConfig(
      {
        id: "campus-bad",
        slug: "campus-bad",
        sourceId: "grad-programs",
        label: "Campus bad",
        layout: "table",
        public: false,
        presentation: {
          campusFieldKey: "missing_campus",
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
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation).toBeUndefined();
  });

  it("accepts campusFieldKey on a hidden field", () => {
    const result = validateViewConfig(
      {
        id: "campus-hidden",
        slug: "campus-hidden",
        sourceId: "grad-programs",
        label: "Campus hidden",
        layout: "table",
        public: false,
        presentation: {
          campusGroupingMode: "grouped",
          campusFieldKey: "secret_campus",
          programGroupFieldKey: "name",
          showCampusFilter: true,
        },
        fields: [
          {
            key: "name",
            label: "Name",
            source: { columnTitle: "Name" },
            render: { type: "text" },
          },
          {
            key: "secret_campus",
            label: "Campus",
            source: { columnTitle: "Campus" },
            render: { type: "hidden" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.campusFieldKey).toBe("secret_campus");
  });

  it("rejects campusGroupingMode when not grouped", () => {
    const result = validateViewConfig(
      {
        id: "campus-mode",
        slug: "campus-mode",
        sourceId: "grad-programs",
        label: "Campus mode",
        layout: "table",
        public: false,
        presentation: {
          campusGroupingMode: "grid",
          campusFieldKey: "c",
          programGroupFieldKey: "name",
        },
        fields: [
          {
            key: "name",
            label: "Name",
            source: { columnTitle: "Name" },
            render: { type: "text" },
          },
          {
            key: "c",
            label: "C",
            source: { columnTitle: "C" },
            render: { type: "text" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("campusGroupingMode"))).toBe(true);
  });

  it("accepts full live grouped presentation", () => {
    const result = validateViewConfig(
      {
        id: "live-grouped",
        slug: "live-grouped",
        sourceId: "grad-programs",
        label: "Live grouped",
        layout: "stacked",
        public: false,
        presentation: {
          campusGroupingMode: "grouped",
          campusFieldKey: "campus_col",
          programGroupFieldKey: "prog_col",
          showCampusFilter: true,
        },
        fields: [
          {
            key: "prog_col",
            label: "Program",
            source: { columnTitle: "Program" },
            render: { type: "text" },
          },
          {
            key: "campus_col",
            label: "Campus",
            source: { columnTitle: "Campus" },
            render: { type: "text" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.campusGroupingMode).toBe("grouped");
    expect(result.data?.presentation?.showCampusFilter).toBe(true);
  });

  it("rejects hideCampusFieldInRecordDisplay without campusFieldKey", () => {
    const result = validateViewConfig(
      {
        id: "hide-campus-no-key",
        slug: "hide-campus-no-key",
        sourceId: "grad-programs",
        label: "Hide campus no key",
        layout: "table",
        public: false,
        presentation: {
          hideCampusFieldInRecordDisplay: true,
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
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("hideCampusFieldInRecordDisplay"))).toBe(true);
  });

  it("accepts __campus_badges__ in cardLayout without campusFieldKey (no-op)", () => {
    const result = validateViewConfig(
      {
        id: "campus-badges-no-key",
        slug: "campus-badges-no-key",
        sourceId: "grad-programs",
        label: "Campus badges no key",
        layout: "stacked",
        public: false,
        presentation: {
          cardLayout: [{ fieldKeys: ["name", CARD_LAYOUT_CAMPUS_BADGES] }],
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
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.cardLayout?.[0]?.fieldKeys).toContain(CARD_LAYOUT_CAMPUS_BADGES);
  });

  it("accepts mergePeopleFieldKeys (plural array) and outputs it when merge is on", () => {
    const result = validateViewConfig(
      {
        id: "merge-plural",
        slug: "merge-plural",
        sourceId: "grad-programs",
        label: "Merge plural",
        layout: "cards",
        public: false,
        presentation: {
          mergeProgramRowsBySharedEmail: true,
          programGroupFieldKey: "prog",
          campusFieldKey: "campus",
          mergePeopleFieldKeys: ["staff", "secondary"],
        },
        fields: [
          { key: "prog", label: "Program", source: { columnTitle: "Program" }, render: { type: "text" } },
          { key: "campus", label: "Campus", source: { columnTitle: "Campus" }, render: { type: "text" } },
          { key: "staff", label: "Staff", source: { kind: "role_group", roleGroupId: "staff" }, render: { type: "people_group" } },
          { key: "secondary", label: "Secondary", source: { kind: "role_group", roleGroupId: "secondary" }, render: { type: "people_group" } },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.mergePeopleFieldKeys).toEqual(["staff", "secondary"]);
  });

  it("rejects enabling both mergeProgramRowsBySharedEmail and mergeProgramRowsByProgramAndCampus", () => {
    const result = validateViewConfig(
      {
        id: "merge-both",
        slug: "merge-both",
        sourceId: "grad-programs",
        label: "Both",
        layout: "cards",
        public: false,
        presentation: {
          mergeProgramRowsBySharedEmail: true,
          mergeProgramRowsByProgramAndCampus: true,
          programGroupFieldKey: "prog",
          campusFieldKey: "campus",
          mergePeopleFieldKeys: ["staff"],
        },
        fields: [
          { key: "prog", label: "Program", source: { columnTitle: "Program" }, render: { type: "text" } },
          { key: "campus", label: "Campus", source: { columnTitle: "Campus" }, render: { type: "text" } },
          { key: "staff", label: "Staff", source: { kind: "role_group", roleGroupId: "s" }, render: { type: "people_group" } },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("merge") && e.includes("only one"))).toBe(true);
  });

  it("accepts mergeProgramRowsByProgramAndCampus without people fields for email matching", () => {
    const result = validateViewConfig(
      {
        id: "merge-campus-mode",
        slug: "merge-campus-mode",
        sourceId: "grad-programs",
        label: "Merge campus",
        layout: "cards",
        public: false,
        presentation: {
          mergeProgramRowsByProgramAndCampus: true,
          programGroupFieldKey: "prog",
          campusFieldKey: "campus",
        },
        fields: [
          { key: "prog", label: "Program", source: { columnTitle: "Program" }, render: { type: "text" } },
          { key: "campus", label: "Campus", source: { columnTitle: "Campus" }, render: { type: "text" } },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(true);
    expect(result.data?.presentation?.mergeProgramRowsByProgramAndCampus).toBe(true);
  });

  it("rejects duplicate field keys across cardLayout rows", () => {
    const result = validateViewConfig(
      {
        id: "dup-card",
        slug: "dup-card",
        sourceId: "grad-programs",
        label: "Dup Card",
        layout: "stacked",
        public: false,
        presentation: {
          cardLayout: [{ fieldKeys: ["alpha", "beta"] }, { fieldKeys: ["alpha"] }],
        },
        fields: [
          {
            key: "alpha",
            label: "Alpha",
            source: { columnTitle: "Alpha" },
            render: { type: "text" },
          },
          {
            key: "beta",
            label: "Beta",
            source: { columnTitle: "Beta" },
            render: { type: "text" },
          },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("Custom card layout") && e.includes("more than one row"))).toBe(true);
  });

  it("rejects cardLayout keys that are not on the Fields list with a clear message", () => {
    const result = validateViewConfig(
      {
        id: "stale-card",
        slug: "stale-card",
        sourceId: "grad-programs",
        label: "Stale",
        layout: "cards",
        public: false,
        presentation: {
          cardLayout: [{ fieldKeys: ["still_here", "removed_field"] }],
        },
        fields: [
          { key: "still_here", label: "Here", source: { columnTitle: "Here" }, render: { type: "text" } },
        ],
      },
      { knownSourceIds: ["grad-programs"] },
    );

    expect(result.success).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes("Custom card layout") && e.includes("row 1") && e.includes("removed_field") && e.includes("Fields tab"),
      ),
    ).toBe(true);
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

