"use client";

import { DISPLAY_TIMEZONE_OPTIONS } from "@/lib/display-datetime";
import { useDisplayTimezone } from "@/components/public/DisplayTimezoneContext";

export function DisplayTimezoneSelector({ embed = false }: { embed?: boolean }) {
  const { timeZone, setTimeZone } = useDisplayTimezone();

  return (
    <label
      className={
        embed
          ? "inline-flex max-w-full flex-wrap items-center gap-1.5 text-xs text-[color:var(--wsu-muted)]"
          : "inline-flex max-w-full flex-wrap items-center gap-2 text-sm text-[color:var(--wsu-muted)]"
      }
    >
      <span className="whitespace-nowrap">Time zone</span>
      <select
        value={timeZone}
        onChange={(e) => setTimeZone(e.target.value)}
        className="view-input max-w-[min(18rem,100%)] rounded-lg px-2 py-1.5 text-sm text-[color:var(--wsu-ink)]"
        aria-label="Time zone for dates and times on this page"
      >
        {!DISPLAY_TIMEZONE_OPTIONS.some((o) => o.value === timeZone) && (
          <option value={timeZone}>{timeZone}</option>
        )}
        {DISPLAY_TIMEZONE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
