import { CARD_LAYOUT_PLACEHOLDER, CARD_LAYOUT_TEXT_PREFIX } from "@/lib/config/types";
import type {
  EditableFieldGroup,
  EditableFieldGroupAttribute,
  FilterOperator,
  LayoutType,
  RenderType,
  RowDividerStyle,
  SourceConfig,
  TransformConfig,
  ViewConfig,
  ViewEditingConfig,
  ViewFieldConfig,
  ViewFilterConfig,
  ViewPresentationConfig,
  ViewSortConfig,
  ViewStyleConfig,
} from "@/lib/config/types";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

const LAYOUT_TYPES: LayoutType[] = ["table", "cards", "list", "tabbed", "stacked", "accordion", "list_detail"];
const RENDER_TYPES: RenderType[] = [
  "text",
  "multiline_text",
  "list",
  "mailto",
  "mailto_list",
  "phone",
  "phone_list",
  "link",
  "date",
  "badge",
  "hidden",
];
const FILTER_OPERATORS: FilterOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "in",
  "not_in",
  "is_empty",
  "not_empty",
];
const DATE_STYLES = ["full", "long", "medium", "short"] as const;
const TRANSFORM_OPS = [
  "trim",
  "split",
  "coalesce",
  "reset_to_source",
  "extract_emails",
  "extract_phones",
  "dedupe",
  "filter_empty",
  "to_contact_list",
  "contact_names",
  "contact_emails",
  "join",
  "lowercase",
  "uppercase",
  "format_date",
  "url_from_value",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const normalized = asTrimmedString(value);
  return normalized || undefined;
}

function asOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function parseTransformConfig(input: unknown, path: string): ValidationResult<TransformConfig> {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { success: false, errors: [`${path} must be an object.`] };
  }

  const op = asTrimmedString(input.op);
  if (!TRANSFORM_OPS.includes(op as (typeof TRANSFORM_OPS)[number])) {
    errors.push(`${path}.op must be one of: ${TRANSFORM_OPS.join(", ")}.`);
  }

  const dateStyle = asOptionalString(input.dateStyle);
  const timeStyle = asOptionalString(input.timeStyle);
  if (dateStyle && !DATE_STYLES.includes(dateStyle as (typeof DATE_STYLES)[number])) {
    errors.push(`${path}.dateStyle must be one of: ${DATE_STYLES.join(", ")}.`);
  }
  if (timeStyle && !DATE_STYLES.includes(timeStyle as (typeof DATE_STYLES)[number])) {
    errors.push(`${path}.timeStyle must be one of: ${DATE_STYLES.join(", ")}.`);
  }

  const delimiters = Array.isArray(input.delimiters)
    ? input.delimiters.map((entry) => asTrimmedString(entry)).filter(Boolean)
    : undefined;

  return {
    success: errors.length === 0,
    errors,
    data: errors.length
      ? undefined
      : {
          op,
          delimiter: asOptionalString(input.delimiter),
          delimiters,
          separator: asOptionalString(input.separator),
          locale: asOptionalString(input.locale),
          dateStyle: dateStyle as TransformConfig["dateStyle"],
          timeStyle: timeStyle as TransformConfig["timeStyle"],
        },
  };
}

function parseFieldConfig(input: unknown, index: number): ValidationResult<ViewFieldConfig> {
  const path = `fields[${index}]`;
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { success: false, errors: [`${path} must be an object.`] };
  }

  const key = asTrimmedString(input.key);
  const label = asTrimmedString(input.label) ?? "";
  if (!key) {
    errors.push(`${path}.key is required.`);
  }

  const sourceInput = isRecord(input.source) ? input.source : {};
  const coalesceTitles = Array.isArray(sourceInput.coalesce)
    ? sourceInput.coalesce
        .filter((entry) => isRecord(entry))
        .map((entry) => ({
          columnId: asOptionalNumber(entry.columnId),
          columnTitle: asOptionalString(entry.columnTitle),
          columnType: asOptionalString(entry.columnType),
        }))
        .filter((entry) => typeof entry.columnId === "number" || Boolean(entry.columnTitle))
    : [];

  const renderInput = isRecord(input.render) ? input.render : {};
  const renderType = asTrimmedString(renderInput.type);
  if (!RENDER_TYPES.includes(renderType as RenderType)) {
    errors.push(`${path}.render.type must be one of: ${RENDER_TYPES.join(", ")}.`);
  }

  const transforms: TransformConfig[] = [];
  for (const [transformIndex, transform] of (Array.isArray(input.transforms) ? input.transforms : []).entries()) {
    const result = parseTransformConfig(transform, `${path}.transforms[${transformIndex}]`);
    errors.push(...result.errors);
    if (result.data) {
      transforms.push(result.data);
    }
  }

  const source = {
    columnId: asOptionalNumber(sourceInput.columnId),
    columnTitle: asOptionalString(sourceInput.columnTitle),
    columnType: asOptionalString(sourceInput.columnType),
    preferredColumnId: asOptionalNumber(sourceInput.preferredColumnId),
    preferredColumnTitle: asOptionalString(sourceInput.preferredColumnTitle),
    preferredColumnType: asOptionalString(sourceInput.preferredColumnType),
    fallbackColumnId: asOptionalNumber(sourceInput.fallbackColumnId),
    fallbackColumnTitle: asOptionalString(sourceInput.fallbackColumnTitle),
    fallbackColumnType: asOptionalString(sourceInput.fallbackColumnType),
    coalesce: coalesceTitles.length > 0 ? coalesceTitles : undefined,
  };

  const hasSelector = [
    source.columnId,
    source.columnTitle,
    source.preferredColumnId,
    source.preferredColumnTitle,
    source.fallbackColumnId,
    source.fallbackColumnTitle,
    ...(source.coalesce ?? []).flatMap((entry) => [entry.columnId, entry.columnTitle]),
  ].some((value) => value !== undefined && value !== "");

  if (!hasSelector) {
    errors.push(`${path}.source must define at least one column selector.`);
  }

  const emptyBehavior = asOptionalString(input.emptyBehavior);
  if (emptyBehavior && emptyBehavior !== "show" && emptyBehavior !== "hide") {
    errors.push(`${path}.emptyBehavior must be "show" or "hide".`);
  }

  const hideLabel = input.hideLabel === true || input.hideLabel === "true";

  return {
    success: errors.length === 0,
    errors,
    data: errors.length
      ? undefined
      : {
          key,
          label,
          description: asOptionalString(input.description),
          source,
          transforms,
          render: {
            type: renderType as RenderType,
            emptyLabel: asOptionalString(renderInput.emptyLabel),
            listDelimiter: asOptionalString(renderInput.listDelimiter),
            listDisplay: asOptionalString(renderInput.listDisplay) === "stacked" ? "stacked" : asOptionalString(renderInput.listDisplay) === "inline" ? "inline" : undefined,
          },
          emptyBehavior: emptyBehavior as ViewFieldConfig["emptyBehavior"],
          hideLabel: hideLabel || undefined,
        },
  };
}

function parseFilterConfig(input: unknown, index: number): ValidationResult<ViewFilterConfig> {
  const path = `filters[${index}]`;
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { success: false, errors: [`${path} must be an object.`] };
  }

  const op = asTrimmedString(input.op);
  if (!FILTER_OPERATORS.includes(op as FilterOperator)) {
    errors.push(`${path}.op must be one of: ${FILTER_OPERATORS.join(", ")}.`);
  }

  const columnId = asOptionalNumber(input.columnId);
  const columnTitle = asOptionalString(input.columnTitle);
  const columnType = asOptionalString(input.columnType);
  if (columnId === undefined && !columnTitle) {
    errors.push(`${path} must define columnId or columnTitle.`);
  }

  const rawValue = input.value;
  let value: ViewFilterConfig["value"] = undefined;
  if (Array.isArray(rawValue)) {
    value = rawValue.map((entry) => (typeof entry === "string" ? entry.trim() : entry));
  } else if (rawValue !== undefined && rawValue !== null) {
    value = typeof rawValue === "string" ? rawValue.trim() : (rawValue as ViewFilterConfig["value"]);
  }

  return {
    success: errors.length === 0,
    errors,
    data: errors.length ? undefined : { columnId, columnTitle, columnType, op: op as FilterOperator, value },
  };
}

function parseSortConfig(input: unknown, index: number): ValidationResult<ViewSortConfig> {
  const path = `defaultSort[${index}]`;
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { success: false, errors: [`${path} must be an object.`] };
  }

  const field = asTrimmedString(input.field);
  const direction = asTrimmedString(input.direction);

  if (!field) {
    errors.push(`${path}.field is required.`);
  }
  if (direction !== "asc" && direction !== "desc") {
    errors.push(`${path}.direction must be "asc" or "desc".`);
  }

  return {
    success: errors.length === 0,
    errors,
    data: errors.length ? undefined : { field, direction: direction as ViewSortConfig["direction"] },
  };
}

function parsePresentationConfig(input: unknown, fieldKeys: Set<string>): ValidationResult<ViewPresentationConfig | undefined> {
  if (input === undefined || input === null || input === "") {
    return { success: true, errors: [], data: undefined };
  }

  if (!isRecord(input)) {
    return { success: false, errors: ["presentation must be an object."] };
  }

  const errors: string[] = [];
  const headingFieldKey = asOptionalString(input.headingFieldKey);
  const summaryFieldKey = asOptionalString(input.summaryFieldKey);
  const indexFieldKey = asOptionalString(input.indexFieldKey);
  const hideRowBadge = asBoolean(input.hideRowBadge, false);
  const rowDividerStyle = asOptionalString(input.rowDividerStyle);
  const validDividerStyles = ["none", "default", "subtle"];
  const dividerStyle = rowDividerStyle && validDividerStyles.includes(rowDividerStyle) ? rowDividerStyle : undefined;
  const hideHeader = asBoolean(input.hideHeader, false);
  const hideHeaderBackLink = asBoolean(input.hideHeaderBackLink, false);
  const hideHeaderSourceLabel = asBoolean(input.hideHeaderSourceLabel, false);
  const hideHeaderPageTitle = asBoolean(input.hideHeaderPageTitle, false);
  const hideHeaderLiveDataText = asBoolean(input.hideHeaderLiveDataText, false);
  const hideHeaderInfoBox = asBoolean(input.hideHeaderInfoBox, false);
  const hideHeaderActiveView = asBoolean(input.hideHeaderActiveView, false);
  const hideHeaderRows = asBoolean(input.hideHeaderRows, false);
  const hideHeaderRefreshed = asBoolean(input.hideHeaderRefreshed, false);
  const headerCustomText = asOptionalString(input.headerCustomText);
  const hideViewTitleSection = asBoolean(input.hideViewTitleSection, false);
  const hideViewTabs = asBoolean(input.hideViewTabs, false);
  const hideViewTabCount = asBoolean(input.hideViewTabCount, false);
  const viewTabLabel = asOptionalString(input.viewTabLabel);

  if (headingFieldKey && !fieldKeys.has(headingFieldKey)) {
    errors.push(`presentation.headingFieldKey \"${headingFieldKey}\" does not match any field key.`);
  }
  if (summaryFieldKey && !fieldKeys.has(summaryFieldKey)) {
    errors.push(`presentation.summaryFieldKey \"${summaryFieldKey}\" does not match any field key.`);
  }
  if (indexFieldKey && !fieldKeys.has(indexFieldKey)) {
    errors.push(`presentation.indexFieldKey \"${indexFieldKey}\" does not match any field key.`);
  }

  let cardLayout: ViewPresentationConfig["cardLayout"];
  if (Array.isArray(input.cardLayout)) {
    cardLayout = [];
    for (let i = 0; i < input.cardLayout.length; i++) {
      const row = input.cardLayout[i];
      if (!Array.isArray(row?.fieldKeys)) {
        errors.push(`presentation.cardLayout[${i}].fieldKeys must be an array.`);
      } else {
        const keys = row.fieldKeys.filter((k: unknown) => typeof k === "string").map((k: string) => k.trim()).filter(Boolean);
        for (const key of keys) {
          if (key === CARD_LAYOUT_PLACEHOLDER || key.startsWith(CARD_LAYOUT_TEXT_PREFIX)) continue;
          if (!fieldKeys.has(key)) {
            errors.push(`presentation.cardLayout[${i}] references unknown field key \"${key}\".`);
          }
        }
        cardLayout.push({ fieldKeys: keys });
      }
    }
  }

  const hasPresentation = Boolean(
    headingFieldKey ||
      summaryFieldKey ||
      indexFieldKey ||
      hideRowBadge ||
      dividerStyle ||
      (cardLayout && cardLayout.length > 0) ||
      hideHeader ||
      hideHeaderBackLink ||
      hideHeaderSourceLabel ||
      hideHeaderPageTitle ||
      hideHeaderLiveDataText ||
      hideHeaderInfoBox ||
      hideHeaderActiveView ||
      hideHeaderRows ||
      hideHeaderRefreshed ||
      headerCustomText ||
      hideViewTitleSection ||
      hideViewTabs ||
      hideViewTabCount ||
      viewTabLabel
  );

  return {
    success: errors.length === 0,
    errors,
    data:
      errors.length || !hasPresentation
        ? undefined
        : {
            headingFieldKey,
            summaryFieldKey,
            indexFieldKey,
            hideRowBadge,
            cardLayout,
            rowDividerStyle: dividerStyle as RowDividerStyle,
            hideHeader,
            hideHeaderBackLink,
            hideHeaderSourceLabel,
            hideHeaderPageTitle,
            hideHeaderLiveDataText,
            hideHeaderInfoBox,
            hideHeaderActiveView,
            hideHeaderRows,
            hideHeaderRefreshed,
            headerCustomText,
            hideViewTitleSection,
            hideViewTabs,
            hideViewTabCount,
            viewTabLabel,
          },
  };
}

const STYLE_KEYS: (keyof ViewStyleConfig)[] = [
  "backgroundColor",
  "cardBackground",
  "accentColor",
  "textColor",
  "mutedColor",
  "borderColor",
  "fontFamily",
  "headingFontFamily",
  "fontSize",
  "headingFontSize",
  "fontWeight",
  "headingFontWeight",
  "fontStyle",
  "headingFontStyle",
  "borderRadius",
  "cardShadow",
  "badgeBg",
  "badgeText",
  "primaryColor",
];

function parseStyleConfig(input: unknown): ValidationResult<ViewStyleConfig | undefined> {
  if (input === undefined || input === null || input === "") {
    return { success: true, errors: [], data: undefined };
  }

  if (!isRecord(input)) {
    return { success: false, errors: ["style must be an object."] };
  }

  const style: ViewStyleConfig = {};
  for (const key of STYLE_KEYS) {
    const value = asOptionalString((input as Record<string, unknown>)[key]);
    if (value) {
      (style as Record<string, string>)[key] = value;
    }
  }

  return {
    success: true,
    errors: [],
    data: Object.keys(style).length > 0 ? style : undefined,
  };
}

function parseNumberArray(input: unknown, path: string) {
  const errors: string[] = [];
  if (input === undefined || input === null || input === "") {
    return { errors, values: [] as number[] };
  }
  if (!Array.isArray(input)) {
    return { errors: [`${path} must be an array.`], values: [] as number[] };
  }

  const values: number[] = [];
  for (const [index, entry] of input.entries()) {
    const parsed = asOptionalNumber(entry);
    if (parsed === undefined) {
      errors.push(`${path}[${index}] must be a number.`);
      continue;
    }
    values.push(parsed);
  }

  return {
    errors,
    values: [...new Set(values)],
  };
}

function parseEditingConfig(input: unknown): ValidationResult<ViewEditingConfig | undefined> {
  if (input === undefined || input === null || input === "") {
    return { success: true, errors: [], data: undefined };
  }

  if (!isRecord(input)) {
    return { success: false, errors: ["editing must be an object."] };
  }

  const enabled = asBoolean(input.enabled, false);
  const contactColumnIds = parseNumberArray(input.contactColumnIds, "editing.contactColumnIds");
  const editableColumnIds = parseNumberArray(input.editableColumnIds, "editing.editableColumnIds");
  const errors = [...contactColumnIds.errors, ...editableColumnIds.errors];

  if (enabled && contactColumnIds.values.length === 0) {
    errors.push("editing.contactColumnIds must include at least one column when editing is enabled.");
  }

  const editableFieldGroups = parseEditableFieldGroups(input.editableFieldGroups);
  errors.push(...editableFieldGroups.errors);

  const hasEditableContent = editableColumnIds.values.length > 0 || editableFieldGroups.data.length > 0;
  if (enabled && !hasEditableContent) {
    errors.push(
      "Select at least one Editable Field (what contributors can edit) or add a Multi-person field group. Contact columns only define who can edit, not what."
    );
  }

  return {
    success: errors.length === 0,
    errors,
    data: errors.length
      ? undefined
      : {
          enabled,
          contactColumnIds: contactColumnIds.values,
          editableColumnIds: editableColumnIds.values,
          editableFieldGroups: editableFieldGroups.data,
          showLoginLink: asBoolean(input.showLoginLink, true),
        },
  };
}

function parseEditableFieldGroups(input: unknown): {
  errors: string[];
  data: EditableFieldGroup[];
} {
  const errors: string[] = [];
  const data: EditableFieldGroup[] = [];

  if (input === undefined || input === null || input === "") {
    return { errors: [], data: [] };
  }

  if (!Array.isArray(input)) {
    return { errors: ["editing.editableFieldGroups must be an array."], data: [] };
  }

  const attrTypes = new Set(["name", "email", "phone"]);

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!isRecord(item)) {
      errors.push(`editing.editableFieldGroups[${i}] must be an object.`);
      continue;
    }

    const id = String(item.id ?? `group-${i}`).trim() || `group-${i}`;
    const label = String(item.label ?? "").trim() || `Group ${i + 1}`;
    const attrsInput = Array.isArray(item.attributes) ? item.attributes : [];

    if (attrsInput.length === 0) {
      errors.push(`editing.editableFieldGroups[${i}].attributes must have at least one attribute.`);
      continue;
    }

    const attributes: import("@/lib/config/types").EditableFieldGroupAttribute[] = [];
    for (let j = 0; j < attrsInput.length; j++) {
      const a = attrsInput[j];
      if (!isRecord(a)) {
        errors.push(`editing.editableFieldGroups[${i}].attributes[${j}] must be an object.`);
        continue;
      }
      const attribute = String(a.attribute ?? "").trim().toLowerCase();
      if (!attrTypes.has(attribute)) {
        errors.push(`editing.editableFieldGroups[${i}].attributes[${j}].attribute must be "name", "email", or "phone".`);
        continue;
      }
      const fieldKey = String(a.fieldKey ?? "").trim();
      if (!fieldKey) {
        errors.push(`editing.editableFieldGroups[${i}].attributes[${j}].fieldKey is required.`);
        continue;
      }
      const columnId = asOptionalNumber(a.columnId);
      if (columnId === undefined) {
        errors.push(`editing.editableFieldGroups[${i}].attributes[${j}].columnId must be a number.`);
        continue;
      }
      attributes.push({
        attribute: attribute as EditableFieldGroupAttribute["attribute"],
        fieldKey,
        columnId,
      });
    }

    if (attributes.length > 0) {
      data.push({ id, label, attributes });
    }
  }

  return { errors, data };
}

export function validateSourceConfig(input: unknown): ValidationResult<SourceConfig> {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { success: false, errors: ["Source config must be an object."] };
  }

  const id = asTrimmedString(input.id);
  const label = asTrimmedString(input.label);
  const sourceType = asTrimmedString(input.sourceType);
  const smartsheetId = asOptionalNumber(input.smartsheetId);
  const fetchOptionsInput = isRecord(input.fetchOptions) ? input.fetchOptions : {};

  if (!id) {
    errors.push("Source id is required.");
  }
  if (!label) {
    errors.push("Source label is required.");
  }
  if (sourceType !== "sheet" && sourceType !== "report") {
    errors.push('sourceType must be "sheet" or "report".');
  }
  if (smartsheetId === undefined) {
    errors.push("smartsheetId must be a number.");
  }

  const level = asOptionalNumber(fetchOptionsInput.level);
  if (fetchOptionsInput.level !== undefined && level === undefined) {
    errors.push("fetchOptions.level must be a number.");
  }

  return {
    success: errors.length === 0,
    errors,
    data: errors.length
      ? undefined
      : {
          id,
          label,
          sourceType: sourceType as SourceConfig["sourceType"],
          smartsheetId: smartsheetId as number,
          connectionKey: asOptionalString(input.connectionKey),
          apiBaseUrl: asOptionalString(input.apiBaseUrl),
          cacheTtlSeconds: asOptionalNumber(input.cacheTtlSeconds),
          fetchOptions: {
            includeObjectValue: asBoolean(fetchOptionsInput.includeObjectValue, true),
            includeColumnOptions: asBoolean(fetchOptionsInput.includeColumnOptions, true),
            level,
          },
        },
  };
}

export function validateViewConfig(input: unknown, options?: { knownSourceIds?: string[] }): ValidationResult<ViewConfig> {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { success: false, errors: ["View config must be an object."] };
  }

  const id = asTrimmedString(input.id);
  const slug = asTrimmedString(input.slug);
  const sourceId = asTrimmedString(input.sourceId);
  const label = asTrimmedString(input.label);
  const layout = asTrimmedString(input.layout);

  if (!id) {
    errors.push("View id is required.");
  }
  if (!slug) {
    errors.push("View slug is required.");
  }
  if (!sourceId) {
    errors.push("View sourceId is required.");
  }
  if (options?.knownSourceIds?.length && sourceId && !options.knownSourceIds.includes(sourceId)) {
    errors.push(`sourceId \"${sourceId}\" does not match any known source.`);
  }
  if (!label) {
    errors.push("View label is required.");
  }
  if (!LAYOUT_TYPES.includes(layout as LayoutType)) {
    errors.push(`layout must be one of: ${LAYOUT_TYPES.join(", ")}.`);
  }

  const defaultSort: ViewSortConfig[] = [];
  for (const [index, sort] of (Array.isArray(input.defaultSort) ? input.defaultSort : []).entries()) {
    const result = parseSortConfig(sort, index);
    errors.push(...result.errors);
    if (result.data) {
      defaultSort.push(result.data);
    }
  }

  const filters: ViewFilterConfig[] = [];
  for (const [index, filter] of (Array.isArray(input.filters) ? input.filters : []).entries()) {
    const result = parseFilterConfig(filter, index);
    errors.push(...result.errors);
    if (result.data) {
      filters.push(result.data);
    }
  }

  const fields: ViewFieldConfig[] = [];
  for (const [index, field] of (Array.isArray(input.fields) ? input.fields : []).entries()) {
    const result = parseFieldConfig(field, index);
    errors.push(...result.errors);
    if (result.data) {
      fields.push(result.data);
    }
  }

  if (fields.length === 0) {
    errors.push("View must define at least one field.");
  }

  const fieldKeys = new Set(fields.map((field) => field.key));
  const presentationResult = parsePresentationConfig(input.presentation, fieldKeys);
  const styleResult = parseStyleConfig(input.style);
  const editingResult = parseEditingConfig(input.editing);
  errors.push(...presentationResult.errors, ...styleResult.errors, ...editingResult.errors);

  return {
    success: errors.length === 0,
    errors,
    data: errors.length
      ? undefined
      : {
          id,
          slug,
          sourceId,
          label,
          description: asOptionalString(input.description),
          layout: layout as LayoutType,
          public: asBoolean(input.public),
          tabOrder: asOptionalNumber(input.tabOrder),
          filters,
          defaultSort,
          presentation: presentationResult.data,
          style: styleResult.data,
          fixedLayout: asBoolean(input.fixedLayout),
          themePresetId: asOptionalString(input.themePresetId),
          editing: editingResult.data,
          fields,
        },
  };
}
