import {
  getPublicViewsBySlug,
  getSourceConfigById,
  getViewConfigById,
  listPublicPageSummaries,
} from "@/lib/config/store";
import type {
  FieldSourceSelector,
  PublicPageSummary,
  ResolvedPersonRoleEntry,
  ResolvedPublicPage,
  ResolvedView,
  SmartsheetColumn,
  SmartsheetCell,
  SmartsheetRow,
  SourceConfig,
  SourceRoleGroupConfig,
  ViewConfig,
  ViewFieldConfig,
  ViewFieldSource,
} from "@/lib/config/types";
import { applyViewFilters, sortResolvedRows } from "@/lib/filters";
import type { FetchBehaviorOptions } from "@/lib/smartsheet";
import { getSmartsheetDataset, normalizeColumnKey } from "@/lib/smartsheet";
import { isRoleGroupFieldSource, isUnsafeDelimitedRoleGroup } from "@/lib/role-groups";
import {
  applyTransforms,
  buildResolvedFieldValue,
  buildResolvedPeopleGroupField,
  normalizeSourceValue,
  normalizedValueToPlainText,
} from "@/lib/transforms";
import { humanizeSlug } from "@/lib/utils";

export interface AdminViewPreview {
  viewConfig: ViewConfig;
  sourceConfig: SourceConfig;
  sourceName: string;
  resolvedView: ResolvedView;
  schemaWarnings: string[];
  fetchedAt: string;
}

export interface LoadedPublicPageState {
  slug: string;
  title: string;
  sourceConfig: SourceConfig;
  sourceName: string;
  viewConfigs: ViewConfig[];
  resolvedViews: ResolvedView[];
  defaultViewId: string;
  fetchedAt: string;
}

export interface PublicViewCollection {
  slug: string;
  title: string;
  sourceConfig: SourceConfig;
  viewConfigs: ViewConfig[];
  defaultViewId: string;
}

function resolveSelector(row: SmartsheetRow, selector: FieldSourceSelector): SmartsheetCell | null {
  if (typeof selector.columnId === "number") {
    return row.cellsById[selector.columnId] ?? null;
  }

  if (selector.columnTitle) {
    return row.cellsByTitle[normalizeColumnKey(selector.columnTitle)] ?? null;
  }

  return null;
}

function cellHasValue(cell: SmartsheetCell | null) {
  if (!cell) {
    return false;
  }

  return Boolean(
    cell.displayValue?.trim() ||
      (typeof cell.value === "string" ? cell.value.trim() : cell.value) ||
      cell.objectValue
  );
}

function buildFieldSelectors(source: ViewFieldSource): FieldSourceSelector[] {
  return [
    {
      columnId: source.preferredColumnId,
      columnTitle: source.preferredColumnTitle,
    },
    ...(source.coalesce ?? []),
    {
      columnId: source.columnId,
      columnTitle: source.columnTitle,
    },
    {
      columnId: source.fallbackColumnId,
      columnTitle: source.fallbackColumnTitle,
    },
  ].filter((selector) => typeof selector.columnId === "number" || Boolean(selector.columnTitle));
}

function resolveSourceCell(row: SmartsheetRow, source: ViewFieldSource) {
  const selectors = buildFieldSelectors(source);
  let firstFound: SmartsheetCell | null = null;

  for (const selector of selectors) {
    const candidate = resolveSelector(row, selector);
    if (!firstFound && candidate) {
      firstFound = candidate;
    }
    if (cellHasValue(candidate)) {
      return candidate;
    }
  }

  return firstFound;
}

function buildEmptyResolvedField(field: ViewFieldConfig) {
  return buildResolvedFieldValue(field, null);
}

function getRoleGroupConfig(sourceConfig: SourceConfig | undefined, roleGroupId: string): SourceRoleGroupConfig | null {
  const groups = sourceConfig?.roleGroups;
  if (!groups?.length) {
    return null;
  }
  return groups.find((g) => g.id === roleGroupId) ?? null;
}

function resolveCellPlainText(row: SmartsheetRow, selector: FieldSourceSelector | undefined): string {
  if (!selector) {
    return "";
  }
  const cell = resolveSelector(row, selector);
  const normalized = normalizeSourceValue(cell);
  return normalizedValueToPlainText(normalized).trim();
}

function resolveNumberedRoleGroupPeople(row: SmartsheetRow, group: SourceRoleGroupConfig): ResolvedPersonRoleEntry[] {
  const slots = group.slots ?? [];
  return slots.map((slotDef) => {
    const name = slotDef.name ? resolveCellPlainText(row, slotDef.name) : "";
    const email = slotDef.email ? resolveCellPlainText(row, slotDef.email) : "";
    const phone = slotDef.phone ? resolveCellPlainText(row, slotDef.phone) : "";
    const hasAttr = Boolean(slotDef.name || slotDef.email || slotDef.phone);
    const anyValue = [slotDef.name ? name : "", slotDef.email ? email : "", slotDef.phone ? phone : ""].some((s) =>
      s.trim(),
    );
    const isEmpty = !hasAttr || !anyValue;
    const entry: ResolvedPersonRoleEntry = {
      slot: slotDef.slot,
      isEmpty,
    };
    if (name.trim()) {
      entry.name = name.trim();
    }
    if (email.trim()) {
      entry.email = email.trim();
    }
    if (phone.trim()) {
      entry.phone = phone.trim();
    }
    return entry;
  });
}

function resolveDelimitedParallelRoleGroup(row: SmartsheetRow, group: SourceRoleGroupConfig): ResolvedPersonRoleEntry[] {
  const d = group.delimited;
  if (!d) {
    return [];
  }
  type Part = { attr: "name" | "email" | "phone"; tokens: string[] };
  const parts: Part[] = [];
  for (const attr of ["name", "email", "phone"] as const) {
    const cfg = d[attr];
    if (!cfg?.source) {
      continue;
    }
    const cell = resolveSelector(row, cfg.source);
    const normalized = normalizeSourceValue(cell);
    const raw = normalizedValueToPlainText(normalized);
    const delims = cfg.delimiters?.length ? cfg.delimiters : [",", ";", "\n"];
    const tokens = delims
      .reduce<string[]>((segments, delimiter) => segments.flatMap((s) => s.split(delimiter)), [raw])
      .map((s) => s.trim())
      .filter(Boolean);
    parts.push({ attr, tokens });
  }
  if (parts.length === 0) {
    return [];
  }
  const maxLen = Math.max(...parts.map((p) => p.tokens.length));
  const people: ResolvedPersonRoleEntry[] = [];
  for (let i = 0; i < maxLen; i++) {
    const name = parts.find((p) => p.attr === "name")?.tokens[i]?.trim() ?? "";
    const email = parts.find((p) => p.attr === "email")?.tokens[i]?.trim() ?? "";
    const phone = parts.find((p) => p.attr === "phone")?.tokens[i]?.trim() ?? "";
    const isEmpty = !name && !email && !phone;
    people.push({
      slot: String(i + 1),
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      isEmpty,
    });
  }
  return people;
}

function resolveRoleGroupField(row: SmartsheetRow, view: ViewConfig, field: ViewFieldConfig, sourceConfig: SourceConfig) {
  if (!isRoleGroupFieldSource(field.source)) {
    return buildEmptyResolvedField(field);
  }
  const rg = getRoleGroupConfig(sourceConfig, field.source.roleGroupId);
  if (!rg) {
    return buildEmptyResolvedField(field);
  }
  try {
    if (rg.mode === "numbered_slots") {
      const people = resolveNumberedRoleGroupPeople(row, rg);
      return buildResolvedPeopleGroupField(field, people, {
        roleGroupReadOnly: false,
      });
    }
    const unsafe = isUnsafeDelimitedRoleGroup(rg);
    const people = resolveDelimitedParallelRoleGroup(row, rg);
    return buildResolvedPeopleGroupField(field, people, {
      roleGroupReadOnly: unsafe,
    });
  } catch (error) {
    console.error(
      `[smartsheets_view] Failed to resolve role group field "${field.key}" for view "${view.id}" row "${row.id}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return buildEmptyResolvedField(field);
  }
}

function resolveField(row: SmartsheetRow, view: ViewConfig, field: ViewFieldConfig, sourceConfig: SourceConfig) {
  try {
    if (isRoleGroupFieldSource(field.source)) {
      return resolveRoleGroupField(row, view, field, sourceConfig);
    }
    const sourceCell = resolveSourceCell(row, field.source);
    const normalizedSourceValue = normalizeSourceValue(sourceCell);
    const transformedValue = applyTransforms(normalizedSourceValue, field.transforms, {
      row,
      sourceCell,
    });

    return buildResolvedFieldValue(field, transformedValue);
  } catch (error) {
    console.error(
      `[smartsheets_view] Failed to resolve field "${field.key}" for view "${view.id}" row "${row.id}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return buildEmptyResolvedField(field);
  }
}

function resolveRow(row: SmartsheetRow, view: ViewConfig, sourceConfig: SourceConfig) {
  const fields = view.fields
    .map((field) => resolveField(row, view, field, sourceConfig))
    .filter((field) => field.renderType !== "hidden");

  const fieldMap = fields.reduce<Record<string, (typeof fields)[number]>>((map, field) => {
    map[field.key] = field;
    return map;
  }, {});

  return {
    id: row.id,
    fields,
    fieldMap,
  };
}

function selectorExists(selector: FieldSourceSelector, columns: SmartsheetColumn[]) {
  if (typeof selector.columnId === "number") {
    return columns.some((column) => column.id === selector.columnId);
  }

  if (selector.columnTitle) {
    const normalizedTitle = normalizeColumnKey(selector.columnTitle);
    return columns.some((column) => normalizeColumnKey(column.title) === normalizedTitle);
  }

  return false;
}

function describeSelector(selector: FieldSourceSelector) {
  if (selector.columnTitle) {
    return `"${selector.columnTitle}"`;
  }
  if (typeof selector.columnId === "number") {
    return `column ${selector.columnId}`;
  }
  return "unknown selector";
}

export function collectSelectorsFromRoleGroup(group: SourceRoleGroupConfig): FieldSourceSelector[] {
  const out: FieldSourceSelector[] = [];
  if (group.mode === "numbered_slots") {
    for (const slot of group.slots ?? []) {
      if (slot.name) {
        out.push(slot.name);
      }
      if (slot.email) {
        out.push(slot.email);
      }
      if (slot.phone) {
        out.push(slot.phone);
      }
    }
    return out;
  }
  const d = group.delimited;
  if (!d) {
    return out;
  }
  for (const key of ["name", "email", "phone"] as const) {
    const src = d[key]?.source;
    if (src) {
      out.push(src);
    }
  }
  return out;
}

export function collectSchemaDriftWarnings(view: ViewConfig, columns: SmartsheetColumn[], sourceConfig?: SourceConfig) {
  const warnings = new Set<string>();

  for (const field of view.fields) {
    if (isRoleGroupFieldSource(field.source)) {
      const rg = getRoleGroupConfig(sourceConfig, field.source.roleGroupId);
      if (!rg) {
        warnings.add(`field "${field.key}" references unknown role group "${field.source.roleGroupId}"`);
        continue;
      }
      const selectors = collectSelectorsFromRoleGroup(rg);
      const missingSelectors = selectors.filter((selector) => !selectorExists(selector, columns));
      if (missingSelectors.length === selectors.length && selectors.length > 0) {
        warnings.add(`field "${field.key}" (role group "${rg.id}") does not match any current column in the source schema`);
      } else if (missingSelectors.length > 0) {
        const missingLabels = [...new Set(missingSelectors.map((selector) => describeSelector(selector)))];
        warnings.add(`field "${field.key}" (role group "${rg.id}") is missing source columns: ${missingLabels.join(", ")}`);
      }
      continue;
    }
    const selectors = buildFieldSelectors(field.source);
    if (selectors.length > 0 && selectors.every((selector) => !selectorExists(selector, columns))) {
      warnings.add(`field "${field.key}" does not match any current column in the source schema`);
    }
  }

  for (const filter of view.filters ?? []) {
    const selector: FieldSourceSelector = {
      columnId: filter.columnId,
      columnTitle: filter.columnTitle,
    };

    if ((typeof selector.columnId === "number" || selector.columnTitle) && !selectorExists(selector, columns)) {
      warnings.add(`filter "${filter.columnTitle ?? filter.columnId}" does not match any current column in the source schema`);
    }
  }

  return [...warnings];
}

function logSchemaDriftWarnings(slug: string, viewId: string, warnings: string[]) {
  if (warnings.length === 0) {
    return;
  }

  console.warn(
    `[smartsheets_view] Schema drift for slug "${slug}" view "${viewId}": ${warnings.join("; ")}`
  );
}

function resolveView(view: ViewConfig, rows: SmartsheetRow[], sourceConfig: SourceConfig): ResolvedView {
  const filteredRows = applyViewFilters(rows, view.filters);
  const resolvedRows = filteredRows
    .map((row) => resolveRow(row, view, sourceConfig))
    .filter((row) => row.fields.some((field) => !field.isEmpty || field.textValue));
  const sortedRows = sortResolvedRows(resolvedRows, view.defaultSort);

  return {
    id: view.id,
    label: view.label,
    description: view.description,
    layout: view.layout,
    presentation: view.presentation,
    style: view.style,
    themePresetId: view.themePresetId,
    fixedLayout: view.fixedLayout,
    rowCount: sortedRows.length,
    fields: view.fields
      .filter((field) => field.render.type !== "hidden")
      .map((field) => ({
        key: field.key,
        label: field.label,
        renderType: field.render.type,
        description: field.description,
      })),
    rows: sortedRows,
  };
}

function filterCompatibleViews(views: ViewConfig[], sourceConfig: SourceConfig, slug: string) {
  const compatibleViews = views.filter((view) => view.sourceId === sourceConfig.id);

  if (compatibleViews.length < views.length) {
    console.warn(
      `[smartsheets_view] Slug "${slug}" contains views with different sources. Only views for source "${sourceConfig.id}" will be shown.`
    );
  }

  return compatibleViews;
}

export function resolveRequestedViewConfig(viewConfigs: ViewConfig[], requestedViewId?: string | null) {
  return (
    viewConfigs.find((view) => view.id === requestedViewId) ??
    viewConfigs[0] ??
    null
  );
}

export function resolveRequestedResolvedView(
  resolvedViews: ResolvedView[],
  defaultViewId: string,
  requestedViewId?: string | null,
) {
  return (
    resolvedViews.find((view) => view.id === requestedViewId) ??
    resolvedViews.find((view) => view.id === defaultViewId) ??
    resolvedViews[0] ??
    null
  );
}

export async function loadPublicViewCollection(
  slug: string,
  options?: { includePrivate?: boolean },
): Promise<PublicViewCollection | null> {
  const views = await getPublicViewsBySlug(slug, options);
  if (views.length === 0) {
    return null;
  }

  const sourceId = views[0]?.sourceId;
  const sourceConfig = sourceId ? await getSourceConfigById(sourceId) : null;

  if (!sourceConfig) {
    throw new Error(`The data source for this view ("${sourceId}") could not be found or is no longer registered.`);
  }

  const compatibleViews = filterCompatibleViews(views, sourceConfig, slug);

  return {
    slug,
    title: humanizeSlug(slug),
    sourceConfig,
    viewConfigs: compatibleViews,
    defaultViewId: compatibleViews[0]?.id ?? "",
  };
}

export async function loadPublicPageState(
  slug: string,
  options?: { includePrivate?: boolean; datasetOptions?: FetchBehaviorOptions },
): Promise<LoadedPublicPageState | null> {
  const collection = await loadPublicViewCollection(slug, options);
  if (!collection) {
    return null;
  }

  const dataset = await getSmartsheetDataset(collection.sourceConfig, options?.datasetOptions);

  for (const view of collection.viewConfigs) {
    logSchemaDriftWarnings(slug, view.id, collectSchemaDriftWarnings(view, dataset.columns, collection.sourceConfig));
  }

  return {
    ...collection,
    sourceName: dataset.name,
    resolvedViews: collection.viewConfigs.map((view) => resolveView(view, dataset.rows, collection.sourceConfig)),
    fetchedAt: dataset.fetchedAt,
  };
}

export async function getPublicPageSummaries(): Promise<PublicPageSummary[]> {
  return listPublicPageSummaries();
}

export async function loadPublicPage(slug: string, options?: { includePrivate?: boolean }): Promise<ResolvedPublicPage | null> {
  const state = await loadPublicPageState(slug, options);
  if (!state) {
    return null;
  }

  return {
    slug: state.slug,
    title: state.title,
    source: {
      id: state.sourceConfig.id,
      label: state.sourceConfig.label,
      name: state.sourceName,
      sourceType: state.sourceConfig.sourceType,
    },
    views: state.resolvedViews,
    defaultViewId: state.defaultViewId,
    fetchedAt: state.fetchedAt,
  };
}

export async function loadAdminViewPreview(viewId: string): Promise<AdminViewPreview | null> {
  const viewConfig = await getViewConfigById(viewId);
  if (!viewConfig) {
    return null;
  }

  const sourceConfig = await getSourceConfigById(viewConfig.sourceId);
  if (!sourceConfig) {
    throw new Error(`Source config "${viewConfig.sourceId}" was not found.`);
  }

  const dataset = await getSmartsheetDataset(sourceConfig, { fresh: true });
  const schemaWarnings = collectSchemaDriftWarnings(viewConfig, dataset.columns, sourceConfig);
  return {
    viewConfig,
    sourceConfig,
    sourceName: dataset.name,
    resolvedView: resolveView(viewConfig, dataset.rows, sourceConfig),
    schemaWarnings,
    fetchedAt: dataset.fetchedAt,
  };
}

export interface PreviewFromConfigResult {
  rows: ResolvedView["rows"];
  fields: ResolvedView["fields"];
  warnings: string[];
  rowCount: number;
  resolvedView: ResolvedView;
}

export async function resolvePreviewFromConfig(viewConfig: ViewConfig): Promise<PreviewFromConfigResult> {
  const sourceConfig = await getSourceConfigById(viewConfig.sourceId);
  if (!sourceConfig) {
    throw new Error(`Source config "${viewConfig.sourceId}" was not found.`);
  }

  const dataset = await getSmartsheetDataset(sourceConfig, { fresh: true });
  const warnings = collectSchemaDriftWarnings(viewConfig, dataset.columns, sourceConfig);
  const resolvedView = resolveView(viewConfig, dataset.rows, sourceConfig);

  return {
    rows: resolvedView.rows,
    fields: resolvedView.fields,
    warnings,
    rowCount: resolvedView.rowCount,
    resolvedView,
  };
}
