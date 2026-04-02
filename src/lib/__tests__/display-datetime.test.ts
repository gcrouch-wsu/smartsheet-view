import { describe, expect, it } from "vitest";
import { formatDateInDisplayTimeZone } from "@/lib/display-datetime";

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
});
