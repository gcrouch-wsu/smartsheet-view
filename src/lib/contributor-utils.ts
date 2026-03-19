import type {
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
const CONTRIBUTOR_EDITABLE_COLUMN_TYPES = new Set(["TEXT_NUMBER", "PICKLIST"]);
const CONTRIBUTOR_EDITABLE_RENDER_TYPES = new Set<RenderType>(["text", "multiline_text", "badge"]);

export interface ContributorEditableFieldDefinition {
  columnId: number;
  columnType: "TEXT_NUMBER" | "PICKLIST";
  fieldKey: string;
  label: string;
  renderType: "text" | "multiline_text" | "badge";
  options?: string[];
}

export interface ContributorEditingClientConfig {
  contactColumnIds: number[];
  editableColumnIds: number[];
  fieldColumnMap: Record<number, string>;
  editableFields: ContributorEditableFieldDefinition[];
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

export function isContributorEditableRenderType(renderType: RenderType): renderType is "text" | "multiline_text" | "badge" {
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

  const editableFields = getEligibleEditableFieldDefinitions(view, columns, editing.editableColumnIds);
  const editableColumnIds = editableFields.map((field) => field.columnId);
  const fieldColumnMap = editableFields.reduce<Record<number, string>>((map, field) => {
    map[field.columnId] = field.fieldKey;
    return map;
  }, {});

  return {
    contactColumnIds: [...editing.contactColumnIds],
    editableColumnIds,
    fieldColumnMap,
    editableFields,
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

  for (const columnId of editing.editableColumnIds) {
    const column = columnsById.get(columnId);
    if (!column) {
      errors.push(`Editable column ${columnId} does not exist in the current source schema.`);
      continue;
    }
    if (!eligibleByColumnId.has(columnId)) {
      errors.push(
        `Editable column "${column.title}" must be a visible direct-mapped TEXT_NUMBER or PICKLIST field with no transforms.`
      );
    }
  }

  return errors;
}

export function getEditableFieldValue(row: ResolvedViewRow, fieldColumnMap: Record<number, string>, columnId: number) {
  const fieldKey = fieldColumnMap[columnId];
  return fieldKey ? row.fieldMap[fieldKey]?.textValue ?? "" : "";
}
