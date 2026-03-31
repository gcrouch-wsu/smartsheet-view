import { afterEach, describe, expect, it, vi } from "vitest";

import type { SmartsheetCell, SmartsheetDataset, SmartsheetRow, SourceConfig, ViewConfig } from "@/lib/config/types";

const storeMock = vi.hoisted(() => ({
  getPublicViewsBySlug: vi.fn(),
  getSourceConfigById: vi.fn(),
  listPublicPageSummaries: vi.fn(),
}));

const smartsheetMock = vi.hoisted(() => ({
  getSmartsheetDataset: vi.fn(),
}));

vi.mock("@/lib/config/store", () => storeMock);
vi.mock("@/lib/smartsheet", () => ({
  getSmartsheetDataset: smartsheetMock.getSmartsheetDataset,
  normalizeColumnKey: (value: string) => value.trim().toLowerCase(),
}));

import { collectSchemaDriftWarnings, loadPublicPage } from "@/lib/public-view";

function createCell(columnId: number, columnTitle: string, value: unknown): SmartsheetCell {
  return {
    columnId,
    columnTitle,
    columnType: "TEXT_NUMBER",
    value,
  };
}

function createContactCell(
  columnId: number,
  columnTitle: string,
  email: string,
  name: string,
): SmartsheetCell {
  return {
    columnId,
    columnTitle,
    columnType: "CONTACT_LIST",
    value: email,
    displayValue: name,
    objectValue: {
      objectType: "CONTACT",
      email,
      name,
    },
  };
}

function createRow(id: number, cells: SmartsheetCell[]): SmartsheetRow {
  return {
    id,
    cellsById: Object.fromEntries(cells.map((cell) => [cell.columnId, cell])),
    cellsByTitle: Object.fromEntries(cells.map((cell) => [cell.columnTitle.trim().toLowerCase(), cell])),
  };
}

function createDataset(columns: SmartsheetDataset["columns"], rows: SmartsheetRow[]): SmartsheetDataset {
  return {
    sourceType: "sheet",
    id: 7763577444192132,
    name: "GRAD Programs",
    columns,
    rows,
    fetchedAt: "2026-03-16T20:00:00.000Z",
  };
}

function createView(overrides: Partial<ViewConfig> = {}): ViewConfig {
  return {
    id: "faculty",
    slug: "graduate-program-contacts",
    sourceId: "grad-programs",
    label: "Faculty Contacts",
    layout: "table",
    public: true,
    fields: [],
    ...overrides,
  };
}

const sourceConfig: SourceConfig = {
  id: "grad-programs",
  label: "GRAD Programs",
  sourceType: "sheet",
  smartsheetId: 7763577444192132,
};

afterEach(() => {
  vi.restoreAllMocks();
  storeMock.getPublicViewsBySlug.mockReset();
  storeMock.getSourceConfigById.mockReset();
  storeMock.listPublicPageSummaries.mockReset();
  smartsheetMock.getSmartsheetDataset.mockReset();
});

describe("public view resolution", () => {
  it("prefers helper columns before fallback columns", async () => {
    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "programName",
            label: "Program Name",
            source: {
              preferredColumnTitle: "Program Name Clean",
              fallbackColumnTitle: "Program Name",
            },
            render: { type: "text" },
          },
        ],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset(
        [
          { id: 100, index: 0, title: "Program Name", type: "TEXT_NUMBER" },
          { id: 101, index: 1, title: "Program Name Clean", type: "TEXT_NUMBER" },
        ],
        [
          createRow(1, [
            createCell(100, "Program Name", "Raw Name"),
            createCell(101, "Program Name Clean", "Clean Name"),
          ]),
        ]
      )
    );

    const page = await loadPublicPage("graduate-program-contacts");

    expect(page?.views[0]?.rows[0]?.fieldMap.programName.textValue).toBe("Clean Name");
  });

  it("logs schema drift when a view references missing columns", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "missingField",
            label: "Missing Field",
            source: { columnTitle: "Missing Column" },
            render: { type: "text" },
          },
        ],
        filters: [{ columnTitle: "Missing Filter", op: "equals", value: "Active" }],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset([{ id: 100, index: 0, title: "Program Name", type: "TEXT_NUMBER" }], [createRow(1, [createCell(100, "Program Name", "Biology")])])
    );

    await loadPublicPage("graduate-program-contacts");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Schema drift for slug "graduate-program-contacts" view "faculty"')
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('field "missingField"'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('filter "Missing Filter"'));
  });

  it("keeps rendering when one field transform throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "programName",
            label: "Program Name",
            source: { columnTitle: "Program Name" },
            render: { type: "text" },
          },
          {
            key: "brokenDate",
            label: "Broken Date",
            source: { columnTitle: "Broken Date" },
            transforms: [{ op: "format_date", dateStyle: "bogus" as never }],
            render: { type: "date" },
          },
        ],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue(sourceConfig);
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset(
        [
          { id: 100, index: 0, title: "Program Name", type: "TEXT_NUMBER" },
          { id: 101, index: 1, title: "Broken Date", type: "DATE" },
        ],
        [
          createRow(1, [
            createCell(100, "Program Name", "Biology"),
            createCell(101, "Broken Date", "2024-01-15"),
          ]),
        ]
      )
    );

    const page = await loadPublicPage("graduate-program-contacts");

    expect(page?.views[0]?.rows[0]?.fieldMap.programName.textValue).toBe("Biology");
    expect(page?.views[0]?.rows[0]?.fieldMap.brokenDate.isEmpty).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to resolve field "brokenDate"')
    );
  });

  it("reports partial schema drift for role groups when only some selectors disappear", () => {
    const warnings = collectSchemaDriftWarnings(
      createView({
        fields: [
          {
            key: "staffCoordinators",
            label: "Staff Coordinators",
            source: { kind: "role_group", roleGroupId: "staff" },
            render: { type: "people_group" },
          },
        ],
      }),
      [
        { id: 201, index: 0, title: "Staff Coordinator 1", type: "TEXT_NUMBER" },
        { id: 202, index: 1, title: "Staff Coordinator Email 1", type: "TEXT_NUMBER" },
        { id: 203, index: 2, title: "Staff Coordinator 2", type: "TEXT_NUMBER" },
      ],
      {
        ...sourceConfig,
        roleGroups: [
          {
            id: "staff",
            label: "Staff Coordinator",
            mode: "numbered_slots",
            slots: [
              {
                slot: "1",
                name: { columnId: 201, columnTitle: "Staff Coordinator 1" },
                email: { columnId: 202, columnTitle: "Staff Coordinator Email 1" },
              },
              {
                slot: "2",
                name: { columnId: 203, columnTitle: "Staff Coordinator 2" },
                email: { columnId: 204, columnTitle: "Staff Coordinator Email 2" },
              },
            ],
          },
        ],
      },
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('field "staffCoordinators"');
    expect(warnings[0]).toContain("missing source columns");
    expect(warnings[0]).toContain("Staff Coordinator Email 2");
  });

  it("resolves numbered role groups into structured people and excludes empty slots from text output", async () => {
    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "staffCoordinators",
            label: "Staff Coordinators",
            source: { kind: "role_group", roleGroupId: "staff" },
            render: { type: "people_group" },
          },
        ],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue({
      ...sourceConfig,
      roleGroups: [
        {
          id: "staff",
          label: "Staff Coordinators",
          mode: "numbered_slots",
          slots: [
            {
              slot: "1",
              name: { columnId: 201, columnTitle: "Staff Coordinator 1" },
              email: { columnId: 202, columnTitle: "Staff Coordinator Email 1" },
            },
            {
              slot: "2",
              name: { columnId: 203, columnTitle: "Staff Coordinator 2" },
              email: { columnId: 204, columnTitle: "Staff Coordinator Email 2" },
            },
          ],
        },
      ],
    });
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset(
        [
          { id: 201, index: 0, title: "Staff Coordinator 1", type: "TEXT_NUMBER" },
          { id: 202, index: 1, title: "Staff Coordinator Email 1", type: "TEXT_NUMBER" },
          { id: 203, index: 2, title: "Staff Coordinator 2", type: "TEXT_NUMBER" },
          { id: 204, index: 3, title: "Staff Coordinator Email 2", type: "TEXT_NUMBER" },
        ],
        [
          createRow(1, [
            createCell(201, "Staff Coordinator 1", "Lisa Lujan"),
            createCell(202, "Staff Coordinator Email 1", "llujan@wsu.edu"),
            createCell(203, "Staff Coordinator 2", ""),
            createCell(204, "Staff Coordinator Email 2", ""),
          ]),
        ],
      ),
    );

    const page = await loadPublicPage("graduate-program-contacts");
    const field = page?.views[0]?.rows[0]?.fieldMap.staffCoordinators;

    expect(field?.renderType).toBe("people_group");
    expect(field?.roleGroupReadOnly).toBe(false);
    expect(field?.people).toEqual([
      { slot: "1", name: "Lisa Lujan", email: "llujan@wsu.edu", isEmpty: false },
      { slot: "2", isEmpty: true },
    ]);
    expect(field?.textValue).toContain("Lisa Lujan");
    expect(field?.textValue).not.toContain("slot 2");
    expect(field?.listValue).toEqual(["Lisa Lujan\nllujan@wsu.edu"]);
  });

  it("extracts only email text from CONTACT_LIST role-group email slots", async () => {
    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "staffCoordinators",
            label: "Staff Coordinators",
            source: { kind: "role_group", roleGroupId: "staff" },
            render: { type: "people_group" },
          },
        ],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue({
      ...sourceConfig,
      roleGroups: [
        {
          id: "staff",
          label: "Staff Coordinators",
          mode: "numbered_slots",
          slots: [
            {
              slot: "1",
              name: { columnId: 201, columnTitle: "Staff Coordinator 1" },
              email: { columnId: 202, columnTitle: "Staff Coordinator Email 1", columnType: "CONTACT_LIST" },
              phone: { columnId: 203, columnTitle: "Staff Coordinator Phone 1" },
            },
          ],
        },
      ],
    });
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset(
        [
          { id: 201, index: 0, title: "Staff Coordinator 1", type: "TEXT_NUMBER" },
          { id: 202, index: 1, title: "Staff Coordinator Email 1", type: "CONTACT_LIST" },
          { id: 203, index: 2, title: "Staff Coordinator Phone 1", type: "TEXT_NUMBER" },
        ],
        [
          createRow(1, [
            createCell(201, "Staff Coordinator 1", "Lisa Lujan"),
            createContactCell(202, "Staff Coordinator Email 1", "llujan@wsu.edu", "Lisa Lujan"),
            createCell(203, "Staff Coordinator Phone 1", "(509) 335-9542"),
          ]),
        ],
      ),
    );

    const page = await loadPublicPage("graduate-program-contacts");
    const field = page?.views[0]?.rows[0]?.fieldMap.staffCoordinators;

    expect(field?.people).toEqual([
      {
        slot: "1",
        name: "Lisa Lujan",
        email: "llujan@wsu.edu",
        phone: "(509) 335-9542",
        isEmpty: false,
      },
    ]);
    expect(field?.textValue).toBe("Lisa Lujan\nllujan@wsu.edu\n(509) 335-9542");
  });

  it("marks trusted multi-attribute delimited role groups writable at runtime", async () => {
    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "legacyCoordinators",
            label: "Legacy Coordinators",
            source: { kind: "role_group", roleGroupId: "legacy" },
            render: { type: "people_group" },
          },
        ],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue({
      ...sourceConfig,
      roleGroups: [
        {
          id: "legacy",
          label: "Legacy Coordinators",
          mode: "delimited_parallel",
          delimited: {
            name: { source: { columnId: 301, columnTitle: "Coordinator" } },
            email: { source: { columnId: 302, columnTitle: "Coordinator Email" } },
            trustPairing: true,
          },
        },
      ],
    });
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset(
        [
          { id: 301, index: 0, title: "Coordinator", type: "TEXT_NUMBER" },
          { id: 302, index: 1, title: "Coordinator Email", type: "TEXT_NUMBER" },
        ],
        [
          createRow(1, [
            createCell(301, "Coordinator", "Bob Smith, Jane Doe"),
            createCell(302, "Coordinator Email", "smith@wsu.edu, doe@wsu.edu"),
          ]),
        ],
      ),
    );

    const page = await loadPublicPage("graduate-program-contacts");
    const field = page?.views[0]?.rows[0]?.fieldMap.legacyCoordinators;

    expect(field?.roleGroupReadOnly).toBe(false);
    expect(field?.people).toEqual([
      { slot: "1", name: "Bob Smith", email: "smith@wsu.edu", isEmpty: false },
      { slot: "2", name: "Jane Doe", email: "doe@wsu.edu", isEmpty: false },
    ]);
  });

  it("marks untrusted multi-attribute delimited role groups read-only at runtime", async () => {
    storeMock.getPublicViewsBySlug.mockResolvedValue([
      createView({
        fields: [
          {
            key: "legacyCoordinators",
            label: "Legacy Coordinators",
            source: { kind: "role_group", roleGroupId: "legacy" },
            render: { type: "people_group" },
          },
        ],
      }),
    ]);
    storeMock.getSourceConfigById.mockResolvedValue({
      ...sourceConfig,
      roleGroups: [
        {
          id: "legacy",
          label: "Legacy Coordinators",
          mode: "delimited_parallel",
          delimited: {
            name: { source: { columnId: 301, columnTitle: "Coordinator" } },
            email: { source: { columnId: 302, columnTitle: "Coordinator Email" } },
          },
        },
      ],
    });
    smartsheetMock.getSmartsheetDataset.mockResolvedValue(
      createDataset(
        [
          { id: 301, index: 0, title: "Coordinator", type: "TEXT_NUMBER" },
          { id: 302, index: 1, title: "Coordinator Email", type: "TEXT_NUMBER" },
        ],
        [
          createRow(1, [
            createCell(301, "Coordinator", "Bob Smith, Jane Doe"),
            createCell(302, "Coordinator Email", "smith@wsu.edu, doe@wsu.edu"),
          ]),
        ],
      ),
    );

    const page = await loadPublicPage("graduate-program-contacts");
    const field = page?.views[0]?.rows[0]?.fieldMap.legacyCoordinators;

    expect(field?.roleGroupReadOnly).toBe(true);
    expect(field?.people).toHaveLength(2);
  });
});
