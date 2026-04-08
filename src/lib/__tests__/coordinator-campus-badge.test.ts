import { describe, expect, it } from "vitest";
import { publicCoordinatorCampusBadgeLabel } from "@/lib/coordinator-campus-badge";

describe("publicCoordinatorCampusBadgeLabel", () => {
  it("returns undefined for empty and Do Not Show (case-insensitive)", () => {
    expect(publicCoordinatorCampusBadgeLabel("")).toBeUndefined();
    expect(publicCoordinatorCampusBadgeLabel("   ")).toBeUndefined();
    expect(publicCoordinatorCampusBadgeLabel(null)).toBeUndefined();
    expect(publicCoordinatorCampusBadgeLabel("do not show")).toBeUndefined();
    expect(publicCoordinatorCampusBadgeLabel("DO NOT SHOW")).toBeUndefined();
  });

  it("returns canonical label for approved campuses after trim", () => {
    expect(publicCoordinatorCampusBadgeLabel(" Pullman ")).toBe("Pullman");
    expect(publicCoordinatorCampusBadgeLabel("Tri-Cities")).toBe("Tri-Cities");
  });

  it("fails closed for unknown values", () => {
    expect(publicCoordinatorCampusBadgeLabel("Pullmanville")).toBeUndefined();
    expect(publicCoordinatorCampusBadgeLabel("Everett; Spokane")).toBeUndefined();
  });
});
