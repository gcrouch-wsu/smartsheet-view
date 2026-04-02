/**
 * Postgres pool connection options.
 *
 * **Strict path** (no `SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL`): strips `sslmode=no-verify` (plus `no%2dverify`) from
 * the query string so URLs cannot accidentally opt out of certificate verification. Other libpq modes (`disable`,
 * `require`, `prefer`, `allow`, `verify-full`, …) are passed through unchanged — use `verify-full` / `verify-ca` in
 * production when your provider supports it; many hosts still ship `sslmode=require` in dashboard URLs.
 *
 * **Relaxed path** (flag true): forces `sslmode=no-verify` and `rejectUnauthorized: false` (legacy provider behavior).
 */
const INSECURE_SSL_ENV = "SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL";

export function isPgInsecureSslEnabled(): boolean {
  const v = process.env[INSECURE_SSL_ENV]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function stripNoVerifySslmodeParams(rawUrl: string): string {
  return rawUrl
    .replace(/([?&])sslmode=no-verify\b/gi, (_, p: string) => (p === "?" ? "?" : ""))
    .replace(/([?&])sslmode=no%2dverify\b/gi, (_, p: string) => (p === "?" ? "?" : ""))
    .replace(/([?&])sslmode=no%2Dverify\b/gi, (_, p: string) => (p === "?" ? "?" : ""))
    .replace(/\?&+/g, "?")
    .replace(/&&+/g, "&")
    .replace(/[?&]$/g, "");
}

function urlStillRequestsNoVerify(url: string): boolean {
  return /sslmode\s*=\s*no-verify\b/i.test(url) || /sslmode\s*=\s*no%2dverify\b/i.test(url);
}

/** Remove sslmode=no-verify (and URL-encoded hyphen) from the query string when strict TLS is required. */
export function sanitizeDatabaseUrlForStrictTls(rawUrl: string): string {
  if (isPgInsecureSslEnabled()) {
    return rawUrl;
  }
  const out = stripNoVerifySslmodeParams(rawUrl);
  if (urlStillRequestsNoVerify(out)) {
    throw new Error(
      "DATABASE_URL must not use sslmode=no-verify unless SMARTSHEETS_VIEW_DATABASE_INSECURE_SSL=true is set.",
    );
  }
  return out;
}

export function buildPgPoolOptions(rawUrl: string): { connectionString: string; ssl?: { rejectUnauthorized: boolean } } {
  if (isPgInsecureSslEnabled()) {
    const stripped = rawUrl
      .replace(/([?&])sslmode=[^&]*/g, (_, p: string) => (p === "?" ? "?" : ""))
      .replace(/\?&+/g, "?")
      .replace(/&&+/g, "&")
      .replace(/[?&]$/g, "");
    const connectionString =
      stripped + (stripped.includes("?") ? "&" : "?") + "sslmode=no-verify";
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
  const connectionString = sanitizeDatabaseUrlForStrictTls(rawUrl);
  return { connectionString };
}
