import { describe, expect, it } from "vitest";
import {
  emailSignatureFromPeopleField,
  mergeResolvedRowsByProgramAndEmail,
  resolveMergePeopleFieldKey,
} from "@/lib/merge-program-rows-by-email";
import type { ResolvedFieldValue, ResolvedViewRow, ViewConfig } from "@/lib/config/types";

function peopleField(key: string, emails: string[]): ResolvedFieldValue {
  return {
    key,
    label: "Staff",
    renderType: "people_group",
    textValue: "",
    listValue: [],
    links: [],
    isEmpty: emails.length === 0,
    hideWhenEmpty: false,
    people: emails.map((email, i) => ({
      slot: String(i + 1),
      name: `Person ${i}`,
      email,
      isEmpty: false,
    })),
  };
}

function textField(key: string, value: string): ResolvedFieldValue {
  return {
    key,
    label: key,
    renderType: "text",
    textValue: value,
    listValue: value ? [value] : [],
    links: [],
    isEmpty: !value,
    hideWhenEmpty: false,
  };
}

function row(
  id: number,
  program: string,
  campus: string,
  peopleKey: string,
  emails: string[],
): ResolvedViewRow {
  const prog = textField("program_name", program);
  const camp = textField("campus", campus);
  const ppl = peopleField(peopleKey, emails);
  const fields = [prog, camp, ppl];
  return { id, fields, fieldMap: Object.fromEntries(fields.map((f) => [f.key, f])) };
}

describe("mergeResolvedRowsByProgramAndEmail", () => {
  const viewBase: ViewConfig = {
    id: "v",
    slug: "s",
    label: "L",
    sourceId: "src",
    layout: "cards",
    public: true,
    presentation: {
      mergeProgramRowsBySharedEmail: true,
      programGroupFieldKey: "program_name",
      campusFieldKey: "campus",
      mergePeopleFieldKey: "staff",
    },
    fields: [
      {
        key: "program_name",
        label: "Program",
        source: { columnTitle: "P" },
        render: { type: "text" },
      },
      {
        key: "campus",
        label: "Campus",
        source: { columnTitle: "C" },
        render: { type: "text" },
      },
      {
        key: "staff",
        label: "Staff",
        source: { columnTitle: "S" },
        render: { type: "people_group" },
      },
    ],
  };

  it("merges two rows with same program and same email across campuses", () => {
    const rows = [
      row(1, "Biology", "Pullman", "staff", ["alice@wsu.edu"]),
      row(2, "Biology", "Spokane", "staff", ["alice@wsu.edu"]),
      row(3, "Chem", "Pullman", "staff", ["bob@wsu.edu"]),
    ];
    const out = mergeResolvedRowsByProgramAndEmail(viewBase, rows);
    expect(out).toHaveLength(2);
    const bio = out.find((r) => r.fieldMap.program_name?.textValue === "Biology");
    expect(bio?.mergedSourceRowIds).toEqual([1, 2]);
    expect(bio?.mergedCampuses?.sort()).toEqual(["Pullman", "Spokane"]);
    expect(bio?.fieldMap.campus?.textValue).toContain("Pullman");
    expect(bio?.fieldMap.campus?.textValue).toContain("Spokane");
  });

  it("does not merge when emails differ", () => {
    const rows = [
      row(1, "Biology", "Pullman", "staff", ["a@x.edu"]),
      row(2, "Biology", "Spokane", "staff", ["b@x.edu"]),
    ];
    const out = mergeResolvedRowsByProgramAndEmail(viewBase, rows);
    expect(out).toHaveLength(2);
    expect(out.every((r) => !r.mergedSourceRowIds?.length)).toBe(true);
  });

  it("no-ops when flag off", () => {
    const view = { ...viewBase, presentation: { ...viewBase.presentation, mergeProgramRowsBySharedEmail: undefined } };
    const rows = [
      row(1, "Biology", "Pullman", "staff", ["a@x.edu"]),
      row(2, "Biology", "Spokane", "staff", ["a@x.edu"]),
    ];
    expect(mergeResolvedRowsByProgramAndEmail(view, rows)).toHaveLength(2);
  });
});

describe("emailSignatureFromPeopleField", () => {
  it("sorts and joins emails", () => {
    const f = peopleField("s", ["z@x.edu", "a@x.edu"]);
    expect(emailSignatureFromPeopleField(f)).toBe("a@x.edu|z@x.edu");
  });
});

describe("resolveMergePeopleFieldKey", () => {
  it("uses sole people_group when unspecified", () => {
    const k = resolveMergePeopleFieldKey({
      ...({
        id: "v",
        slug: "s",
        label: "L",
        sourceId: "x",
        layout: "table",
        public: true,
        fields: [
          { key: "a", label: "A", source: {}, render: { type: "people_group" } },
          { key: "b", label: "B", source: {}, render: { type: "text" } },
        ],
      } as ViewConfig),
    });
    expect(k).toBe("a");
  });
});
