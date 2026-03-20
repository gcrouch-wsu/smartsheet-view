import { describe, expect, it } from "vitest";
import {
  parseMultiPersonValue,
  parseMultiPersonRow,
  serializeContactDisplayToObjectValue,
  serializeMultiPersonToCells,
  validateContributorPicklistCells,
  type MultiPersonEntry,
} from "@/lib/contributor-utils";
import type { EditableFieldGroup, ResolvedViewRow, SmartsheetColumn } from "@/lib/config/types";

describe("serializeContactDisplayToObjectValue", () => {
  it("returns null for empty CONTACT_LIST so callers send value clear", () => {
    expect(serializeContactDisplayToObjectValue("", "CONTACT_LIST", "email")).toBeNull();
    expect(serializeContactDisplayToObjectValue("  , ;  ", "CONTACT_LIST", "name")).toBeNull();
  });

  it("returns empty MULTI_CONTACT for empty MULTI_CONTACT_LIST", () => {
    expect(serializeContactDisplayToObjectValue("", "MULTI_CONTACT_LIST", "email")).toEqual({
      objectType: "MULTI_CONTACT",
      values: [],
    });
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

describe("parseMultiPersonValue", () => {
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
});
