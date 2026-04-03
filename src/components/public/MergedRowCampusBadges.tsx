import { CampusBadgeStrip } from "@/components/public/CampusBadgeStrip";
import type { ResolvedViewRow } from "@/lib/config/types";

/** Campus badges for rows merged across campuses (same program + matching emails). */
export function MergedRowCampusBadges({
  row,
  /** Hide when program section headers already show the full campus strip for the group. */
  suppressWhenProgramSections,
}: {
  row: ResolvedViewRow;
  suppressWhenProgramSections?: boolean;
}) {
  if (suppressWhenProgramSections || !row.mergedCampuses?.length) {
    return null;
  }
  return <CampusBadgeStrip campuses={row.mergedCampuses} className="mt-2" />;
}
