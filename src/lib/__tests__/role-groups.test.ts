import { describe, expect, it } from "vitest";
import {
  detectNumberedRoleGroupsFromColumns,
  isUnsafeDelimitedRoleGroup,
  parseNumberedRoleColumnTitle,
  parseRoleGroupDelimiterInput,
  roleGroupDelimitersToInputString,
} from "@/lib/role-groups";
import type { SmartsheetColumn } from "@/lib/config/types";

describe("parseNumberedRoleColumnTitle", () => {
  it("parses explicit Name / Email / Phone Number suffixes", () => {
    expect(parseNumberedRoleColumnTitle("Department Chair or School Director Name 1")).toEqual({
      baseLabel: "Department Chair or School Director",
      slot: "1",
      attr: "name",
    });
    expect(parseNumberedRoleColumnTitle("Staff Graduate Program Coordinator Email 2")).toEqual({
      baseLabel: "Staff Graduate Program Coordinator",
      slot: "2",
      attr: "email",
    });
    expect(parseNumberedRoleColumnTitle("Staff Graduate Program Coordinator Phone Number 3")).toEqual({
      baseLabel: "Staff Graduate Program Coordinator",
      slot: "3",
      attr: "phone",
    });
  });

  it("treats bare role label + slot as name attribute", () => {
    expect(parseNumberedRoleColumnTitle("Faculty Graduate Program Coordinator or Designee 1")).toEqual({
      baseLabel: "Faculty Graduate Program Coordinator or Designee",
      slot: "1",
      attr: "name",
    });
  });

  it("parses trailing Campus with slot number", () => {
    expect(parseNumberedRoleColumnTitle("Staff Grad Prog Coord or Designee 1 Campus")).toEqual({
      baseLabel: "Staff Grad Prog Coord or Designee",
      slot: "1",
      attr: "campus",
    });
  });
});

describe("detectNumberedRoleGroupsFromColumns", () => {
  it("clusters mixed bare names and suffixed attributes", () => {
    const columns: SmartsheetColumn[] = [
      { id: 1, index: 0, title: "Faculty Graduate Program Coordinator or Designee 1", type: "TEXT_NUMBER" },
      { id: 2, index: 1, title: "Faculty Graduate Program Coordinator Email 1", type: "TEXT_NUMBER" },
      { id: 3, index: 2, title: "Faculty Graduate Program Coordinator or Designee 2", type: "TEXT_NUMBER" },
      { id: 4, index: 3, title: "Faculty Graduate Program Coordinator Email 2", type: "TEXT_NUMBER" },
    ];
    const groups = detectNumberedRoleGroupsFromColumns(columns);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe("Faculty Graduate Program Coordinator or Designee");
    expect(groups[0]!.mode).toBe("numbered_slots");
    const slots = groups[0]!.slots ?? [];
    expect(slots).toHaveLength(2);
    expect(slots[0]!.slot).toBe("1");
    expect(slots[0]!.name?.columnId).toBe(1);
    expect(slots[0]!.email?.columnId).toBe(2);
    expect(slots[1]!.slot).toBe("2");
    expect(slots[1]!.name?.columnId).toBe(3);
    expect(slots[1]!.email?.columnId).toBe(4);
  });

  it("maps Designee N Campus columns into slot campus selectors", () => {
    const columns: SmartsheetColumn[] = [
      { id: 1, index: 0, title: "Role or Designee 1", type: "TEXT_NUMBER" },
      { id: 2, index: 1, title: "Role or Designee 1 Campus", type: "PICKLIST" },
    ];
    const groups = detectNumberedRoleGroupsFromColumns(columns);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.slots?.[0]?.name?.columnId).toBe(1);
    expect(groups[0]!.slots?.[0]?.campus?.columnId).toBe(2);
  });
});

describe("isUnsafeDelimitedRoleGroup", () => {
  it("keeps multi-attribute delimited groups unsafe by default", () => {
    expect(
      isUnsafeDelimitedRoleGroup({
        id: "legacy",
        label: "Legacy Coordinators",
        mode: "delimited_parallel",
        delimited: {
          name: { source: { columnId: 1, columnTitle: "Coordinator" } },
          email: { source: { columnId: 2, columnTitle: "Coordinator Email" } },
        },
      }),
    ).toBe(true);
  });

  it("allows explicit trusted pairing for aligned multi-attribute delimited groups", () => {
    expect(
      isUnsafeDelimitedRoleGroup({
        id: "legacy",
        label: "Legacy Coordinators",
        mode: "delimited_parallel",
        delimited: {
          name: { source: { columnId: 1, columnTitle: "Coordinator" } },
          email: { source: { columnId: 2, columnTitle: "Coordinator Email" } },
          trustPairing: true,
        },
      }),
    ).toBe(false);
  });
});

describe("parseRoleGroupDelimiterInput / roleGroupDelimitersToInputString", () => {
  it("accepts a single comma and pipe-separated lists", () => {
    expect(parseRoleGroupDelimiterInput(",")).toEqual([","]);
    expect(parseRoleGroupDelimiterInput(" , | \\n ")).toEqual([",", "\n"]);
    expect(parseRoleGroupDelimiterInput(",|;|\\n")).toEqual([",", ";", "\n"]);
  });

  it("maps \\n token to newline and \\| to pipe", () => {
    expect(parseRoleGroupDelimiterInput("\\n")).toEqual(["\n"]);
    expect(parseRoleGroupDelimiterInput("\\|")).toEqual(["|"]);
  });

  it("does not split inside an escaped pipe within a longer token", () => {
    expect(parseRoleGroupDelimiterInput("a\\|b|,|")).toEqual(["a|b", ","]);
  });

  it("round-trips through roleGroupDelimitersToInputString", () => {
    const input = [",", ";", "\n", "|"];
    expect(parseRoleGroupDelimiterInput(roleGroupDelimitersToInputString(input))).toEqual(input);
  });
});
