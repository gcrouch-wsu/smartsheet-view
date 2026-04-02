/** Default when a view omits `displayTimeZone` or stores an invalid IANA name. */
export const VIEW_DISPLAY_TIMEZONE_DEFAULT = "America/Los_Angeles";

/** IANA zones offered in the admin time zone control (labels are US-centric where common). */
export const DISPLAY_TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "Europe/London", label: "London" },
  { value: "UTC", label: "UTC" },
];

export function isValidIanaTimeZone(tz: string | undefined | null): boolean {
  if (typeof tz !== "string" || !tz.trim()) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/** Effective IANA zone for a view config (validated `displayTimeZone` or default). */
export function effectiveViewDisplayTimeZone(view: { displayTimeZone?: string }): string {
  const tz = view.displayTimeZone?.trim();
  if (tz && isValidIanaTimeZone(tz)) {
    return tz;
  }
  return VIEW_DISPLAY_TIMEZONE_DEFAULT;
}

export function labelForDisplayTimeZone(iana: string): string {
  const found = DISPLAY_TIMEZONE_OPTIONS.find((o) => o.value === iana);
  return found?.label ?? iana;
}

/**
 * Format Smartsheet fetch time for the public header "Refreshed" line using the view's display zone
 * (e.g. "2:34 PM PDT"). Use `<time dateTime={iso}>` for the full instant.
 */
export function formatFetchedAtInViewTimeZone(iso: string, ianaTimeZone: string | undefined): string {
  const tz =
    typeof ianaTimeZone === "string" && ianaTimeZone.trim() && isValidIanaTimeZone(ianaTimeZone)
      ? ianaTimeZone.trim()
      : VIEW_DISPLAY_TIMEZONE_DEFAULT;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

/**
 * Milliseconds since epoch for a Smartsheet / ISO-style value, or null if not parseable.
 *
 * - `YYYY-MM-DD` → UTC noon on that calendar day (stable across zones for date-only cells).
 * - `YYYY-MM-DDTHH:mm:ss` **without** offset → treated as **UTC** (Smartsheet docs: values are UTC).
 *   JS would otherwise parse offset-less strings as *local* wall time, which differs between
 *   Node on Vercel (often TZ=UTC) and browsers (user zone), breaking public pages vs live preview.
 */
export function instantMillisFromSmartsheetDateString(trimmed: string): number | null {
  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, y, m, d] = isoDateOnly;
    return Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/.test(trimmed) &&
    !/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)
  ) {
    const d = new Date(`${trimmed}Z`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Format a Smartsheet / ISO date string for display in a chosen IANA time zone.
 * Date-only `YYYY-MM-DD` is treated as a calendar date (no daylight shift of the day).
 */
export function formatDateInDisplayTimeZone(
  raw: string,
  timeZone: string,
  options?: {
    locale?: string;
    dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
    timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  },
): string {
  const locale = options?.locale ?? "en-US";
  const dateStyle = options?.dateStyle ?? "medium";
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const ms = instantMillisFromSmartsheetDateString(trimmed);
  if (ms === null) {
    return raw;
  }

  const looksLikeDateTime =
    /[T ]\d{1,2}:\d{2}/.test(trimmed) ||
    trimmed.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(trimmed) ||
    /[+-]\d{4}$/.test(trimmed);

  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle: options?.timeStyle ?? (looksLikeDateTime ? "short" : undefined),
    timeZone,
  }).format(ms);
}
