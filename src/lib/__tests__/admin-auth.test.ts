import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_PASSWORD_ENV_VAR,
  ADMIN_USERNAME_ENV_VAR,
  authorizeAdminRequest,
} from "@/lib/admin-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authorizeAdminRequest", () => {
  it("fails closed when admin credentials are not configured", () => {
    vi.stubEnv(ADMIN_USERNAME_ENV_VAR, "");
    vi.stubEnv(ADMIN_PASSWORD_ENV_VAR, "");

    expect(authorizeAdminRequest(null)).toEqual({
      ok: false,
      status: 503,
      message: `Admin authentication is not configured. Set ${ADMIN_USERNAME_ENV_VAR} and ${ADMIN_PASSWORD_ENV_VAR}.`,
    });
  });

  it("rejects missing or invalid basic auth credentials", () => {
    vi.stubEnv(ADMIN_USERNAME_ENV_VAR, "admin");
    vi.stubEnv(ADMIN_PASSWORD_ENV_VAR, "secret");

    const result = authorizeAdminRequest("Basic bad-value");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.headers?.["WWW-Authenticate"]).toContain("Basic realm=");
  });

  it("accepts correct basic auth credentials", () => {
    vi.stubEnv(ADMIN_USERNAME_ENV_VAR, "admin");
    vi.stubEnv(ADMIN_PASSWORD_ENV_VAR, "secret");

    const header = `Basic ${Buffer.from("admin:secret").toString("base64")}`;

    expect(authorizeAdminRequest(header)).toEqual({ ok: true });
  });
});