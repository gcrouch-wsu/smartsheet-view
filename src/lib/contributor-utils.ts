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
const CONTRIBUTOR_EDITABLE_COLUMN_TYPES = new Set([
  "TEXT_NUMBER",
  "PICKLIST",
  "PHONE",
  "CONTACT_LIST",
  "MULTI_CONTACT_LIST",
]);
const CONTRIBUTOR_EDITABLE_RENDER_TYPES = new Set<RenderType>([
  "text",
  "multiline_text",
  "badge",
  "phone",
  "mailto",
  "mailto_list",
]);

/** Transforms that are safe for contact columns: display value can be reversed to objectValue. */
const CONTACT_SAFE_TRANSFORMS = new Set(["contact_emails", "contact_names"]);

export type ContactDisplayMode = "email" | "name";

export interface ContributorEditableFieldDefinition {
  columnId: number;
  columnType: "TEXT_NUMBER" | "PICKLIST" | "PHONE" | "CONTACT_LIST" | "MULTI_CONTACT_LIST";
  fieldKey: string;
  label: string;
  renderType: "text" | "multiline_text" | "badge" | "phone" | "mailto" | "mailto_list";
  options?: string[];
  /** For CONTACT_LIST/MULTI_CONTACT_LIST: whether display shows emails or names. Used to reverse transform on write. */
  contactDisplayMode?: ContactDisplayMode;
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

const CONTACT_DISPLAY_DELIMITERS = /[,;]+/;

/**
 * Convert edited display string back to Smartsheet objectValue for CONTACT_LIST / MULTI_CONTACT_LIST.
 * Used when contributor edits a contact field (emails or names) and we need to write objectValue.
 */
export function serializeContactDisplayToObjectValue(
  displayValue: string,
  columnType: "CONTACT_LIST" | "MULTI_CONTACT_LIST",
  contactDisplayMode: ContactDisplayMode,
): { objectType: "CONTACT" | "MULTI_CONTACT"; email?: string; name?: string; value?: unknown[] } {
  const tokens = displayValue
    .split(CONTACT_DISPLAY_DELIMITERS)
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return columnType === "CONTACT_LIST"
      ? { objectType: "CONTACT" }
      : { objectType: "MULTI_CONTACT", value: [] };
  }

  if (columnType === "CONTACT_LIST") {
    const first = tokens[0]!;
    return contactDisplayMode === "email"
      ? { objectType: "CONTACT", email: first }
      : { objectType: "CONTACT", name: first };
  }

  const value = tokens.map((token) =>
    contactDisplayMode === "email"
      ? { objectType: "CONTACT" as const, email: token }
      : { objectType: "CONTACT" as const, name: token },
  );
  return { objectType: "MULTI_CONTACT", value };
}

/** Serialize person entries back to cell values. Uses value for TEXT_NUMBER/PHONE, objectValue for CONTACT_LIST/MULTI_CONTACT_LIST. */
export function serializeMultiPersonToCells(
  persons: MultiPersonEntry[],
  group: EditableFieldGroup & { attributes: Array<EditableFieldGroupAttribute & { columnType?: string }> },
): Array<{ columnId: number; value?: string; objectValue?: unknown }> {
  const isContact = (t?: string) =>
    t === "CONTACT_LIST" || t === "MULTI_CONTACT_LIST";

  const contactAttrsByColumn = new Map<number, Array<typeof group.attributes[0]>>();
  const nonContactAttrs: Array<typeof group.attributes[0]> = [];

  for (const attr of group.attributes) {
    if (isContact(attr.columnType)) {
      const arr = contactAttrsByColumn.get(attr.columnId) ?? [];
      arr.push(attr);
      contactAttrsByColumn.set(attr.columnId, arr);
    } else {
      nonContactAttrs.push(attr);
    }
  }

  const result: Array<{ columnId: number; value?: string; objectValue?: unknown }> = [];

  for (const [columnId, attrs] of contactAttrsByColumn) {
    const hasEmail = attrs.some((a) => a.attribute === "email");
    const hasName = attrs.some((a) => a.attribute === "name");
    const value = persons.map((p) => {
      const c: { objectType: "CONTACT"; email?: string; name?: string } = {
        objectType: "CONTACT",
      };
      if (hasEmail && p.email.trim()) c.email = p.email.trim();
      if (hasName && p.name.trim()) c.name = p.name.trim();
      return c;
    });
    const objectValue =
      (attrs[0]!.columnType as string) === "CONTACT_LIST"
        ? value[0] ?? { objectType: "CONTACT" as const }
        : { objectType: "MULTI_CONTACT" as const, value };
    result.push({ columnId, objectValue });
  }

  for (const attr of nonContactAttrs) {
    const values = persons.map((p) => {
      if (attr.attribute === "name") return p.name.trim();
      if (attr.attribute === "email") return p.email.trim();
      if (attr.attribute === "phone") return p.phone.trim();
      return "";
    });
    result.push({ columnId: attr.columnId, value: values.filter(Boolean).join(", ") || "" });
  }

  return result;
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

export function isContributorEditableRenderType(renderType: RenderType): renderType is "text" | "multiline_text" | "badge" | "phone" | "mailto" | "mailto_list" {
  return CONTRIBUTOR_EDITABLE_RENDER_TYPES.has(renderType);
}

function hasEditableSafeTransforms(field: ViewFieldConfig, columnType: string): { ok: boolean; contactDisplayMode?: ContactDisplayMode } {
  const transforms = field.transforms ?? [];
  if (transforms.length === 0) {
    return { ok: true };
  }
  if (!CONTRIBUTOR_CONTACT_COLUMN_TYPES.has(columnType)) {
    return { ok: false };
  }
  if (transforms.length !== 1) {
    return { ok: false };
  }
  const op = transforms[0]?.op;
  if (op === "contact_emails") {
    return { ok: true, contactDisplayMode: "email" };
  }
  if (op === "contact_names") {
    return { ok: true, contactDisplayMode: "name" };
  }
  return { ok: false };
}

/**
 * True when field maps to a single Smartsheet column in a way we can write back.
 * Contact columns require mailto + contact_emails/contact_names. Other columns allow display
 * transforms (trim, etc.)—we still treat the field as one column for editing.
 */
export function isEditableFieldDirectMapped(field: ViewFieldConfig, column?: SmartsheetColumn | null) {
  if (
    typeof field.source.columnId !== "number" ||
    field.render.type === "hidden" ||
    field.source.preferredColumnId ||
    field.source.preferredColumnTitle ||
    field.source.preferredColumnType ||
    field.source.fallbackColumnId ||
    field.source.fallbackColumnTitle ||
    field.source.fallbackColumnType ||
    (field.source.coalesce?.length ?? 0) > 0
  ) {
    return false;
  }

  const columnType = column?.type ?? "";
  const transformCheck = hasEditableSafeTransforms(field, columnType);

  if (CONTRIBUTOR_CONTACT_COLUMN_TYPES.has(columnType)) {
    return (
      transformCheck.ok &&
      (field.render.type === "mailto" || field.render.type === "mailto_list")
    );
  }

  // Non-contact: still direct-mapped to one column. Display transforms (trim, case, etc.) only
  // affect how we show data; contributors edit the rendered text and we write that string back.
  // Requiring zero transforms incorrectly dropped admin-selected columns (e.g. "Coordinator"
  // with a trim transform) from the edit UI.
  return isContributorEditableRenderType(field.render.type);
}

function buildDirectMappedFieldCounts(view: ViewConfig, columns: SmartsheetColumn[]) {
  const columnsById = new Map(columns.map((c) => [c.id, c]));
  const counts = new Map<number, number>();

  for (const field of view.fields) {
    const columnId = field.source.columnId as number;
    const column = columnsById.get(columnId);
    if (!isEditableFieldDirectMapped(field, column)) {
      continue;
    }
    counts.set(columnId, (counts.get(columnId) ?? 0) + 1);
  }

  return counts;
}

/** Prefer contact_emails over contact_names when multiple fields map to same contact column. */
function pickContactFieldForEditing(
  fields: Array<{ field: ViewFieldConfig; column: SmartsheetColumn }>,
): { field: ViewFieldConfig; column: SmartsheetColumn } | null {
  if (fields.length === 0) return null;
  const withEmails = fields.find((f) => f.field.transforms?.some((t) => t.op === "contact_emails"));
  const withNames = fields.find((f) => f.field.transforms?.some((t) => t.op === "contact_names"));
  return withEmails ?? withNames ?? fields[0] ?? null;
}

export function getEligibleEditableFieldDefinitions(
  view: ViewConfig,
  columns: SmartsheetColumn[],
  editableColumnIds?: number[],
) {
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const directFieldCounts = buildDirectMappedFieldCounts(view, columns);
  const requestedEditableIds = editableColumnIds ? new Set(editableColumnIds) : null;

  const eligibleFields: ContributorEditableFieldDefinition[] = [];
  const contactFieldsByColumn = new Map<number, Array<{ field: ViewFieldConfig; column: SmartsheetColumn }>>();

  for (const field of view.fields) {
    const columnId = field.source.columnId as number;
    const column = columnsById.get(columnId);
    if (!isEditableFieldDirectMapped(field, column)) {
      continue;
    }
    if (requestedEditableIds && !requestedEditableIds.has(columnId)) {
      continue;
    }
    if (!column || !CONTRIBUTOR_EDITABLE_COLUMN_TYPES.has(column.type)) {
      continue;
    }

    const isContactColumn = CONTRIBUTOR_CONTACT_COLUMN_TYPES.has(column.type);
    const count = directFieldCounts.get(columnId) ?? 0;

    if (isContactColumn) {
      if (count >= 1) {
        const arr = contactFieldsByColumn.get(columnId) ?? [];
        arr.push({ field, column });
        contactFieldsByColumn.set(columnId, arr);
      }
    } else {
      if (count !== 1) continue;
      const transformCheck = hasEditableSafeTransforms(field, column.type);
      const def: ContributorEditableFieldDefinition = {
        columnId,
        columnType: column.type as ContributorEditableFieldDefinition["columnType"],
        fieldKey: field.key,
        label: field.label || field.key,
        renderType: field.render.type as ContributorEditableFieldDefinition["renderType"],
        options: column.options,
      };
      if (transformCheck.contactDisplayMode) {
        def.contactDisplayMode = transformCheck.contactDisplayMode;
      }
      eligibleFields.push(def);
    }
  }

  for (const [columnId, fields] of contactFieldsByColumn) {
    const picked = pickContactFieldForEditing(fields);
    if (!picked) continue;
    const { field, column } = picked;
    const transformCheck = hasEditableSafeTransforms(field, column.type);
    const def: ContributorEditableFieldDefinition = {
      columnId,
      columnType: column.type as ContributorEditableFieldDefinition["columnType"],
      fieldKey: field.key,
      label: field.label || field.key,
      renderType: field.render.type as ContributorEditableFieldDefinition["renderType"],
      options: column.options,
    };
    if (transformCheck.contactDisplayMode) {
      def.contactDisplayMode = transformCheck.contactDisplayMode;
    }
    eligibleFields.push(def);
  }

  return eligibleFields;
}

/** Column types for multi-person groups. Contact columns need objectValue write-back. */
const MULTI_PERSON_GROUP_COLUMN_TYPES = new Set([
  "TEXT_NUMBER",
  "PICKLIST",
  "PHONE",
  "CONTACT_LIST",
  "MULTI_CONTACT_LIST",
]);

/**
 * Field list for multi-person groups. Includes TEXT_NUMBER, PICKLIST, PHONE, and CONTACT_LIST/MULTI_CONTACT_LIST.
 * For contact columns, only includes fields with contact_emails or contact_names transform; allows multiple
 * fields per column (e.g. one for names, one for emails).
 */
export function getFieldsForMultiPersonGroup(
  view: ViewConfig,
  columns: SmartsheetColumn[],
): Array<{ columnId: number; fieldKey: string; label: string; columnType: string }> {
  const columnsById = new Map(columns.map((c) => [c.id, c]));
  const result: Array<{ columnId: number; fieldKey: string; label: string; columnType: string }> = [];
  const seenNonContact = new Set<number>();
  const seenContact = new Set<string>();

  for (const field of view.fields) {
    if (field.render.type === "hidden") continue;
    const columnId =
      (typeof field.source.columnId === "number" ? field.source.columnId : null) ??
      (typeof field.source.preferredColumnId === "number" ? field.source.preferredColumnId : null);
    if (columnId == null) continue;

    const column = columnsById.get(columnId);
    if (!column || !MULTI_PERSON_GROUP_COLUMN_TYPES.has(column.type)) continue;

    const isContact = CONTRIBUTOR_CONTACT_COLUMN_TYPES.has(column.type);
    if (isContact) {
      const hasContactTransform = field.transforms?.some(
        (t) => t.op === "contact_emails" || t.op === "contact_names",
      );
      if (!hasContactTransform) continue;
      const key = `${columnId}:${field.key}`;
      if (seenContact.has(key)) continue;
      seenContact.add(key);
    } else {
      if (seenNonContact.has(columnId)) continue;
      seenNonContact.add(columnId);
    }

    result.push({
      columnId,
      fieldKey: field.key,
      label: field.label || field.key,
      columnType: column.type,
    });
  }
  return result;
}

export function buildContributorEditingClientConfig(view: ViewConfig, columns: SmartsheetColumn[]) {
  const editing = view.editing;
  if (!editing?.enabled) {
    return null;
  }

  const columnsById = new Map(columns.map((c) => [c.id, c]));
  const groups = (editing.editableFieldGroups ?? []).map((group) => ({
    ...group,
    attributes: group.attributes.map((attr) => ({
      ...attr,
      columnType: attr.columnType ?? columnsById.get(attr.columnId)?.type,
    })),
  }));
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
        `Editable column "${column.title}" must be a visible direct-mapped TEXT_NUMBER, PICKLIST, PHONE, or CONTACT_LIST/MULTI_CONTACT_LIST field (contact columns require contact_emails or contact_names transform).`
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
