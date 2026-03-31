import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldValue } from "@/components/public/FieldValue";
import type { ResolvedFieldValue } from "@/lib/config/types";

function buildPeopleField(overrides?: Partial<ResolvedFieldValue>): ResolvedFieldValue {
  return {
    key: "staff",
    label: "Staff Graduate Program Coordinator",
    renderType: "people_group",
    textValue: "Lisa Lujan\nllujan@wsu.edu",
    listValue: ["Lisa Lujan\nllujan@wsu.edu"],
    links: [{ label: "llujan@wsu.edu", href: "mailto:llujan@wsu.edu" }],
    isEmpty: false,
    hideWhenEmpty: false,
    people: [
      {
        slot: "1",
        name: "Lisa Lujan",
        email: "llujan@wsu.edu",
        phone: "(509) 335-9542",
        isEmpty: false,
      },
      {
        slot: "2",
        name: "Deb Marsh",
        email: "marshdj@wsu.edu",
        isEmpty: false,
      },
    ],
    roleGroupReadOnly: false,
    listDisplay: "inline",
    peopleStyle: "plain",
    ...overrides,
  };
}

describe("FieldValue people_group", () => {
  it("renders grouped people inline by default", () => {
    const html = renderToStaticMarkup(<FieldValue field={buildPeopleField({ listDisplay: undefined })} />);

    expect(html).toContain("flex flex-wrap gap-x-6 gap-y-2");
    expect(html).toContain("view-people-name");
    expect(html).not.toContain("rounded-2xl border");
    expect(html).not.toContain("space-y-3");
  });

  it("supports the stacked mode when explicitly requested", () => {
    const html = renderToStaticMarkup(<FieldValue field={buildPeopleField({ listDisplay: "stacked" })} />);

    expect(html).toContain("space-y-2");
    expect(html).not.toContain("flex flex-wrap gap-x-6 gap-y-2");
  });

  it("supports capsule styling when requested", () => {
    const html = renderToStaticMarkup(<FieldValue field={buildPeopleField({ peopleStyle: "capsule" })} />);

    expect(html).toContain("rounded-2xl border");
  });
});
