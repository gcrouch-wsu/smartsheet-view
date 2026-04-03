/** Campus labels for program group headers (and filter chip styling alignment). */
export function CampusBadgeStrip({ campuses, className = "" }: { campuses: string[]; className?: string }) {
  if (campuses.length === 0) {
    return null;
  }
  return (
    <div className={`mt-2 flex flex-wrap gap-1.5 ${className}`} aria-label="Campuses for this program">
      {campuses.map((c) => (
        <span
          key={c}
          className="rounded-full border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/40 px-2.5 py-0.5 text-xs font-medium text-[color:var(--wsu-ink)]"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
