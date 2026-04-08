/** Approved per-person campus labels for coordinator role groups (see coordinator.md §5.2). */
export const COORDINATOR_CAMPUS_DISPLAY_LABELS = [
  "Everett",
  "Global",
  "Pullman",
  "Spokane",
  "Tri-Cities",
  "Vancouver",
] as const;

const APPROVED_SET = new Set<string>(COORDINATOR_CAMPUS_DISPLAY_LABELS);

/** Picklist options often include this sentinel; it must not show a public badge. */
export const COORDINATOR_CAMPUS_DO_NOT_SHOW = "Do Not Show";

/**
 * Smartsheet / contributor dropdown ordering aligned with the blueprint (Do Not Show + campuses).
 * Used when a column has no options in loaded schema (fallback only).
 */
export const COORDINATOR_CAMPUS_PICKLIST_FALLBACK_OPTIONS: string[] = [
  COORDINATOR_CAMPUS_DO_NOT_SHOW,
  ...COORDINATOR_CAMPUS_DISPLAY_LABELS,
];

/**
 * Returns the canonical badge label for an approved campus, or undefined for empty, Do Not Show,
 * or any value not exactly matching §5.2 after trim (fail closed).
 */
export function publicCoordinatorCampusBadgeLabel(raw: string | null | undefined): string | undefined {
  if (raw == null) {
    return undefined;
  }
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  if (t.toLowerCase() === COORDINATOR_CAMPUS_DO_NOT_SHOW.toLowerCase()) {
    return undefined;
  }
  if (APPROVED_SET.has(t)) {
    return t;
  }
  return undefined;
}
