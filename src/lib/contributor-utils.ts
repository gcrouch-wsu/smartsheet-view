import type {
  EditableFieldGroup,
  EditableFieldGroupAttribute,
  RenderType,
  ResolvedViewRow,
  SmartsheetCell,
  SmartsheetColumn,
  SmartsheetRow,
  ViewConfig,
  ViewFieldConfig,
} from "@/lib/config/types";
import { applyViewFilters } from "@/lib/filters";
import { normalizeSourceValue, toContactList } from "@/lib/transforms";

const CONTRIBUTOR_CONTACT_COLUMN_TYPES = new Set(["CONTACT_LIST", "MULTI_CONTACT_LIST"]);
const CONTRIBUTOR_EDITABLE_COLUMN_TYPES = new Set(["TEXT_NUMBER", "PICKLIST", "PHONE"]);
const CONTRIBUTOR_EDITABLE_RENDER_TYPES = new Set<RenderType>(["text", "multiline_text", "badge", "phone"]);

export interface ContributorEditableFieldDefinition {
  columnId: number;
  columnType: "TEXT_NUMBER" | "PICKLIST" | "PHONE";
  fieldKey: string;
  label: string;
  renderType: "text" | "multiline_text" | "badge" | "phone";
  options?: string[];
}

export interface ContributorEditingClientConfig {
  contactColumnIds: number[];
  editableColumnIds: number[];
  fieldColumnMap: Record<number, string>;
  editableFields: ContributorEditableFieldDefinition[];
  editableFieldGroups: EditableFieldGroup[];
}

/** Person object for multi-person fields: name, email, phone. */
export interface MultiPersonEntry {
  name: string;
  email: string;
  phone: string;
}

const MULTI_PERSON_DELIMITERS = /[,;]+/;

/** Parse a cell value into an array of strings (one per person/position). Handles comma and semicolon. */
export function parseMultiPersonValue(value: string | null | undefined): string[] {
  if (value == null || typeof value !== "string") return [];
  return value
    .split(MULTI_PERSON_DELIMITERS)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse a row's field values into person entries. Aligns by index across attributes. */
export function parseMultiPersonRow(
  row: ResolvedViewRow,
  group: EditableFieldGroup,
): MultiPersonEntry[] {
  const attrArrays = group.attributes.map((attr) => {
    const val = row.fieldMap[attr.fieldKey]?.textValue ?? "";
    return parseMultiPersonValue(val);
  });

  const maxLen = Math.max(1, ...attrArrays.map((a) => a.length));
  const persons: MultiPersonEntry[] = [];

  const defaults: MultiPersonEntry = { name: "", email: "", phone: "" };

  for (let i = 0; i < maxLen; i++) {
    const entry: MultiPersonEntry = { ...defaults };
    for (let j = 0; j < group.attributes.length; j++) {
      const attr = group.attributes[j];
      const arr = attrArrays[j];
      const val = arr?.[i] ?? "";
      if (attr.attribute === "name") entry.name = val;
      else if (attr.attribute === "email") entry.email = val;
      else if (attr.attribute === "phone") entry.phone = val;
    }
    persons.push(entry);
  }

  return persons;
}

/** Serialize person entries back to cell values. Always uses comma as delimiter. */
export function serializeMultiPersonToCells(
  persons: MultiPersonEntry[],
  group: EditableFieldGroup,
): Array<{ columnId: number; value: string }> {
  return group.attributes.map((attr) => {
    const values = persons.map((p) => {
      if (attr.attribute === "name") return p.name.trim();
      if (attr.attribute === "email") return p.email.trim();
      if (attr.attribute === "phone") return p.phone.trim();
      return "";
    });
    const value = values.filter(Boolean).join(", ") || "";
    return { columnId: attr.columnId, value };
  });
}

export function normalizeContributorEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isWsuEmail(value: string) {
  return normalizeContributorEmail(value).endsWith("@wsu.edu");
}

export function extractContributorEmailsFromCell(cell: SmartsheetCell | null | undefined) {
  if (!cell) {
    return [];
  }

  const contacts = toContactList(normalizeSourceValue(cell));
  return [...new Set(contacts.map((contact) => normalizeContributorEmail(contact.email ?? "")).filter(Boolean))];
}

export function collectContributorEmailsForRow(row: SmartsheetRow, contactColumnIds: number[]) {
  const emails = new Set<string>();

  for (const columnId of contactColumnIds) {
    for (const email of extractContributorEmailsFromCell(row.cellsById[columnId])) {
      emails.add(email);
    }
  }

  return [...emails];
}

export function isContributorInRow(row: SmartsheetRow, email: string, contactColumnIds: number[]) {
  const normalizedEmail = normalizeContributorEmail(email);
  return collectContributorEmailsForRow(row, contactColumnIds).includes(normalizedEmail);
}

export function isContributorStillInSheet(rows: SmartsheetRow[], email: string, contactColumnIds: number[]) {
  const normalizedEmail = normalizeContributorEmail(email);
  return rows.some((row) => isContributorInRow(row, normalizedEmail, contactColumnIds));
}

export function getEditableRowIdsForView(rows: SmartsheetRow[], view: ViewConfig, email: string) {
  const editing = view.editing;
  if (!editing?.enabled) {
    return [];
  }

  return applyViewFilters(rows, view.filters)
    .filter((row) => isContributorInRow(row, email, editing.contactColumnIds))
    .map((row) => row.id);
}

export function isContributorEditableRenderType(renderType: RenderType): renderType is "text" | "multiline_text" | "badge" | "phone" {
  return CONTRIBUTOR_EDITABLE_RENDER_TYPES.has(renderType);
}

export function isEditableFieldDirectMapped(field: ViewFieldConfig) {
  return (
    typeof field.source.columnId === "number" &&
    field.render.type !== "hidden" &&
    !field.source.preferredColumnId &&
    !field.source.preferredColumnTitle &&
    !field.source.preferredColumnType &&
    !field.source.fallbackColumnId &&
    !field.source.fallbackColumnTitle &&
    !field.source.fallbackColumnType &&
    !(field.source.coalesce?.length) &&
    !(field.transforms?.length) &&
    isContributorEditableRenderType(field.render.type)
  );
}

function buildDirectMappedFieldCounts(view: ViewConfig) {
  const counts = new Map<number, number>();

  for (const field of view.fields) {
    if (!isEditableFieldDirectMapped(field)) {
      continue;
    }
    const columnId = field.source.columnId as number;
    counts.set(columnId, (counts.get(columnId) ?? 0) + 1);
  }

  return counts;
}

export function getEligibleEditableFieldDefinitions(
  view: ViewConfig,
  columns: SmartsheetColumn[],
  editableColumnIds?: number[],
) {
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const directFieldCounts = buildDirectMappedFieldCounts(view);
  const requestedEditableIds = editableColumnIds ? new Set(editableColumnIds) : null;

  const eligibleFields: ContributorEditableFieldDefinition[] = [];

  for (const field of view.fields) {
    if (!isEditableFieldDirectMapped(field)) {
      continue;
    }

    const columnId = field.source.columnId as number;
    if (directFieldCounts.get(columnId) !== 1) {
      continue;
    }
    if (requestedEditableIds && !requestedEditableIds.has(columnId)) {
      continue;
    }

    const column = columnsById.get(columnId);
    if (!column || !CONTRIBUTOR_EDITABLE_COLUMN_TYPES.has(column.type)) {
      continue;
    }

    eligibleFields.push({
      columnId,
      columnType: column.type as ContributorEditableFieldDefinition["columnType"],
      fieldKey: field.key,
      label: field.label || field.key,
      renderType: field.render.type as ContributorEditableFieldDefinition["renderType"],
      options: column.options,
    });
  }

  return eligibleFields;
}

export function buildContributorEditingClientConfig(view: ViewConfig, columns: SmartsheetColumn[]) {
  const editing = view.editing;
  if (!editing?.enabled) {
    return null;
  }

  const groups = editing.editableFieldGroups ?? [];
  const groupColumnIds = new Set(
    groups.flatMap((g) => g.attributes.map((a) => a.columnId)),
  );

  const allEditableFields = getEligibleEditableFieldDefinitions(view, columns, editing.editableColumnIds);
  const editableFields = allEditableFields.filter((f) => !groupColumnIds.has(f.columnId));
  const simpleColumnIds = editableFields.map((field) => field.columnId);
  const editableColumnIds = [...simpleColumnIds, ...groupColumnIds];
  const fieldColumnMap = editableFields.reduce<Record<number, string>>((map, field) => {
    map[field.columnId] = field.fieldKey;
    return map;
  }, {});

  return {
    contactColumnIds: [...editing.contactColumnIds],
    editableColumnIds,
    fieldColumnMap,
    editableFields,
    editableFieldGroups: groups,
  } satisfies ContributorEditingClientConfig;
}

export function getContributorEditingValidationErrors(view: ViewConfig, columns: SmartsheetColumn[]) {
  const editing = view.editing;
  if (!editing?.enabled) {
    return [];
  }

  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const errors: string[] = [];

  for (const columnId of editing.contactColumnIds) {
    const column = columnsById.get(columnId);
    if (!column) {
      errors.push(`Editing contact column ${columnId} does not exist in the current source schema.`);
      continue;
    }
    if (!CONTRIBUTOR_CONTACT_COLUMN_TYPES.has(column.type)) {
      errors.push(`Editing contact column "${column.title}" must be CONTACT_LIST or MULTI_CONTACT_LIST.`);
    }
  }

  const eligibleFields = getEligibleEditableFieldDefinitions(view, columns);
  const eligibleByColumnId = new Map(eligibleFields.map((field) => [field.columnId, field]));

  const groupColumnIds = new Set(
    (editing.editableFieldGroups ?? []).flatMap((g) => g.attributes.map((a) => a.columnId)),
  );

  for (const columnId of editing.editableColumnIds) {
    if (groupColumnIds.has(columnId)) continue;
    const column = columnsById.get(columnId);
    if (!column) {
      errors.push(`Editable column ${columnId} does not exist in the current source schema.`);
      continue;
    }
    if (!eligibleByColumnId.has(columnId)) {
      errors.push(
        `Editable column "${column.title}" must be a visible direct-mapped TEXT_NUMBER, PICKLIST, or PHONE field with no transforms.`
      );
    }
  }

  const fieldKeys = new Set(view.fields.map((f) => f.key));
  for (const group of editing.editableFieldGroups ?? []) {
    for (const attr of group.attributes) {
      if (!fieldKeys.has(attr.fieldKey)) {
        errors.push(`Editable field group "${group.label}": field key "${attr.fieldKey}" does not exist in the view.`);
      }
      if (!columnsById.has(attr.columnId)) {
        errors.push(`Editable field group "${group.label}": column ${attr.columnId} does not exist in the source schema.`);
      }
    }
  }

  return errors;
}

export function getEditableFieldValue(row: ResolvedViewRow, fieldColumnMap: Record<number, string>, columnId: number) {
  const fieldKey = fieldColumnMap[columnId];
  return fieldKey ? row.fieldMap[fieldKey]?.textValue ?? "" : "";
}
