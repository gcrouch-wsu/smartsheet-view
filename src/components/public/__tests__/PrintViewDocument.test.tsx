import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintViewDocument } from "@/components/public/PrintViewDocument";
import type { ResolvedView } from "@/lib/config/types";

const view: ResolvedView = {
  id: "graduate-program-contact-list",
  label: "Graduate Program Contact List",
  layout: "stacked",
  rowCount: 1,
  fields: [
    { key: "program_name", label: "Program Name", renderType: "text" },
    { key: "staff", label: "Staff Graduate Program Coordinator", renderType: "people_group" },
  ],
  rows: [
    {
      id: 101,
      fields: [
        {
          key: "program_name",
          label: "Program Name",
          renderType: "text",
          textValue: "Athletic Training",
          listValue: ["Athletic Training"],
          links: [],
          isEmpty: false,
          hideWhenEmpty: false,
        },
        {
          key: "staff",
          label: "Staff Graduate Program Coordinator",
          renderType: "people_group",
          textValue: "Lisa Lujan\nllujan@wsu.edu",
          listValue: ["Lisa Lujan\nllujan@wsu.edu"],
          links: [{ label: "llujan@wsu.edu", href: "mailto:llujan@wsu.edu" }],
          isEmpty: false,
          hideWhenEmpty: false,
          listDisplay: "inline",
          people: [
            {
              slot: "1",
              name: "Lisa Lujan",
              email: "llujan@wsu.edu",
              isEmpty: false,
            },
          ],
        },
      ],
      fieldMap: {},
    },
  ],
};

view.rows[0]!.fieldMap = Object.fromEntries(view.rows[0]!.fields.map((field) => [field.key, field]));

describe("PrintViewDocument", () => {
  it("renders a printable table layout by default", () => {
    const html = renderToStaticMarkup(
      <PrintViewDocument
        slug="grad-programs"
        viewId={view.id}
        pageTitle="Graduate Programs"
        sourceLabel="Programs"
        sourceName="GRAD Programs"
        fetchedAt="2026-03-31T12:00:00.000Z"
        view={view}
      />,
    );

    expect(html).toContain("<table");
    expect(html).toContain("Program Name");
    expect(html).toContain("Staff Graduate Program Coordinator");
    expect(html).toContain("Athletic Training");
    expect(html).toContain("Lisa Lujan");
    expect(html).toContain("<caption>");
    expect(html).toContain('scope="row"');
    expect(html).toContain("print-cell-inner");
    expect(html).toContain("print-cell-inner--primary");
  });
});
