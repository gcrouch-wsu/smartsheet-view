import { describe, expect, it } from "vitest";
import { getTrustedClientIp } from "@/lib/request-ip";

describe("getTrustedClientIp", () => {
  it("uses the first x-forwarded-for hop when present", () => {
    const h = new Headers();
    h.set("x-forwarded-for", "203.0.113.1, 10.0.0.1");
    expect(getTrustedClientIp(h)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers();
    h.set("x-real-ip", "198.51.100.3");
    expect(getTrustedClientIp(h)).toBe("198.51.100.3");
  });

  it("returns unknown when no proxy headers", () => {
    expect(getTrustedClientIp(new Headers())).toBe("unknown");
  });
});
