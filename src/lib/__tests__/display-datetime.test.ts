import { describe, expect, it } from "vitest";
import {
  effectiveViewDisplayTimeZone,
  formatDateInDisplayTimeZone,
  instantMillisFromSmartsheetDateString,
} from "@/lib/display-datetime";

describe("effectiveViewDisplayTimeZone", () => {
  it("defaults when unset or invalid", () => {
    expect(effectiveViewDisplayTimeZone({})).toBe("America/Los_Angeles");
    expect(effectiveViewDisplayTimeZone({ displayTimeZone: "Not/AZone" })).toBe("America/Los_Angeles");
  });

  it("uses valid IANA from view config", () => {
    expect(effectiveViewDisplayTimeZone({ displayTimeZone: "America/New_York" })).toBe("America/New_York");
  });
});

describe("instantMillisFromSmartsheetDateString", () => {
  it("treats offset-less T-datetime as UTC (Smartsheet-style)", () => {
    const la = instantMillisFromSmartsheetDateString("2026-01-08T20:19:00");
    const withZ = instantMillisFromSmartsheetDateString("2026-01-08T20:19:00Z");
    expect(la).not.toBeNull();
    expect(withZ).not.toBeNull();
    expect(la).toBe(withZ);
  });
});

describe("formatDateInDisplayTimeZone", () => {
  it("keeps calendar date for YYYY-MM-DD across zones", () => {
    const la = formatDateInDisplayTimeZone("2026-01-08", "America/Los_Angeles", { dateStyle: "medium" });
    const utc = formatDateInDisplayTimeZone("2026-01-08", "UTC", { dateStyle: "medium" });
    expect(la).toContain("2026");
    expect(la).toContain("8");
    expect(utc).toContain("2026");
    expect(utc).toContain("8");
  });

  it("shifts instant to Pacific when datetime is UTC", () => {
    const out = formatDateInDisplayTimeZone("2026-01-08T20:19:00.000Z", "America/Los_Angeles", {
      dateStyle: "short",
      timeStyle: "short",
    });
    expect(out.length).toBeGreaterThan(4);
  });

  it("matches Z and offset-less Smartsheet UTC strings in Pacific", () => {
    const a = formatDateInDisplayTimeZone("2026-01-08T20:19:00Z", "America/Los_Angeles", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const b = formatDateInDisplayTimeZone("2026-01-08T20:19:00", "America/Los_Angeles", {
      dateStyle: "short",
      timeStyle: "short",
    });
    expect(a).toBe(b);
  });
});
