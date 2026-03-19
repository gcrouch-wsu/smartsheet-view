import { describe, expect, it } from "vitest";
import {
  parseMultiPersonValue,
  parseMultiPersonRow,
  serializeMultiPersonToCells,
  type MultiPersonEntry,
} from "@/lib/contributor-utils";
import type { EditableFieldGroup, ResolvedViewRow } from "@/lib/config/types";

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

  it("returns one empty person when all values empty", () => {
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
    expect(result).toEqual([{ name: "", email: "", phone: "" }]);
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
});
