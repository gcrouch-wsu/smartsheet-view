import {
  getPublicViewsBySlug,
  getSourceConfigById,
  getViewConfigById,
  listPublicPageSummaries,
} from "@/lib/config/store";
import type {
  FieldSourceSelector,
  PublicPageSummary,
  ResolvedPublicPage,
  ResolvedView,
  SmartsheetColumn,
  SmartsheetCell,
  SmartsheetRow,
  SourceConfig,
  ViewConfig,
  ViewFieldConfig,
  ViewFieldSource,
} from "@/lib/config/types";
import { applyViewFilters, sortResolvedRows } from "@/lib/filters";
import { getSmartsheetDataset, normalizeColumnKey } from "@/lib/smartsheet";
import { applyTransforms, buildResolvedFieldValue, normalizeSourceValue } from "@/lib/transforms";
import { humanizeSlug } from "@/lib/utils";

export interface AdminViewPreview {
  viewConfig: ViewConfig;
  sourceConfig: SourceConfig;
  sourceName: string;
  resolvedView: ResolvedView;
  schemaWarnings: string[];
  fetchedAt: string;
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

function resolveField(row: SmartsheetRow, view: ViewConfig, field: ViewFieldConfig) {
  try {
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

function resolveRow(row: SmartsheetRow, view: ViewConfig) {
  const fields = view.fields
    .map((field) => resolveField(row, view, field))
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

export function collectSchemaDriftWarnings(view: ViewConfig, columns: SmartsheetColumn[]) {
  const warnings = new Set<string>();

  for (const field of view.fields) {
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

function resolveView(view: ViewConfig, rows: SmartsheetRow[]): ResolvedView {
  const filteredRows = applyViewFilters(rows, view.filters);
  const resolvedRows = filteredRows
    .map((row) => resolveRow(row, view))
    .filter((row) => row.fields.some((field) => !field.isEmpty || field.textValue));
  const sortedRows = sortResolvedRows(resolvedRows, view.defaultSort);

  return {
    id: view.id,
    label: view.label,
    description: view.description,
    layout: view.layout,
    presentation: view.presentation,
    style: view.style,
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

export async function getPublicPageSummaries(): Promise<PublicPageSummary[]> {
  return listPublicPageSummaries();
}

export async function loadPublicPage(slug: string): Promise<ResolvedPublicPage | null> {
  const views = await getPublicViewsBySlug(slug);
  if (views.length === 0) {
    return null;
  }

  const sourceId = views[0]?.sourceId;
  const sourceConfig = sourceId ? await getSourceConfigById(sourceId) : null;

  if (!sourceConfig) {
    throw new Error(`Source config "${sourceId}" was not found.`);
  }

  const mismatchedSource = views.find((view) => view.sourceId !== sourceConfig.id);
  if (mismatchedSource) {
    throw new Error(`All public views for slug "${slug}" must share the same source.`);
  }

  const dataset = await getSmartsheetDataset(sourceConfig);

  for (const view of views) {
    logSchemaDriftWarnings(slug, view.id, collectSchemaDriftWarnings(view, dataset.columns));
  }

  const resolvedViews = views.map((view) => resolveView(view, dataset.rows));

  return {
    slug,
    title: humanizeSlug(slug),
    source: {
      id: sourceConfig.id,
      label: sourceConfig.label,
      name: dataset.name,
      sourceType: sourceConfig.sourceType,
    },
    views: resolvedViews,
    defaultViewId: resolvedViews[0]?.id ?? "",
    fetchedAt: dataset.fetchedAt,
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
  const schemaWarnings = collectSchemaDriftWarnings(viewConfig, dataset.columns);
  return {
    viewConfig,
    sourceConfig,
    sourceName: dataset.name,
    resolvedView: resolveView(viewConfig, dataset.rows),
    schemaWarnings,
    fetchedAt: dataset.fetchedAt,
  };
}
