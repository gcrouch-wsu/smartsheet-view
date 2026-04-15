/** Official Smartsheet API bases only (SSRF / token exfiltration prevention). */
const ALLOWED_ORIGINS = new Set(["https://api.smartsheet.com", "https://api.smartsheet.eu"]);

export const DEFAULT_SMARTSHEET_API_BASE_URL = "https://api.smartsheet.com/2.0";

/**
 * Normalizes and validates a Smartsheet REST base URL (must be https, allowed host, path /2.0).
 * @throws Error with a short message when invalid.
 */
export function normalizeSmartsheetApiBaseUrl(input: string | undefined): string {
  const fallback = DEFAULT_SMARTSHEET_API_BASE_URL;
  const raw = (input?.trim() || fallback).replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new Error(`Invalid Smartsheet API base URL: ${input ?? ""}`.trim());
  }
  if (url.protocol !== "https:") {
    throw new Error("Smartsheet API base URL must use https.");
  }
  const origin = `${url.protocol}//${url.host}`;
  if (!ALLOWED_ORIGINS.has(origin)) {
    throw new Error(`Smartsheet API host not allowed: ${origin}. Use api.smartsheet.com or api.smartsheet.eu.`);
  }
  const pathname = (url.pathname || "").replace(/\/+$/, "") || "";
  if (pathname !== "" && pathname !== "/2.0") {
    throw new Error(`Smartsheet API path must be /2.0 (got "${pathname || "/"}").`);
  }
  return `${origin}/2.0`;
}

/** For config validation: returns an error string, or undefined when ok (including empty = unset). */
export function validateOptionalSmartsheetApiBaseUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    return "apiBaseUrl must be a string.";
  }
  try {
    normalizeSmartsheetApiBaseUrl(value);
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid apiBaseUrl.";
  }
}
