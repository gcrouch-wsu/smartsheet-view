import { describe, expect, it } from "vitest";
import { canOpenContributorEditor } from "@/components/public/ViewWithSearchAndIndex";

describe("canOpenContributorEditor", () => {
  it("disables contributor editing in embed mode", () => {
    expect(
      canOpenContributorEditor(true, "editor@wsu.edu", {
        contactColumnIds: [1],
        editableColumnIds: [2],
        fieldColumnMap: {},
        editableFields: [],
        editableFieldGroups: [],
      }),
    ).toBe(false);
  });

  it("requires a contributor session and editing config outside embed mode", () => {
    expect(canOpenContributorEditor(false, null, null)).toBe(false);
    expect(canOpenContributorEditor(false, "editor@wsu.edu", null)).toBe(false);
    expect(
      canOpenContributorEditor(false, "editor@wsu.edu", {
        contactColumnIds: [1],
        editableColumnIds: [2],
        fieldColumnMap: {},
        editableFields: [],
        editableFieldGroups: [],
      }),
    ).toBe(true);
  });
});
