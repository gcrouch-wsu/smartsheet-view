import { describe, expect, it } from "vitest";
import {
  campusTokensFromResolvedField,
  groupResolvedRows,
  indexLetterFromLabel,
  isCampusGroupingActive,
  narrowProgramGroupsToFilteredRows,
  normalizeCampusDisplay,
  normalizeGroupKey,
  resolvedRowCampusBadgeLabels,
  suppressMergedRowCampusBadgesWhenSectionStripShows,
} from "@/lib/campus-grouping";
import type { ResolvedFieldValue } from "@/lib/config/types";
import type { ResolvedViewRow } from "@/lib/config/types";

function makeRow(id: number, program: string, campus: string): ResolvedViewRow {
  const programKey = "program_name";
  const campusKey = "grad_campus";
  const programField = {
    key: programKey,
    label: "Program",
    renderType: "text" as const,
    textValue: program,
    listValue: [],
    links: [],
    isEmpty: !program,
    hideWhenEmpty: false,
  };
  const campusField = {
    key: campusKey,
    label: "Campus",
    renderType: "text" as const,
    textValue: campus,
    listValue: [],
    links: [],
    isEmpty: !campus,
    hideWhenEmpty: false,
  };
  return {
    id,
    fields: [programField, campusField],
    fieldMap: { [programKey]: programField, [campusKey]: campusField },
  };
}

describe("campus-grouping", () => {
  it("normalizeGroupKey trims and lowercases", () => {
    expect(normalizeGroupKey("  Computer Science  ")).toBe("computer science");
    expect(normalizeGroupKey("")).toBe("");
  });

  it("resolvedRowCampusBadgeLabels uses listValue for MULTI_PICKLIST-style badge fields", () => {
    const campusKey = "campus";
    const campusField: ResolvedFieldValue = {
      key: campusKey,
      label: "Campus",
      renderType: "badge",
      textValue: "Global, Pullman",
      listValue: ["Global", "Pullman"],
      links: [],
      isEmpty: false,
      hideWhenEmpty: false,
    };
    const row: ResolvedViewRow = {
      id: 1,
      fields: [campusField],
      fieldMap: { [campusKey]: campusField },
    };
    expect(resolvedRowCampusBadgeLabels(row, campusKey)).toEqual(["Global", "Pullman"]);
  });

  it("resolvedRowCampusBadgeLabels splits comma-joined text when listValue is empty", () => {
    const campusKey = "campus";
    const campusField: ResolvedFieldValue = {
      key: campusKey,
      label: "Campus",
      renderType: "text",
      textValue: "Global, Pullman",
      listValue: [],
      links: [],
      isEmpty: false,
      hideWhenEmpty: false,
    };
    const row: ResolvedViewRow = {
      id: 1,
      fields: [campusField],
      fieldMap: { [campusKey]: campusField },
    };
    expect(resolvedRowCampusBadgeLabels(row, campusKey)).toEqual(["Global", "Pullman"]);
  });

  it("campusTokensFromResolvedField matches listValue and text splitting", () => {
    expect(
      campusTokensFromResolvedField({
        key: "c",
        label: "C",
        renderType: "badge",
        textValue: "a, b",
        listValue: ["Global", "Pullman"],
        links: [],
        isEmpty: false,
        hideWhenEmpty: false,
      }),
    ).toEqual(["Global", "Pullman"]);
    expect(
      campusTokensFromResolvedField({
        key: "c",
        label: "C",
        renderType: "text",
        textValue: "Spokane; Vancouver",
        listValue: [],
        links: [],
        isEmpty: false,
        hideWhenEmpty: false,
      }),
    ).toEqual(["Spokane", "Vancouver"]);
  });

  it("normalizeCampusDisplay maps Global, blank, and whitespace-only", () => {
    expect(normalizeCampusDisplay("")).toBe("Unspecified");
    expect(normalizeCampusDisplay("   ")).toBe("Unspecified");
    expect(normalizeCampusDisplay("global")).toBe("Global");
    expect(normalizeCampusDisplay("Global Campus")).toBe("Global");
    expect(normalizeCampusDisplay("Unknown College")).toBe("Unknown College");
  });

  it("suppressMergedRowCampusBadgesWhenSectionStripShows respects headers and strip toggles", () => {
    const grouped = {
      campusGroupingMode: "grouped" as const,
      programGroupFieldKey: "p",
      campusFieldKey: "c",
    };
    expect(suppressMergedRowCampusBadgesWhenSectionStripShows(undefined)).toBe(false);
    expect(suppressMergedRowCampusBadgesWhenSectionStripShows(grouped)).toBe(true);
    expect(
      suppressMergedRowCampusBadgesWhenSectionStripShows({ ...grouped, showProgramSectionHeaders: false }),
    ).toBe(false);
    expect(
      suppressMergedRowCampusBadgesWhenSectionStripShows({ ...grouped, showCampusStripOnProgramSections: false }),
    ).toBe(false);
  });

  it("indexLetterFromLabel uses # for digits and non-ASCII letters", () => {
    expect(indexLetterFromLabel("École")).toBe("#");
    expect(indexLetterFromLabel("123 Program")).toBe("#");
    expect(indexLetterFromLabel("Anthro")).toBe("A");
  });

  it("groups rows by program and unions campuses", () => {
    const rows = [
      makeRow(1, "Anthropology", "Pullman"),
      makeRow(2, "Anthropology", "Vancouver"),
      makeRow(3, "Biology", "Pullman"),
    ];
    const groups = groupResolvedRows(rows, "program_name", "grad_campus");
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Anthropology");
    expect(groups[0].id).toBe("anthropology");
    expect(groups[0].campuses).toEqual(["Pullman", "Vancouver"]);
    expect(groups[0].rows.map((r) => r.id)).toEqual([1, 2]);
    expect(groups[1].label).toBe("Biology");
    expect(groups[1].campuses).toEqual(["Pullman"]);
  });

  it("groupResolvedRows expands multi-campus on one row (comma in text or badge listValue)", () => {
    const programKey = "program_name";
    const campusKey = "grad_campus";
    const dualCampus: ResolvedViewRow = {
      id: 1,
      fields: [],
      fieldMap: {
        [programKey]: {
          key: programKey,
          label: "Program",
          renderType: "text",
          textValue: "Anthropology",
          listValue: [],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
        [campusKey]: {
          key: campusKey,
          label: "Campus",
          renderType: "badge",
          textValue: "Global, Pullman",
          listValue: ["Global", "Pullman"],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
      },
    };
    const groups = groupResolvedRows([dualCampus], programKey, campusKey);
    expect(groups[0].campuses).toEqual(["Global", "Pullman"]);
  });

  it("merges programs that differ only by whitespace/case in key", () => {
    const rows = [makeRow(1, "Computer Science", "Pullman"), makeRow(2, "computer science ", "Vancouver")];
    const groups = groupResolvedRows(rows, "program_name", "grad_campus");
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(2);
  });

  it("isCampusGroupingActive requires mode grouped and both keys", () => {
    expect(isCampusGroupingActive(undefined)).toBe(false);
    expect(isCampusGroupingActive({ campusFieldKey: "a", programGroupFieldKey: "b" })).toBe(false);
    expect(
      isCampusGroupingActive({
        campusGroupingMode: "grouped",
        campusFieldKey: "grad_campus",
        programGroupFieldKey: "program_name",
      }),
    ).toBe(true);
  });

  it("uses no-program id when program field is blank", () => {
    const rows = [makeRow(1, "", "Pullman"), makeRow(2, "  ", "Spokane")];
    const groups = groupResolvedRows(rows, "program_name", "grad_campus");
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("no-program");
    expect(groups[0].label).toBe("—");
  });

  it("assigns unique ids when distinct program labels slugify the same", () => {
    const rows = [makeRow(1, "AI & ML", "Pullman"), makeRow(2, "AI/ML", "Vancouver")];
    const groups = groupResolvedRows(rows, "program_name", "grad_campus");
    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("ai-ml");
    expect(groups[1].id).toBe("ai-ml-2");
  });

  it("narrowProgramGroupsToFilteredRows preserves full-campus metadata while trimming rows", () => {
    const rows = [
      makeRow(1, "Anthropology", "Pullman"),
      makeRow(2, "Anthropology", "Vancouver"),
    ];
    const full = groupResolvedRows(rows, "program_name", "grad_campus");
    expect(full[0].campuses).toEqual(["Pullman", "Vancouver"]);
    const narrowed = narrowProgramGroupsToFilteredRows(full, [rows[1]!]);
    expect(narrowed).toHaveLength(1);
    expect(narrowed[0].campuses).toEqual(["Pullman", "Vancouver"]);
    expect(narrowed[0].rows.map((r) => r.id)).toEqual([2]);
  });
});
