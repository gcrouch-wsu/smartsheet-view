import type {
  ResolvedViewRow,
  SmartsheetCell,
  SmartsheetRow,
  ViewFilterConfig,
  ViewSortConfig,
} from "@/lib/config/types";
import { normalizeColumnKey } from "@/lib/smartsheet";

function normalizeComparable(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeComparable(entry));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // For Smartsheet contact objects, extract only email and name — not the objectType
    // metadata string. Without this, filters like contains:"contact" would accidentally
    // match any CONTACT_LIST column.
    if (obj.objectType === "CONTACT") {
      return [
        typeof obj.email === "string" ? obj.email.trim() : "",
        typeof obj.name === "string" ? obj.name.trim() : "",
      ].filter(Boolean);
    }
    if (obj.objectType === "MULTI_CONTACT") {
      const entries = Array.isArray(obj.values) ? obj.values : Array.isArray(obj.value) ? obj.value : [];
      return entries.flatMap((entry) => normalizeComparable(entry));
    }
    return Object.values(obj).flatMap((entry) => normalizeComparable(entry));
  }
  return [String(value).trim()].filter(Boolean);
}

function getRowCell(row: SmartsheetRow, filter: ViewFilterConfig): SmartsheetCell | null {
  if (typeof filter.columnId === "number") {
    return row.cellsById[filter.columnId] ?? null;
  }
  if (filter.columnTitle) {
    return row.cellsByTitle[normalizeColumnKey(filter.columnTitle)] ?? null;
  }
  return null;
}

function getCellValues(cell: SmartsheetCell | null) {
  if (!cell) {
    return [];
  }
  const values = normalizeComparable([cell.objectValue, cell.value, cell.displayValue]);
  return [...new Set(values.map((value) => value.toLowerCase()))];
}

function normalizeFilterValues(value: ViewFilterConfig["value"]) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
  }
  if (value === undefined || value === null) {
    return [];
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized ? [normalized] : [];
}

function matchesFilter(row: SmartsheetRow, filter: ViewFilterConfig) {
  const cellValues = getCellValues(getRowCell(row, filter));
  const expectedValues = normalizeFilterValues(filter.value);

  switch (filter.op) {
    case "equals":
      return expectedValues.length === 0 ? cellValues.length === 0 : cellValues.some((value) => expectedValues.includes(value));
    case "not_equals":
      return expectedValues.every((expected) => !cellValues.includes(expected));
    case "contains":
      return expectedValues.some((expected) => cellValues.some((value) => value.includes(expected)));
    case "not_contains":
      return expectedValues.every((expected) => cellValues.every((value) => !value.includes(expected)));
    case "in":
      return cellValues.some((value) => expectedValues.includes(value));
    case "not_in":
      return cellValues.every((value) => !expectedValues.includes(value));
    case "is_empty":
      return cellValues.length === 0;
    case "not_empty":
      return cellValues.length > 0;
    default:
      return true;
  }
}

export function applyViewFilters(rows: SmartsheetRow[], filters?: ViewFilterConfig[]) {
  if (!filters?.length) {
    return rows;
  }
  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter)));
}

function getSortValue(row: ResolvedViewRow, fieldKey: string) {
  const field = row.fieldMap[fieldKey];
  return (field?.sortValue ?? field?.textValue)?.trim().toLowerCase() ?? "";
}

export function sortResolvedRows(rows: ResolvedViewRow[], sorts?: ViewSortConfig[]) {
  if (!sorts?.length) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const sort of sorts) {
      const leftValue = getSortValue(left, sort.field);
      const rightValue = getSortValue(right, sort.field);

      if (leftValue === rightValue) {
        continue;
      }

      const result = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      return sort.direction === "desc" ? result * -1 : result;
    }

    // Stable tiebreaker: preserve deterministic order when all sort keys are equal.
    return left.id - right.id;
  });
}
