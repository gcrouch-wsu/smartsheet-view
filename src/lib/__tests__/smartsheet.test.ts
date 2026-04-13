import { afterEach, describe, expect, it, vi } from "vitest";

import reportResponseFixture from "@/lib/__tests__/fixtures/report-response.json";
import sheetResponseFixture from "@/lib/__tests__/fixtures/sheet-response.json";
import type { SourceConfig } from "@/lib/config/types";
import {
  extractSmartsheetErrorMessage,
  getSmartsheetDataset,
  httpStatusForSmartsheetContributorError,
  formatCellsForSmartsheetRowPut,
  normalizeCellsForSmartsheetRowUpdate,
  resolveSheetIdForRowUpdate,
  testSmartsheetConnection,
  updateSmartsheetRow,
} from "@/lib/smartsheet";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status: 200,
    ...init,
  });
}

describe("smartsheet normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("normalizes sheet responses and preserves value, displayValue, and objectValue", async () => {
    vi.stubEnv("SMARTSHEET_API_TOKEN", "token-123");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sheetResponseFixture));
    vi.stubGlobal("fetch", fetchMock);

    const source: SourceConfig = {
      id: "grad-programs",
      label: "GRAD Programs",
      sourceType: "sheet",
      smartsheetId: 7763577444192132,
      fetchOptions: {
        includeObjectValue: true,
        includeColumnOptions: true,
        level: 2,
      },
    };

    const dataset = await getSmartsheetDataset(source);

    expect(dataset).toMatchObject({
      sourceType: "sheet",
      id: 7763577444192132,
      name: "GRAD Programs",
    });
    expect(dataset.columns).toEqual([
      {
        id: 100,
        index: 0,
        title: "Program Name",
        type: "TEXT_NUMBER",
        options: undefined,
        locked: undefined,
      },
      {
        id: 101,
        index: 1,
        title: "Director Email",
        type: "CONTACT_LIST",
        options: ["Example"],
        locked: true,
      },
    ]);
    expect(dataset.rows[0]?.cellsByTitle["director email"]).toEqual({
      columnId: 101,
      columnTitle: "Director Email",
      columnType: "CONTACT_LIST",
      value: "director@wsu.edu",
      displayValue: "Director Name",
      objectValue: {
        objectType: "CONTACT",
        email: "director@wsu.edu",
        name: "Director Name",
      },
    });

    const [url, requestInit] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe("/2.0/sheets/7763577444192132");
    expect(url.searchParams.get("level")).toBe("2");
    expect(url.searchParams.get("include")?.split(",").sort()).toEqual([
      "columnOptions",
      "columnType",
      "objectValue",
    ]);
    expect(requestInit.headers).toEqual({
      Authorization: "Bearer token-123",
    });
  });

  it("preserves report row sheetId metadata", async () => {
    vi.stubEnv("SMARTSHEET_API_TOKEN", "token-123");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(reportResponseFixture));
    vi.stubGlobal("fetch", fetchMock);

    const dataset = await getSmartsheetDataset({
      id: "faculty-report",
      label: "Faculty Report",
      sourceType: "report",
      smartsheetId: 444,
    });

    expect(dataset.sourceType).toBe("report");
    expect(dataset.rows[0]?.sheetId).toBe(9999);
  });

  it("normalizes picklist options when API returns object-shaped entries", async () => {
    vi.stubEnv("SMARTSHEET_API_TOKEN", "token-123");

    const body = {
      id: 1,
      name: "S",
      columns: [
        {
          id: 200,
          index: 0,
          title: "Campus",
          type: "PICKLIST",
          options: [{ value: "Pullman" }, { name: "Spokane" }, { label: "Tri-Cities" }],
        },
      ],
      rows: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(body));
    vi.stubGlobal("fetch", fetchMock);

    const dataset = await getSmartsheetDataset({
      id: "x",
      label: "X",
      sourceType: "sheet",
      smartsheetId: 1,
    });

    expect(dataset.columns[0]?.options).toEqual(["Pullman", "Spokane", "Tri-Cities"]);
  });

  it("applies request-scoped fetch overrides without mutating the source config", async () => {
    vi.stubEnv("SMARTSHEET_API_TOKEN", "token-123");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sheetResponseFixture));
    vi.stubGlobal("fetch", fetchMock);

    const source: SourceConfig = {
      id: "grad-programs",
      label: "GRAD Programs",
      sourceType: "sheet",
      smartsheetId: 7763577444192132,
      fetchOptions: {
        includeObjectValue: false,
        includeColumnOptions: true,
      },
    };

    await getSmartsheetDataset(source, {
      fetchOptionsOverride: {
        includeObjectValue: true,
        level: 3,
      },
    });

    const [url] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("include")?.split(",").sort()).toEqual([
      "columnOptions",
      "columnType",
      "objectValue",
    ]);
    expect(url.searchParams.get("level")).toBe("3");
    expect(source.fetchOptions?.includeObjectValue).toBe(false);
  });

  it("falls back to the first named connection when no default token is configured", async () => {
    vi.stubEnv(
      "SMARTSHEET_CONNECTIONS_JSON",
      JSON.stringify({
        wsu: {
          token: "named-token",
          apiBaseUrl: "https://api.smartsheet.eu/2.0",
        },
      })
    );
    vi.stubEnv("SMARTSHEET_API_TOKEN", "");

    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(testSmartsheetConnection()).resolves.toBe(true);

    const [url, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.smartsheet.eu/2.0/users/me");
    expect(requestInit.headers).toEqual({
      Authorization: "Bearer named-token",
    });
  });
});

describe("resolveSheetIdForRowUpdate", () => {
  it("uses row.sheetId when present (report source)", () => {
    expect(
      resolveSheetIdForRowUpdate(
        { sourceType: "report", smartsheetId: 444 },
        { sheetId: 9999 },
      ),
    ).toBe(9999);
  });

  it("falls back to smartsheetId for sheet sources when row.sheetId is missing", () => {
    expect(
      resolveSheetIdForRowUpdate(
        { sourceType: "sheet", smartsheetId: 7763577444192132 },
        {},
      ),
    ).toBe(7763577444192132);
  });

  it("returns null for report sources when row.sheetId is missing", () => {
    expect(
      resolveSheetIdForRowUpdate(
        { sourceType: "report", smartsheetId: 444 },
        {},
      ),
    ).toBeNull();
  });
});

describe("updateSmartsheetRow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("logs row-update metadata without logging payload values", async () => {
    vi.stubEnv("SMARTSHEET_API_TOKEN", "token-123");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);

    await updateSmartsheetRow(
      {
        id: "grad-programs",
        label: "GRAD Programs",
        sourceType: "sheet",
        smartsheetId: 7763577444192132,
      },
      123,
      456,
      [{ columnId: 10, value: "secret@example.com" }],
      new Map([[10, "TEXT_NUMBER"]]),
    );

    expect(logSpy).toHaveBeenCalledWith("[updateSmartsheetRow] PUT sheet=123 row=456 cellCount=1");
    expect(String(logSpy.mock.calls[0]?.[0] ?? "")).not.toContain("secret@example.com");
  });
});

describe("extractSmartsheetErrorMessage", () => {
  it("parses JSON message field and appends refId when present", () => {
    expect(
      extractSmartsheetErrorMessage(
        '{"refId":"abc-123","errorCode":1006,"message":"Not Found"}',
      ),
    ).toBe("Not Found (Smartsheet ref: abc-123)");
  });

  it("returns default for HTML bodies", () => {
    expect(extractSmartsheetErrorMessage("<html>error</html>")).toBe("Update failed. Try again.");
  });
});

describe("httpStatusForSmartsheetContributorError", () => {
  it("maps 401 to 502 and preserves 403", () => {
    expect(httpStatusForSmartsheetContributorError(401)).toBe(502);
    expect(httpStatusForSmartsheetContributorError(403)).toBe(403);
    expect(httpStatusForSmartsheetContributorError(429)).toBe(429);
    expect(httpStatusForSmartsheetContributorError(500)).toBe(502);
  });
});

describe("normalizeCellsForSmartsheetRowUpdate", () => {
  it("drops value when objectValue is set (avoids mixed cell payloads)", () => {
    expect(
      normalizeCellsForSmartsheetRowUpdate([
        { columnId: 1, value: null, objectValue: { objectType: "CONTACT", email: "a@b.com" } },
      ]),
    ).toEqual([{ columnId: 1, objectValue: { objectType: "CONTACT", email: "a@b.com" } }]);
  });

  it("uses empty string when value is null and there is no objectValue", () => {
    expect(normalizeCellsForSmartsheetRowUpdate([{ columnId: 2, value: null }])).toEqual([
      { columnId: 2, value: "" },
    ]);
  });
});

describe("formatCellsForSmartsheetRowPut", () => {
  it("keeps objectValue for CONTACT_LIST columns", () => {
    const types = new Map<number, string>([
      [101, "CONTACT_LIST"],
    ]);
    expect(
      formatCellsForSmartsheetRowPut(
        [{ columnId: 101, objectValue: { objectType: "CONTACT", email: "a@wsu.edu" } }],
        types,
      ),
    ).toEqual([{ columnId: 101, objectValue: { objectType: "CONTACT", email: "a@wsu.edu" } }]);
  });

  it("keeps objectValue for MULTI_CONTACT_LIST columns", () => {
    const types = new Map<number, string>([
      [102, "MULTI_CONTACT_LIST"],
    ]);
    const ov = {
      objectType: "MULTI_CONTACT",
      values: [
        { objectType: "CONTACT", email: "a@wsu.edu" },
        { objectType: "CONTACT", email: "b@wsu.edu" },
      ],
    };
    expect(formatCellsForSmartsheetRowPut([{ columnId: 102, objectValue: ov }], types)).toEqual([
      { columnId: 102, objectValue: ov },
    ]);
  });

  it("uses value for TEXT_NUMBER columns", () => {
    const types = new Map<number, string>([
      [10, "TEXT_NUMBER"],
    ]);
    expect(formatCellsForSmartsheetRowPut([{ columnId: 10, value: "Hello" }], types)).toEqual([
      { columnId: 10, value: "Hello" },
    ]);
  });

  it("clears CONTACT_LIST with value empty string instead of bare CONTACT objectValue (avoids API 1008)", () => {
    const types = new Map<number, string>([[101, "CONTACT_LIST"]]);
    expect(formatCellsForSmartsheetRowPut([{ columnId: 101, objectValue: { objectType: "CONTACT" } }], types)).toEqual([
      { columnId: 101, value: "" },
    ]);
    expect(formatCellsForSmartsheetRowPut([{ columnId: 101, value: "" }], types)).toEqual([{ columnId: 101, value: "" }]);
  });

  it("clears MULTI_CONTACT_LIST with value empty string (Smartsheet error 1012 rejects empty values array)", () => {
    const types = new Map<number, string>([[102, "MULTI_CONTACT_LIST"]]);
    expect(formatCellsForSmartsheetRowPut([{ columnId: 102, value: "" }], types)).toEqual([
      { columnId: 102, value: "" },
    ]);
    // Empty objectValue also clears via value: ""
    expect(
      formatCellsForSmartsheetRowPut(
        [{ columnId: 102, objectValue: { objectType: "MULTI_CONTACT", values: [] } }],
        types,
      ),
    ).toEqual([{ columnId: 102, value: "" }]);
  });

  it("sanitizes MULTI_CONTACT_LIST objectValue and drops empty CONTACT entries", () => {
    const types = new Map<number, string>([[102, "MULTI_CONTACT_LIST"]]);
    const messy = {
      objectType: "MULTI_CONTACT",
      values: [
        { objectType: "CONTACT", email: "a@wsu.edu" },
        { objectType: "CONTACT" },
        { objectType: "CONTACT", name: "  " },
        { objectType: "CONTACT", email: "b@wsu.edu", name: "B" },
      ],
    };
    expect(formatCellsForSmartsheetRowPut([{ columnId: 102, objectValue: messy }], types)).toEqual([
      {
        columnId: 102,
        objectValue: {
          objectType: "MULTI_CONTACT",
          values: [
            { objectType: "CONTACT", email: "a@wsu.edu" },
            { objectType: "CONTACT", email: "b@wsu.edu", name: "B" },
          ],
        },
      },
    ]);
  });

  it("rewrites mistaken MULTI_CONTACT `value` array to API-correct `values` on write", () => {
    const types = new Map<number, string>([[102, "MULTI_CONTACT_LIST"]]);
    const legacy = {
      objectType: "MULTI_CONTACT",
      value: [{ objectType: "CONTACT", email: "legacy@wsu.edu" }],
    };
    expect(formatCellsForSmartsheetRowPut([{ columnId: 102, objectValue: legacy }], types)).toEqual([
      {
        columnId: 102,
        objectValue: {
          objectType: "MULTI_CONTACT",
          values: [{ objectType: "CONTACT", email: "legacy@wsu.edu" }],
        },
      },
    ]);
  });

  it("converts MULTI_PICKLIST comma-separated value to API objectValue", () => {
    const types = new Map<number, string>([[214, "MULTI_PICKLIST"]]);
    expect(
      formatCellsForSmartsheetRowPut([{ columnId: 214, value: "Pullman, Spokane" }], types),
    ).toEqual([
      {
        columnId: 214,
        objectValue: { objectType: "MULTI_PICKLIST", values: ["Pullman", "Spokane"] },
      },
    ]);
  });

  it("clears MULTI_PICKLIST with value empty string or empty objectValue values", () => {
    const types = new Map<number, string>([[214, "MULTI_PICKLIST"]]);
    expect(formatCellsForSmartsheetRowPut([{ columnId: 214, value: "" }], types)).toEqual([
      { columnId: 214, value: "" },
    ]);
    expect(
      formatCellsForSmartsheetRowPut(
        [{ columnId: 214, objectValue: { objectType: "MULTI_PICKLIST", values: [] } }],
        types,
      ),
    ).toEqual([{ columnId: 214, value: "" }]);
  });

  it("keeps valid MULTI_PICKLIST objectValue from client", () => {
    const types = new Map<number, string>([[214, "MULTI_PICKLIST"]]);
    const ov = { objectType: "MULTI_PICKLIST" as const, values: ["A", "B"] };
    expect(formatCellsForSmartsheetRowPut([{ columnId: 214, objectValue: ov }], types)).toEqual([
      { columnId: 214, objectValue: ov },
    ]);
  });
});
