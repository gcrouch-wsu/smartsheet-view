/**
 * Best-effort client IP from `x-forwarded-for` / `x-real-ip`.
 * On Vercel these are set by the platform. On self-hosted stacks, incorrect or spoofable headers
 * weaken IP-based rate limits unless your reverse proxy overwrites or validates them.
 */
export function getTrustedClientIp(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}
