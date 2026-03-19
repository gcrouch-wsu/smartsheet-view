import { afterEach, describe, expect, it, vi } from "vitest";

import reportResponseFixture from "@/lib/__tests__/fixtures/report-response.json";
import sheetResponseFixture from "@/lib/__tests__/fixtures/sheet-response.json";
import type { SourceConfig } from "@/lib/config/types";
import { getSmartsheetDataset, testSmartsheetConnection } from "@/lib/smartsheet";

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
