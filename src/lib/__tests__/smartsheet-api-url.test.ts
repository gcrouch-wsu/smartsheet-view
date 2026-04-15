import { describe, expect, it } from "vitest";
import { normalizeSmartsheetApiBaseUrl, validateOptionalSmartsheetApiBaseUrl } from "@/lib/smartsheet-api-url";

describe("normalizeSmartsheetApiBaseUrl", () => {
  it("defaults to the US API base", () => {
    expect(normalizeSmartsheetApiBaseUrl(undefined)).toBe("https://api.smartsheet.com/2.0");
  });

  it("accepts official EU base", () => {
    expect(normalizeSmartsheetApiBaseUrl("https://api.smartsheet.eu/2.0")).toBe("https://api.smartsheet.eu/2.0");
  });

  it("rejects arbitrary hosts", () => {
    expect(() => normalizeSmartsheetApiBaseUrl("https://evil.example.com/2.0")).toThrow(/not allowed/);
  });

  it("rejects non-https", () => {
    expect(() => normalizeSmartsheetApiBaseUrl("http://api.smartsheet.com/2.0")).toThrow(/https/);
  });
});

describe("validateOptionalSmartsheetApiBaseUrl", () => {
  it("returns undefined for empty", () => {
    expect(validateOptionalSmartsheetApiBaseUrl("")).toBeUndefined();
    expect(validateOptionalSmartsheetApiBaseUrl(undefined)).toBeUndefined();
  });

  it("returns message for bad host", () => {
    expect(validateOptionalSmartsheetApiBaseUrl("https://x.com/2.0")).toMatch(/not allowed/);
  });
});
