import { describe, expect, it } from "vitest";
import { parseMultiPersonRow, type MultiPersonEntry } from "@/lib/contributor-utils";
import type { EditableFieldGroup, ResolvedViewRow } from "@/lib/config/types";

describe("legacy multi-person delimiter parsing (known limitations)", () => {
  it.skip("commas inside names break index pairing — use numbered slot role groups instead", () => {
    const row: ResolvedViewRow = {
      id: 1,
      fields: [],
      fieldMap: {
        names: {
          key: "names",
          label: "Names",
          renderType: "text",
          textValue: "Doe, Jane; Smith, Bob",
          listValue: ["Doe, Jane; Smith, Bob"],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
        emails: {
          key: "emails",
          label: "Emails",
          renderType: "mailto_list",
          textValue: "jane@wsu.edu, bob@wsu.edu",
          listValue: ["jane@wsu.edu", "bob@wsu.edu"],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
      },
    };

    const group: EditableFieldGroup = {
      id: "coordinators",
      label: "Coordinators",
      attributes: [
        { attribute: "name", fieldKey: "names", columnId: 101 },
        { attribute: "email", fieldKey: "emails", columnId: 102 },
      ],
    };

    const persons = parseMultiPersonRow(row, group);

    expect(persons.length).toBe(2);
    expect(persons[0]?.name).toBe("Doe, Jane");
    expect(persons[1]?.name).toBe("Smith, Bob");
  });
});

describe("parseMultiPersonRow with numbered role groups (fromRoleGroupViewFieldKey)", () => {
  it("reads people from resolved people_group field", () => {
    const row: ResolvedViewRow = {
      id: 1,
      fields: [],
      fieldMap: {
        staff: {
          key: "staff",
          label: "Staff",
          renderType: "people_group",
          textValue: "A\n\nB",
          listValue: [],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
          people: [
            { slot: "1", name: "Alice", email: "a@wsu.edu", isEmpty: false },
            { slot: "2", name: "Bob", email: "b@wsu.edu", isEmpty: false },
          ],
        },
      },
    };
    const group: EditableFieldGroup = {
      id: "x",
      label: "Staff",
      fromRoleGroupViewFieldKey: "staff",
      usesFixedSlots: true,
      attributes: [
        { attribute: "name", fieldKey: "staff", columnId: 1, slot: "1" },
        { attribute: "email", fieldKey: "staff", columnId: 2, slot: "1" },
      ],
    };
    const persons = parseMultiPersonRow(row, group);
    expect(persons).toHaveLength(2);
    expect(persons[0]).toMatchObject({ name: "Alice", email: "a@wsu.edu" });
    expect(persons[1]).toMatchObject({ name: "Bob", email: "b@wsu.edu" });
  });
});
