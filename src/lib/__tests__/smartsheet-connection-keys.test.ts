import { afterEach, describe, expect, it, vi } from "vitest";
import { listConfiguredSmartsheetConnectionKeys } from "@/lib/smartsheet-connection-keys";

describe("listConfiguredSmartsheetConnectionKeys", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes only JSON keys that have a usable token (string or object)", () => {
    vi.stubEnv(
      "SMARTSHEET_CONNECTIONS_JSON",
      JSON.stringify({
        goodString: "tok",
        emptyString: "   ",
        badObject: { token: "" },
        goodObject: { token: "x", apiBaseUrl: "https://api.smartsheet.com/2.0" },
        badUrl: { token: "y", apiBaseUrl: "https://evil.example/2.0" },
      }),
    );
    vi.stubEnv("SMARTSHEET_API_TOKEN", "");

    const keys = listConfiguredSmartsheetConnectionKeys();
    expect(keys.sort()).toEqual(["goodObject", "goodString"].sort());
  });

  it("prepends default when SMARTSHEET_API_TOKEN is set", () => {
    vi.stubEnv("SMARTSHEET_API_TOKEN", "env-token");
    vi.stubEnv("SMARTSHEET_CONNECTIONS_JSON", "");
    expect(listConfiguredSmartsheetConnectionKeys()).toEqual(["default"]);
  });
});
