import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contributorPasswordResetRateLimitKey,
  getPublicOrigin,
  getTrustedClientIp,
  shouldTrustProxyHeaders,
} from "@/lib/request-ip";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTrustedClientIp", () => {
  it("uses the first x-forwarded-for hop when proxy headers are explicitly trusted", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_TRUST_PROXY_HEADERS", "true");
    const h = new Headers();
    h.set("x-forwarded-for", "203.0.113.1, 10.0.0.1");
    expect(getTrustedClientIp(h)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when proxy headers are trusted", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_TRUST_PROXY_HEADERS", "true");
    const h = new Headers();
    h.set("x-real-ip", "198.51.100.3");
    expect(getTrustedClientIp(h)).toBe("198.51.100.3");
  });

  it("returns unknown when proxy headers are not trusted", () => {
    const h = new Headers();
    h.set("x-forwarded-for", "203.0.113.1");
    h.set("x-real-ip", "198.51.100.3");
    expect(getTrustedClientIp(h)).toBe("unknown");
  });

  it("trusts Railway proxy headers by default", () => {
    vi.stubEnv("RAILWAY_ENVIRONMENT", "production");
    expect(shouldTrustProxyHeaders()).toBe(true);

    const h = new Headers();
    h.set("x-forwarded-for", "203.0.113.9, 10.0.0.1");
    expect(getTrustedClientIp(h)).toBe("203.0.113.9");
  });

  it("returns unknown when no proxy headers are available", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_TRUST_PROXY_HEADERS", "true");
    expect(getTrustedClientIp(new Headers())).toBe("unknown");
  });
});

describe("contributorPasswordResetRateLimitKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses ip-prefixed bucket when proxy IP is trusted", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_TRUST_PROXY_HEADERS", "true");
    const h = new Headers();
    h.set("x-forwarded-for", "203.0.113.2");
    expect(contributorPasswordResetRateLimitKey(h, "any-token")).toBe("pwreset-ip:203.0.113.2");
  });

  it("uses token-derived bucket when IP is unknown", () => {
    const h = new Headers();
    const a = contributorPasswordResetRateLimitKey(h, "token-a");
    const b = contributorPasswordResetRateLimitKey(h, "token-b");
    expect(a).toMatch(/^pwreset:[0-9a-f]+:7$/);
    expect(b).toMatch(/^pwreset:[0-9a-f]+:7$/);
    expect(a).not.toBe(b);
  });
});

describe("getPublicOrigin", () => {
  it("prefers an explicit public base URL over request headers", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_PUBLIC_BASE_URL", "https://catalog.example.edu/base/path");

    const h = new Headers();
    h.set("x-forwarded-host", "ignored.example.edu");
    h.set("x-forwarded-proto", "http");

    expect(getPublicOrigin(h)).toBe("https://catalog.example.edu");
  });

  it("uses trusted forwarded host and proto on Railway-style deployments", () => {
    vi.stubEnv("RAILWAY_ENVIRONMENT", "production");

    const h = new Headers();
    h.set("x-forwarded-host", "catalog.example.edu");
    h.set("x-forwarded-proto", "https");

    expect(getPublicOrigin(h)).toBe("https://catalog.example.edu");
  });

  it("returns null for public origins when proxy headers are not trusted", () => {
    const h = new Headers();
    h.set("x-forwarded-host", "spoofed.example.edu");
    h.set("x-forwarded-proto", "https");
    h.set("host", "localhost:3000");

    expect(getPublicOrigin(h)).toBeNull();
  });
});
