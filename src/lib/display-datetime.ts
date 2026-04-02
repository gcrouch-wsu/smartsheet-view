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

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
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

  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, y, m, d] = isoDateOnly;
    const utcNoon = Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    return new Intl.DateTimeFormat(locale, { dateStyle, timeZone }).format(utcNoon);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
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
  }).format(parsed);
}
