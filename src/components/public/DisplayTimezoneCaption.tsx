"use client";

import { labelForDisplayTimeZone } from "@/lib/display-datetime";

export function DisplayTimezoneCaption({
  timeZone,
  embed = false,
}: {
  timeZone: string;
  embed?: boolean;
}) {
  const label = labelForDisplayTimeZone(timeZone);

  return (
    <p
      className={
        embed
          ? "m-0 text-xs text-[color:var(--wsu-muted)]"
          : "m-0 text-sm text-[color:var(--wsu-muted)]"
      }
      role="note"
    >
      <span className="font-medium text-[color:var(--wsu-ink)]">Dates &amp; times</span>
      <span className="mx-1.5 text-[color:var(--wsu-border)]" aria-hidden>
        ·
      </span>
      <span>{label}</span>
      <span className="sr-only"> ({timeZone})</span>
    </p>
  );
}
