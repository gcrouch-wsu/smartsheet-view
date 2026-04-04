import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ContributorSingleFieldControl,
  ContributorGroupFieldControl,
  ContributorReadOnlyField,
} from "@/components/public/ContributorFieldControl";
import type { ResolvedFieldValue, EditableFieldGroup } from "@/lib/config/types";
import type { ContributorEditableFieldDefinition, MultiPersonEntry } from "@/lib/contributor-utils";

describe("ContributorSingleFieldControl", () => {
  const mockField: ResolvedFieldValue = {
    key: "test",
    label: "Test Label",
    renderType: "text",
    textValue: "Value",
    listValue: ["Value"],
    links: [],
    isEmpty: false,
    hideWhenEmpty: false,
  };

  const mockDef: ContributorEditableFieldDefinition = {
    columnId: 1,
    columnType: "TEXT_NUMBER",
    fieldKey: "test",
    label: "Test Label",
    columnTitle: "Smartsheet Title",
    renderType: "text",
  };

  it("renders an input for text fields", () => {
    const html = renderToStaticMarkup(
      <ContributorSingleFieldControl
        field={mockField}
        editableDef={mockDef}
        value="Initial"
        onChange={() => {}}
      />
    );
    expect(html).toContain('value="Initial"');
    expect(html).toContain('Smartsheet Title');
    expect(html).toContain('Editable');
  });

  it("renders a select for picklist fields", () => {
    const picklistDef: ContributorEditableFieldDefinition = {
      ...mockDef,
      columnType: "PICKLIST",
      options: ["A", "B"],
    };
    const html = renderToStaticMarkup(
      <ContributorSingleFieldControl
        field={mockField}
        editableDef={picklistDef}
        value="A"
        onChange={() => {}}
      />
    );
    expect(html).toContain('<select');
    expect(html).toContain('<option value="A" selected="">A</option>');
    expect(html).toContain('<option value="B">B</option>');
  });

  it("renders a textarea for multiline_text", () => {
    const multilineDef: ContributorEditableFieldDefinition = {
      ...mockDef,
      renderType: "multiline_text",
    };
    const html = renderToStaticMarkup(
      <ContributorSingleFieldControl
        field={mockField}
        editableDef={multilineDef}
        value="Multi\nline"
        onChange={() => {}}
      />
    );
    expect(html).toContain('<textarea');
    expect(html).toContain('Multi');
    expect(html).toContain('line');
  });

  it("checkboxes MULTI_PICKLIST with comma-joined value", () => {
    const multiDef: ContributorEditableFieldDefinition = {
      ...mockDef,
      columnType: "MULTI_PICKLIST",
      options: ["Pullman", "Spokane"],
    };
    const html = renderToStaticMarkup(
      <ContributorSingleFieldControl
        field={mockField}
        editableDef={multiDef}
        value="Pullman, Spokane"
        onChange={() => {}}
      />
    );
    expect(html).toContain("<fieldset");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Pullman");
    expect(html).toContain("Spokane");
    expect(html).toContain('checked=""');
  });

  it("CONTACT_LIST: text input and Clear this role type=button (does not submit form)", () => {
    const contactDef: ContributorEditableFieldDefinition = {
      ...mockDef,
      columnType: "CONTACT_LIST",
      contactDisplayMode: "email",
    };
    const html = renderToStaticMarkup(
      <ContributorSingleFieldControl
        field={mockField}
        editableDef={contactDef}
        value="a@wsu.edu"
        onChange={() => {}}
      />
    );
    expect(html).toContain("Clear this role");
    expect(html).toContain('type="button"');
    expect(html).toContain('value="a@wsu.edu"');
    expect(html).toContain("<input");
  });
});

describe("ContributorGroupFieldControl", () => {
  const mockGroup: EditableFieldGroup = {
    id: "group1",
    label: "Coordinators",
    attributes: [
      { attribute: "name", fieldKey: "n", columnId: 1, columnType: "TEXT_NUMBER", columnTitle: "Name" },
      { attribute: "email", fieldKey: "e", columnId: 2, columnType: "CONTACT_LIST", columnTitle: "Email" },
    ],
    usesFixedSlots: false,
  };

  const mockPersons: MultiPersonEntry[] = [
    { name: "User One", email: "one@wsu.edu", phone: "" },
  ];

  it("renders fieldsets for each person", () => {
    const html = renderToStaticMarkup(
      <ContributorGroupFieldControl
        group={mockGroup}
        persons={mockPersons}
        onChange={() => {}}
      />
    );
    expect(html).toContain('User One');
    expect(html).toContain('one@wsu.edu');
    expect(html).toContain('Coordinators — person 1');
  });
});

describe("ContributorReadOnlyField", () => {
  const mockField: ResolvedFieldValue = {
    key: "ro",
    label: "Read Only",
    renderType: "text",
    textValue: "Fixed",
    listValue: ["Fixed"],
    links: [],
    isEmpty: false,
    hideWhenEmpty: false,
  };

  it("renders label and value using FieldValue", () => {
    const html = renderToStaticMarkup(
      <ContributorReadOnlyField field={mockField} />
    );
    expect(html).toContain('Read Only');
    expect(html).toContain('Fixed');
  });

  it("renders message when provided", () => {
    const html = renderToStaticMarkup(
      <ContributorReadOnlyField field={mockField} message="Info message" />
    );
    expect(html).toContain('Info message');
  });
});
