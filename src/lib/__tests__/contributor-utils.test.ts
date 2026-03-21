import { describe, expect, it } from "vitest";
import {
  hasMultiPersonValidationErrors,
  parseMultiPersonValue,
  parseMultiPersonRow,
  serializeContactDisplayToObjectValue,
  serializeMultiPersonToCells,
  validateContributorPicklistCells,
  validateMultiPersonGroupsForSave,
  type MultiPersonEntry,
} from "@/lib/contributor-utils";
import type { EditableFieldGroup, ResolvedViewRow, SmartsheetColumn } from "@/lib/config/types";

describe("serializeContactDisplayToObjectValue", () => {
  it("returns null for empty CONTACT_LIST so callers send value clear", () => {
    expect(serializeContactDisplayToObjectValue("", "CONTACT_LIST", "email")).toBeNull();
    expect(serializeContactDisplayToObjectValue("  , ;  ", "CONTACT_LIST", "name")).toBeNull();
  });

  it("returns null for empty MULTI_CONTACT_LIST so callers send value clear (error 1012 rejects empty values array)", () => {
    expect(serializeContactDisplayToObjectValue("", "MULTI_CONTACT_LIST", "email")).toBeNull();
    expect(serializeContactDisplayToObjectValue("  , ;  ", "MULTI_CONTACT_LIST", "name")).toBeNull();
  });

  it("serializes single contact", () => {
    expect(serializeContactDisplayToObjectValue("a@b.com", "CONTACT_LIST", "email")).toEqual({
      objectType: "CONTACT",
      email: "a@b.com",
    });
    expect(serializeContactDisplayToObjectValue("Pat", "CONTACT_LIST", "name")).toEqual({
      objectType: "CONTACT",
      name: "Pat",
    });
  });
});

describe("validateContributorPicklistCells", () => {
  function col(partial: { id: number; title: string; type: string; options?: string[] }): SmartsheetColumn {
    return {
      id: partial.id,
      index: 0,
      title: partial.title,
      type: partial.type,
      options: partial.options,
    };
  }

  it("allows empty value and skips columns without options", () => {
    const map = new Map<number, SmartsheetColumn>([
      [1, col({ id: 1, title: "Status", type: "PICKLIST", options: ["A", "B"] })],
    ]);
    expect(validateContributorPicklistCells([{ columnId: 1, value: "" }], map)).toEqual({ ok: true });
    const noOpts = new Map([[2, col({ id: 2, title: "Free", type: "PICKLIST", options: [] })]]);
    expect(validateContributorPicklistCells([{ columnId: 2, value: "anything" }], noOpts)).toEqual({ ok: true });
  });

  it("rejects value not in options", () => {
    const map = new Map([[1, col({ id: 1, title: "Status", type: "PICKLIST", options: ["A", "B"] })]]);
    const r = validateContributorPicklistCells([{ columnId: 1, value: "Z" }], map);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("Z");
      expect(r.error).toContain("Status");
    }
  });

  it("rejects objectValue on picklist", () => {
    const map = new Map([[1, col({ id: 1, title: "Status", type: "PICKLIST", options: ["A"] })]]);
    expect(validateContributorPicklistCells([{ columnId: 1, value: "A", objectValue: {} }], map)).toEqual({
      ok: false,
      error: "Picklist fields must send a plain value, not objectValue.",
    });
  });

  it("ignores non-picklist columns", () => {
    const map = new Map([[9, col({ id: 9, title: "Note", type: "TEXT_NUMBER" })]]);
    expect(validateContributorPicklistCells([{ columnId: 9, value: "x" }], map)).toEqual({ ok: true });
  });
});

describe("validateMultiPersonGroupsForSave", () => {
  const group: EditableFieldGroup = {
    id: "g1",
    label: "Coordinators",
    attributes: [
      { attribute: "name", fieldKey: "n", columnId: 1 },
      { attribute: "email", fieldKey: "e", columnId: 2 },
    ],
  };

  it("allows empty group", () => {
    const v = validateMultiPersonGroupsForSave([group], { g1: [] });
    expect(hasMultiPersonValidationErrors(v)).toBe(false);
  });

  it("requires name and email when both attributes exist", () => {
    const v = validateMultiPersonGroupsForSave([group], {
      g1: [{ name: "", email: "a@b.com", phone: "" }],
    });
    expect(v.g1?.[0]?.name).toBeDefined();
    const v2 = validateMultiPersonGroupsForSave([group], {
      g1: [{ name: "Ada", email: "", phone: "" }],
    });
    expect(v2.g1?.[0]?.email).toBeDefined();
  });

  it("passes when name and email filled", () => {
    const v = validateMultiPersonGroupsForSave([group], {
      g1: [{ name: "Ada", email: "a@b.com", phone: "" }],
    });
    expect(hasMultiPersonValidationErrors(v)).toBe(false);
  });
});

describe("parseMultiPersonValue", () => {
  it("splits on newlines (stacked list display)", () => {
    expect(parseMultiPersonValue("test\ntest2")).toEqual(["test", "test2"]);
    expect(parseMultiPersonValue("a\r\nb")).toEqual(["a", "b"]);
  });

  it("splits by comma", () => {
    expect(parseMultiPersonValue("lisa lujan, deb marsh")).toEqual(["lisa lujan", "deb marsh"]);
  });

  it("splits by semicolon", () => {
    expect(parseMultiPersonValue("lisa lujan; deb marsh")).toEqual(["lisa lujan", "deb marsh"]);
  });

  it("handles mixed delimiters", () => {
    expect(parseMultiPersonValue("a, b; c")).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace", () => {
    expect(parseMultiPersonValue("  alice  ,  bob  ")).toEqual(["alice", "bob"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseMultiPersonValue("")).toEqual([]);
    expect(parseMultiPersonValue(null)).toEqual([]);
    expect(parseMultiPersonValue(undefined)).toEqual([]);
  });
});

describe("parseMultiPersonRow", () => {
  function makeRow(fieldMap: Record<string, { textValue: string }>): ResolvedViewRow {
    return {
      id: 1,
      fields: [],
      fieldMap: Object.fromEntries(
        Object.entries(fieldMap).map(([key, v]) => [
          key,
          {
            key,
            label: key,
            renderType: "text" as const,
            textValue: v.textValue,
            listValue: [],
            links: [],
            isEmpty: !v.textValue,
            hideWhenEmpty: false,
          },
        ]),
      ),
    };
  }

  it("parses parallel columns into person entries", () => {
    const row = makeRow({
      coordinator: { textValue: "lisa lujan, deb marsh" },
      coordinator_email: { textValue: "llujan@wsu.edu, marshdj@wsu.edu" },
    });
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        { attribute: "name", fieldKey: "coordinator", columnId: 101 },
        { attribute: "email", fieldKey: "coordinator_email", columnId: 102 },
      ],
    };
    const result = parseMultiPersonRow(row, group);
    expect(result).toEqual([
      { name: "lisa lujan", email: "llujan@wsu.edu", phone: "" },
      { name: "deb marsh", email: "marshdj@wsu.edu", phone: "" },
    ]);
  });

  it("returns no persons when all values empty so the role can stay cleared", () => {
    const row = makeRow({
      coordinator: { textValue: "" },
      coordinator_email: { textValue: "" },
    });
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        { attribute: "name", fieldKey: "coordinator", columnId: 101 },
        { attribute: "email", fieldKey: "coordinator_email", columnId: 102 },
      ],
    };
    const result = parseMultiPersonRow(row, group);
    expect(result).toEqual([]);
  });

  it("aligns names and emails when values are newline-separated (stacked list)", () => {
    const row: ResolvedViewRow = {
      id: 1,
      fields: [],
      fieldMap: {
        c: {
          key: "c",
          label: "c",
          renderType: "text",
          textValue: "test\ntest2",
          listValue: [],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
        e: {
          key: "e",
          label: "e",
          renderType: "text",
          textValue: "a@x.com\nb@y.com",
          listValue: [],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
      },
    };
    const group: EditableFieldGroup = {
      id: "g",
      label: "G",
      attributes: [
        { attribute: "name", fieldKey: "c", columnId: 1 },
        { attribute: "email", fieldKey: "e", columnId: 2 },
      ],
    };
    expect(parseMultiPersonRow(row, group)).toEqual([
      { name: "test", email: "a@x.com", phone: "" },
      { name: "test2", email: "b@y.com", phone: "" },
    ]);
  });

  it("prefers listValue for each column when present", () => {
    const row: ResolvedViewRow = {
      id: 1,
      fields: [],
      fieldMap: {
        c: {
          key: "c",
          label: "c",
          renderType: "text",
          textValue: "joined-wrong",
          listValue: ["test", "test2"],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
        e: {
          key: "e",
          label: "e",
          renderType: "text",
          textValue: "joined-wrong",
          listValue: ["a@x.com", "b@y.com"],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
      },
    };
    const group: EditableFieldGroup = {
      id: "g",
      label: "G",
      attributes: [
        { attribute: "name", fieldKey: "c", columnId: 1 },
        { attribute: "email", fieldKey: "e", columnId: 2 },
      ],
    };
    expect(parseMultiPersonRow(row, group)).toEqual([
      { name: "test", email: "a@x.com", phone: "" },
      { name: "test2", email: "b@y.com", phone: "" },
    ]);
  });
});

describe("serializeMultiPersonToCells", () => {
  it("joins with comma and space", () => {
    const persons: MultiPersonEntry[] = [
      { name: "lisa lujan", email: "llujan@wsu.edu", phone: "" },
      { name: "deb marsh", email: "marshdj@wsu.edu", phone: "" },
    ];
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        { attribute: "name", fieldKey: "coordinator", columnId: 101 },
        { attribute: "email", fieldKey: "coordinator_email", columnId: 102 },
      ],
    };
    const result = serializeMultiPersonToCells(persons, group);
    expect(result).toEqual([
      { columnId: 101, value: "lisa lujan, deb marsh" },
      { columnId: 102, value: "llujan@wsu.edu, marshdj@wsu.edu" },
    ]);
  });

  it("round-trips with parseMultiPersonRow", () => {
    const original = "lisa lujan, deb marsh";
    const parsed = parseMultiPersonValue(original);
    const persons: MultiPersonEntry[] = parsed.map((name) => ({ name, email: "", phone: "" }));
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [{ attribute: "name", fieldKey: "coordinator", columnId: 101 }],
    };
    const cells = serializeMultiPersonToCells(persons, group);
    expect(cells[0]?.value).toBe("lisa lujan, deb marsh");
  });

  it("clears all columns when persons list is empty", () => {
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        { attribute: "name", fieldKey: "coordinator", columnId: 101 },
        { attribute: "email", fieldKey: "coordinator_email", columnId: 102 },
      ],
    };
    const result = serializeMultiPersonToCells([], group);
    expect(result).toEqual([
      { columnId: 101, value: "" },
      { columnId: 102, value: "" },
    ]);
  });

  it("drops blank person slots when serializing contacts", () => {
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        { attribute: "name", fieldKey: "coordinator", columnId: 101 },
        { attribute: "email", fieldKey: "coordinator_email", columnId: 102, columnType: "CONTACT_LIST" },
      ],
    };
    const persons: MultiPersonEntry[] = [
      { name: "", email: "", phone: "" },
      { name: "Ada", email: "ada@wsu.edu", phone: "" },
    ];
    const result = serializeMultiPersonToCells(persons, group);
    expect(result).toEqual([
      { columnId: 102, objectValue: { objectType: "CONTACT", email: "ada@wsu.edu" } },
      { columnId: 101, value: "Ada" },
    ]);
  });

  it("clears CONTACT_LIST with value when no contacts remain", () => {
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Lead",
      attributes: [{ attribute: "email", fieldKey: "lead_email", columnId: 102, columnType: "CONTACT_LIST" }],
    };
    expect(serializeMultiPersonToCells([], group)).toEqual([{ columnId: 102, value: "" }]);
  });

  it("clears MULTI_CONTACT_LIST with value empty string when no contacts remain (error 1012 rejects empty values array)", () => {
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        {
          attribute: "email",
          fieldKey: "coord_email",
          columnId: 201,
          columnType: "MULTI_CONTACT_LIST",
        },
      ],
    };
    expect(serializeMultiPersonToCells([], group)).toEqual([
      { columnId: 201, value: "" },
    ]);
  });

  it("serializes MULTI_CONTACT_LIST with contacts as objectValue values array", () => {
    const group: EditableFieldGroup = {
      id: "g1",
      label: "Coordinators",
      attributes: [
        {
          attribute: "email",
          fieldKey: "coord_email",
          columnId: 201,
          columnType: "MULTI_CONTACT_LIST",
        },
      ],
    };
    const persons: MultiPersonEntry[] = [
      { name: "", email: "alice@wsu.edu", phone: "" },
      { name: "", email: "bob@wsu.edu", phone: "" },
    ];
    expect(serializeMultiPersonToCells(persons, group)).toEqual([
      {
        columnId: 201,
        objectValue: {
          objectType: "MULTI_CONTACT",
          values: [
            { objectType: "CONTACT", email: "alice@wsu.edu" },
            { objectType: "CONTACT", email: "bob@wsu.edu" },
          ],
        },
      },
    ]);
  });
});
