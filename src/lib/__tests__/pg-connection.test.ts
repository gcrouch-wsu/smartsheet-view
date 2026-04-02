import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPgPoolOptions, sanitizeDatabaseUrlForStrictTls } from "@/lib/pg-connection";

describe("pg-connection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats absent SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL like disabled (strip no-verify)", () => {
    delete process.env.SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL;
    const url = "postgresql://u@h/db?sslmode=no-verify";
    expect(buildPgPoolOptions(url)).toEqual({ connectionString: "postgresql://u@h/db" });
  });

  it("returns connection string unchanged when no insecure sslmode and flag is off", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "0");
    const url = "postgresql://u:p@h.example/db?sslmode=verify-full";
    expect(buildPgPoolOptions(url)).toEqual({ connectionString: url });
  });

  it("does not rewrite other libpq sslmodes in strict mode (e.g. disable, require)", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "");
    expect(buildPgPoolOptions("postgresql://u@h/db?sslmode=disable")).toEqual({
      connectionString: "postgresql://u@h/db?sslmode=disable",
    });
    expect(buildPgPoolOptions("postgresql://u@h/db?sslmode=require")).toEqual({
      connectionString: "postgresql://u@h/db?sslmode=require",
    });
  });

  it("strips sslmode=no-verify from DATABASE_URL when insecure flag is off", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "");
    const url = "postgresql://u:p@h/db?sslmode=no-verify&foo=1";
    expect(buildPgPoolOptions(url)).toEqual({
      connectionString: "postgresql://u:p@h/db?foo=1",
    });
  });

  it("strips URL-encoded sslmode=no-verify", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "false");
    const url = "postgresql://u:p@h/db?sslmode=no%2dverify";
    expect(buildPgPoolOptions(url)).toEqual({
      connectionString: "postgresql://u:p@h/db",
    });
  });

  it("forces sslmode=no-verify and rejectUnauthorized false when insecure flag is on", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "true");
    const url = "postgresql://u:p@h/db?sslmode=verify-full";
    const opts = buildPgPoolOptions(url);
    expect(opts.connectionString).toContain("sslmode=no-verify");
    expect(opts.connectionString).not.toMatch(/\?&/);
    expect(opts.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("sanitizeDatabaseUrlForStrictTls passes through verify-full URLs", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "0");
    const url = "postgresql://u:p@h/db?sslmode=verify-full";
    expect(sanitizeDatabaseUrlForStrictTls(url)).toBe(url);
  });

  it("throws when sslmode=no-verify appears in a form stripNoVerifySslmodeParams does not remove", () => {
    vi.stubEnv("SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL", "false");
    expect(() => sanitizeDatabaseUrlForStrictTls("postgresql://h/db?sslmode= no-verify")).toThrow(
      /SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL/,
    );
  });
});
