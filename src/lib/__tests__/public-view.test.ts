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

import { loadPublicPage } from "@/lib/public-view";

function createCell(columnId: number, columnTitle: string, value: unknown): SmartsheetCell {
  return {
    columnId,
    columnTitle,
    columnType: "TEXT_NUMBER",
    value,
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
});
