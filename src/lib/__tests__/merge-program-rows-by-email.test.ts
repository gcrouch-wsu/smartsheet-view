import { describe, expect, it } from "vitest";
import {
  combinedEmailSignatureFromPeopleFields,
  emailSignatureFromPeopleField,
  mergeResolvedRowsByProgramAndEmail,
  resolveMergePeopleFieldKey,
  resolveMergePeopleFieldKeys,
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

function badgeCampusField(key: string, values: string[]): ResolvedFieldValue {
  return {
    key,
    label: "Campus",
    renderType: "badge",
    textValue: values.join(", "),
    listValue: values,
    links: [],
    isEmpty: values.length === 0,
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

function rowWithBadgeCampus(
  id: number,
  program: string,
  campuses: string[],
  peopleKey: string,
  emails: string[],
): ResolvedViewRow {
  const prog = textField("program_name", program);
  const camp = badgeCampusField("campus", campuses);
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

  it("merge unions each MULTI_PICKLIST-style campus listValue, not one comma-joined label", () => {
    const rows = [
      rowWithBadgeCampus(1, "Biology", ["Global", "Pullman"], "staff", ["alice@wsu.edu"]),
      rowWithBadgeCampus(2, "Biology", ["Spokane"], "staff", ["alice@wsu.edu"]),
    ];
    const out = mergeResolvedRowsByProgramAndEmail(viewBase, rows);
    expect(out).toHaveLength(1);
    const merged = out[0];
    expect(merged?.mergedCampuses?.sort()).toEqual(["Global", "Pullman", "Spokane"]);
    expect(merged?.fieldMap.campus?.listValue.slice().sort()).toEqual(["Global", "Pullman", "Spokane"]);
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

  it("merges by same program and campus when mergeProgramRowsByProgramAndCampus is set", () => {
    const view: ViewConfig = {
      ...viewBase,
      presentation: {
        programGroupFieldKey: "program_name",
        campusFieldKey: "campus",
        mergeProgramRowsByProgramAndCampus: true,
        mergeProgramRowsBySharedEmail: undefined,
        mergePeopleFieldKey: undefined,
      },
    };
    const rows = [
      row(1, "Biology", "Pullman", "staff", ["a@x.edu"]),
      row(2, "Biology", "Pullman", "staff", ["b@x.edu"]),
      row(3, "Chem", "Spokane", "staff", ["c@x.edu"]),
    ];
    const out = mergeResolvedRowsByProgramAndEmail(view, rows);
    expect(out).toHaveLength(2);
    const bio = out.find((r) => r.fieldMap.program_name?.textValue === "Biology");
    expect(bio?.mergedSourceRowIds?.sort()).toEqual([1, 2]);
    expect(bio?.mergedCampuses).toEqual(["Pullman"]);
  });

  it("does not merge campus mode when campus values differ", () => {
    const view: ViewConfig = {
      ...viewBase,
      presentation: {
        programGroupFieldKey: "program_name",
        campusFieldKey: "campus",
        mergeProgramRowsByProgramAndCampus: true,
        mergeProgramRowsBySharedEmail: undefined,
      },
    };
    const rows = [
      row(1, "Biology", "Pullman", "staff", ["a@x.edu"]),
      row(2, "Biology", "Spokane", "staff", ["a@x.edu"]),
    ];
    expect(mergeResolvedRowsByProgramAndEmail(view, rows)).toHaveLength(2);
  });

  it("merges when matching emails come from two different selected people fields", () => {
    const dualStaffView: ViewConfig = {
      ...viewBase,
      presentation: {
        ...viewBase.presentation!,
        mergePeopleFieldKeys: ["staff", "secondary"],
        mergePeopleFieldKey: undefined,
      },
      fields: [
        ...(viewBase.fields ?? []),
        {
          key: "secondary",
          label: "Secondary",
          source: { columnTitle: "S2" },
          render: { type: "people_group" },
        },
      ],
    };
    const r1Fields = [
      textField("program_name", "Biology"),
      textField("campus", "Pullman"),
      peopleField("staff", []),
      peopleField("secondary", ["alice@wsu.edu"]),
    ];
    const r2Fields = [
      textField("program_name", "Biology"),
      textField("campus", "Spokane"),
      peopleField("staff", []),
      peopleField("secondary", ["alice@wsu.edu"]),
    ];
    const r1: ResolvedViewRow = { id: 1, fields: r1Fields, fieldMap: Object.fromEntries(r1Fields.map((f) => [f.key, f])) };
    const r2: ResolvedViewRow = { id: 2, fields: r2Fields, fieldMap: Object.fromEntries(r2Fields.map((f) => [f.key, f])) };
    const out = mergeResolvedRowsByProgramAndEmail(dualStaffView, [r1, r2]);
    expect(out).toHaveLength(1);
    expect(out[0]?.mergedSourceRowIds?.sort()).toEqual([1, 2]);
  });
});

describe("emailSignatureFromPeopleField", () => {
  it("sorts and joins emails", () => {
    const f = peopleField("s", ["z@x.edu", "a@x.edu"]);
    expect(emailSignatureFromPeopleField(f)).toBe("a@x.edu|z@x.edu");
  });
});

describe("combinedEmailSignatureFromPeopleFields", () => {
  it("unions emails across keys", () => {
    const fields = [
      textField("program_name", "Bio"),
      textField("campus", "P"),
      peopleField("staff", ["z@x.edu"]),
      peopleField("other", ["a@x.edu"]),
    ];
    const r: ResolvedViewRow = { id: 1, fields, fieldMap: Object.fromEntries(fields.map((f) => [f.key, f])) };
    expect(combinedEmailSignatureFromPeopleFields(r, ["staff", "other"])).toBe("a@x.edu|z@x.edu");
  });
});

describe("resolveMergePeopleFieldKeys", () => {
  it("returns mergePeopleFieldKeys when set", () => {
    const keys = resolveMergePeopleFieldKeys({
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
        mergePeopleFieldKeys: ["staff"],
      },
      fields: [
        { key: "program_name", label: "P", source: {}, render: { type: "text" } },
        { key: "campus", label: "C", source: {}, render: { type: "text" } },
        { key: "staff", label: "S", source: {}, render: { type: "people_group" } },
      ],
    });
    expect(keys).toEqual(["staff"]);
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
