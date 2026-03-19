import type {
  SmartsheetCell,
  SmartsheetColumn,
  SmartsheetDataset,
  SmartsheetRow,
  SourceConfig,
} from "@/lib/config/types";

const DEFAULT_API_BASE_URL = "https://api.smartsheet.com/2.0";

interface ConnectionConfig {
  token: string;
  apiBaseUrl: string;
}

interface SmartsheetApiColumn {
  id: number;
  index: number;
  title: string;
  type?: string;
  columnType?: string;
  options?: string[];
  locked?: boolean;
}

interface SmartsheetApiRow {
  id: number;
  sheetId?: number;
  cells?: Array<{
    columnId: number;
    value?: unknown;
    displayValue?: string;
    objectValue?: unknown;
  }>;
}

interface SmartsheetApiResponse {
  id: number;
  name: string;
  columns?: SmartsheetApiColumn[];
  rows?: SmartsheetApiRow[];
}

export interface SmartsheetSchemaSummary {
  sourceType: SourceConfig["sourceType"];
  id: number;
  name: string;
  columns: SmartsheetColumn[];
  rowCount: number;
}

interface EffectiveFetchOptions {
  includeObjectValue?: boolean;
  includeColumnOptions?: boolean;
  level?: number;
}

export interface FetchBehaviorOptions {
  fresh?: boolean;
  fetchOptionsOverride?: Partial<SourceConfig["fetchOptions"]>;
}

export class SmartsheetRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `Smartsheet request failed with HTTP ${status}`);
    this.name = "SmartsheetRequestError";
    this.status = status;
    this.body = body;
  }
}

function parseConnectionsEnv() {
  const raw = process.env.SMARTSHEET_CONNECTIONS_JSON?.trim();
  if (!raw) {
    return new Map<string, ConnectionConfig>();
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string | { token: string; apiBaseUrl?: string }>;
    return new Map(
      Object.entries(parsed).flatMap(([key, value]) => {
        if (typeof value === "string") {
          return [[key, { token: value, apiBaseUrl: DEFAULT_API_BASE_URL } satisfies ConnectionConfig]];
        }
        if (!value?.token) {
          return [];
        }
        return [
          [
            key,
            {
              token: value.token,
              apiBaseUrl: value.apiBaseUrl?.trim() || DEFAULT_API_BASE_URL,
            } satisfies ConnectionConfig,
          ],
        ];
      })
    );
  } catch (error) {
    throw new Error(
      `SMARTSHEET_CONNECTIONS_JSON is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function listConfiguredConnectionKeys() {
  const keys = [...parseConnectionsEnv().keys()];
  if (process.env.SMARTSHEET_API_TOKEN?.trim() && !keys.includes("default")) {
    keys.unshift("default");
  }
  return keys.length > 0 ? keys : ["default"];
}

export function hasConfiguredConnection() {
  return Boolean(process.env.SMARTSHEET_API_TOKEN?.trim() || process.env.SMARTSHEET_CONNECTIONS_JSON?.trim());
}

export function normalizeColumnKey(value: string) {
  return value.trim().toLowerCase();
}

function resolveConnection(connectionKey = "default", sourceApiBaseUrl?: string): ConnectionConfig {
  const namedConnections = parseConnectionsEnv();
  const named = namedConnections.get(connectionKey);
  if (named) {
    return {
      token: named.token,
      apiBaseUrl: sourceApiBaseUrl?.trim() || named.apiBaseUrl,
    };
  }

  const token = process.env.SMARTSHEET_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "No Smartsheet API token is configured. Set SMARTSHEET_API_TOKEN or SMARTSHEET_CONNECTIONS_JSON."
    );
  }

  return {
    token,
    apiBaseUrl: sourceApiBaseUrl?.trim() || process.env.SMARTSHEET_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL,
  };
}

function resolveFetchOptions(source: SourceConfig, options?: FetchBehaviorOptions): EffectiveFetchOptions {
  return {
    includeObjectValue: options?.fetchOptionsOverride?.includeObjectValue ?? source.fetchOptions?.includeObjectValue,
    includeColumnOptions:
      options?.fetchOptionsOverride?.includeColumnOptions ?? source.fetchOptions?.includeColumnOptions,
    level: options?.fetchOptionsOverride?.level ?? source.fetchOptions?.level,
  };
}

function buildIncludeList(fetchOptions: EffectiveFetchOptions) {
  const includes = new Set<string>(["columnType"]);
  if (fetchOptions.includeColumnOptions !== false) {
    includes.add("columnOptions");
  }
  if (fetchOptions.includeObjectValue !== false) {
    includes.add("objectValue");
  }
  return [...includes];
}

function normalizeColumns(columns: SmartsheetApiColumn[]): SmartsheetColumn[] {
  return columns.map((column) => ({
    id: column.id,
    index: column.index,
    title: column.title,
    type: column.type ?? column.columnType ?? "TEXT_NUMBER",
    options: column.options,
    locked: column.locked,
  }));
}

function normalizeRows(rows: SmartsheetApiRow[], columns: SmartsheetColumn[]): SmartsheetRow[] {
  const columnsById = new Map(columns.map((column) => [column.id, column]));

  return rows.map((row) => {
    const cellsById: Record<number, SmartsheetCell> = {};
    const cellsByTitle: Record<string, SmartsheetCell> = {};

    for (const cell of row.cells ?? []) {
      const column = columnsById.get(cell.columnId);
      if (!column) {
        continue;
      }

      const normalizedCell: SmartsheetCell = {
        columnId: column.id,
        columnTitle: column.title,
        columnType: column.type,
        value: cell.value,
        displayValue: cell.displayValue,
        objectValue: cell.objectValue,
      };

      cellsById[column.id] = normalizedCell;
      cellsByTitle[normalizeColumnKey(column.title)] = normalizedCell;
    }

    return {
      id: row.id,
      sheetId: row.sheetId,
      cellsById,
      cellsByTitle,
    };
  });
}

async function fetchSmartsheetSource<T>(
  endpointPath: string,
  source: SourceConfig,
  revalidateSeconds: number,
  options?: FetchBehaviorOptions,
) {
  const { token, apiBaseUrl } = resolveConnection(source.connectionKey, source.apiBaseUrl);
  const url = new URL(`${apiBaseUrl.replace(/\/$/, "")}/${endpointPath.replace(/^\//, "")}`);
  const fetchOptions = resolveFetchOptions(source, options);
  url.searchParams.set("include", buildIncludeList(fetchOptions).join(","));

  if (fetchOptions.level) {
    url.searchParams.set("level", String(fetchOptions.level));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: revalidateSeconds > 0 ? "force-cache" : "no-store",
    next: revalidateSeconds > 0 ? { revalidate: revalidateSeconds } : { revalidate: 0 },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SmartsheetRequestError(response.status, body);
  }

  return (await response.json()) as T;
}

async function fetchCurrentUser(connection: ConnectionConfig) {
  return fetch(`${connection.apiBaseUrl.replace(/\/$/, "")}/users/me`, {
    headers: { Authorization: `Bearer ${connection.token}` },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 60 },
  } as RequestInit);
}

function resolveRevalidateSeconds(source: SourceConfig, options?: FetchBehaviorOptions) {
  return options?.fresh ? 0 : source.cacheTtlSeconds ?? 120;
}

export async function getSmartsheetSchema(source: SourceConfig, options?: FetchBehaviorOptions): Promise<SmartsheetSchemaSummary> {
  const response = await fetchSmartsheetSource<SmartsheetApiResponse>(
    `${source.sourceType === "report" ? "reports" : "sheets"}/${source.smartsheetId}`,
    source,
    resolveRevalidateSeconds(source, options),
    options,
  );
  const columns = normalizeColumns(response.columns ?? []);

  return {
    sourceType: source.sourceType,
    id: response.id,
    name: response.name,
    columns,
    rowCount: response.rows?.length ?? 0,
  };
}

export async function getSmartsheetDataset(source: SourceConfig, options?: FetchBehaviorOptions) {
  return buildDataset(source, resolveRevalidateSeconds(source, options), options);
}

async function buildDataset(
  source: SourceConfig,
  revalidateSeconds: number,
  options?: FetchBehaviorOptions,
): Promise<SmartsheetDataset> {
  const response = await fetchSmartsheetSource<SmartsheetApiResponse>(
    `${source.sourceType === "report" ? "reports" : "sheets"}/${source.smartsheetId}`,
    source,
    revalidateSeconds,
    options,
  );
  const columns = normalizeColumns(response.columns ?? []);
  const rows = normalizeRows(response.rows ?? [], columns);

  return {
    sourceType: source.sourceType,
    id: response.id,
    name: response.name,
    columns,
    rows,
    fetchedAt: new Date().toISOString(),
  };
}

export async function updateSmartsheetRow(
  source: SourceConfig,
  sheetId: number,
  rowId: number,
  cells: Array<{ columnId: number; value?: unknown; objectValue?: unknown }>
) {
  const { token, apiBaseUrl } = resolveConnection(source.connectionKey, source.apiBaseUrl);
  const url = `${apiBaseUrl.replace(/\/$/, "")}/sheets/${sheetId}/rows`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify([
      {
        id: rowId,
        cells,
      },
    ]),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SmartsheetRequestError(response.status, body);
  }
}

export async function testSourceConnection(source: SourceConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const connection = resolveConnection(source.connectionKey, source.apiBaseUrl);
    const response = await fetchCurrentUser(connection);
    if (!response.ok) {
      return { ok: false, error: `Smartsheet returned HTTP ${response.status}.` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Verifies that the default Smartsheet connection can reach the API.
 * Returns true if the token is valid, false otherwise (never throws).
 * Result is cached for 60 seconds so the home page status indicator
 * does not make a live API call on every request.
 */
export async function testSmartsheetConnection(): Promise<boolean> {
  if (!hasConfiguredConnection()) {
    return false;
  }
  try {
    let conn: ConnectionConfig;
    try {
      conn = resolveConnection();
    } catch {
      const named = parseConnectionsEnv();
      const first = named.values().next().value as ConnectionConfig | undefined;
      if (!first) return false;
      conn = first;
    }
    const response = await fetchCurrentUser(conn);
    return response.ok;
  } catch {
    return false;
  }
}
