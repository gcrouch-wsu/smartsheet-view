import { Pool } from "pg";
import type { PublicPageSummary, SourceConfig, ViewConfig } from "@/lib/config/types";
import { humanizeSlug } from "@/lib/utils";
import { validateSourceConfig, validateViewConfig } from "@/lib/config/validation";

const DATABASE_URL_ENV_VAR = "DATABASE_URL";

const globalForDb = globalThis as unknown as { __smartsheetsViewConfigPool?: Pool };

function getDatabaseUrl(): string | null {
  return process.env[DATABASE_URL_ENV_VAR]?.trim() ?? null;
}

function getPool(): Pool {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(`${DATABASE_URL_ENV_VAR} is required for database config storage.`);
  }
  if (!globalForDb.__smartsheetsViewConfigPool) {
    const connectionString =
      url.replace(/([?&])sslmode=[^&]*/g, (_, p) => (p === "?" ? "?" : "")).replace(/\?$/, "") +
      (url.includes("?") ? "&" : "?") +
      "sslmode=no-verify";
    globalForDb.__smartsheetsViewConfigPool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalForDb.__smartsheetsViewConfigPool;
}

export async function queryConfigDb<T = unknown>(text: string, params?: readonly unknown[]) {
  const result = await getPool().query(text, params as unknown[]);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

let ensureTablesPromise: Promise<void> | null = null;

export async function ensureConfigTables() {
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await queryConfigDb(`
        CREATE TABLE IF NOT EXISTS config_sources (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
      await queryConfigDb(`
        CREATE TABLE IF NOT EXISTS config_views (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
      await queryConfigDb(`
        CREATE TABLE IF NOT EXISTS contributor_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await queryConfigDb(`
        CREATE INDEX IF NOT EXISTS idx_contributor_users_email
        ON contributor_users(email)
      `);
      await queryConfigDb(`
        ALTER TABLE contributor_users ADD COLUMN IF NOT EXISTS reset_nonce TEXT
      `);
      await queryConfigDb(`
        CREATE TABLE IF NOT EXISTS contributor_login_attempts (
          ip TEXT NOT NULL,
          attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await queryConfigDb(`
        CREATE INDEX IF NOT EXISTS idx_contributor_login_attempts_ip_at
        ON contributor_login_attempts(ip, attempted_at)
      `);
      await queryConfigDb(`ALTER TABLE config_sources ENABLE ROW LEVEL SECURITY`);
      await queryConfigDb(`ALTER TABLE config_views ENABLE ROW LEVEL SECURITY`);
      await queryConfigDb(`ALTER TABLE contributor_users ENABLE ROW LEVEL SECURITY`);
      await queryConfigDb(`ALTER TABLE contributor_login_attempts ENABLE ROW LEVEL SECURITY`);
    })().catch((err) => {
      ensureTablesPromise = null;
      throw err;
    });
  }
  await ensureTablesPromise;
}

function parseSourceConfig(value: unknown, id: string): SourceConfig {
  const result = validateSourceConfig(value);
  if (!result.success || !result.data) {
    throw new Error(`Invalid source config ${id}: ${result.errors.join(" ")}`);
  }
  return result.data;
}

function parseViewConfig(value: unknown, id: string, knownSourceIds: string[]): ViewConfig {
  const result = validateViewConfig(value, { knownSourceIds });
  if (!result.success || !result.data) {
    throw new Error(`Invalid view config ${id}: ${result.errors.join(" ")}`);
  }
  return result.data;
}

export async function listSourceConfigs(): Promise<SourceConfig[]> {
  await ensureConfigTables();
  const { rows } = await queryConfigDb<{ id: string; data: unknown }>("SELECT id, data FROM config_sources ORDER BY id");
  return rows.map((row) => parseSourceConfig(row.data, row.id));
}

export async function listViewConfigs(): Promise<ViewConfig[]> {
  const sources = await listSourceConfigs();
  const knownSourceIds = sources.map((s) => s.id);
  await ensureConfigTables();
  const { rows } = await queryConfigDb<{ id: string; data: unknown }>("SELECT id, data FROM config_views ORDER BY id");
  return rows.map((row) => parseViewConfig(row.data, row.id, knownSourceIds));
}

export async function getSourceConfigById(sourceId: string): Promise<SourceConfig | null> {
  await ensureConfigTables();
  const { rows } = await queryConfigDb<{ id: string; data: unknown }>("SELECT id, data FROM config_sources WHERE id = $1", [
    sourceId,
  ]);
  const row = rows[0];
  return row ? parseSourceConfig(row.data, row.id) : null;
}

export async function getViewConfigById(viewId: string): Promise<ViewConfig | null> {
  const sources = await listSourceConfigs();
  const knownSourceIds = sources.map((s) => s.id);
  await ensureConfigTables();
  const { rows } = await queryConfigDb<{ id: string; data: unknown }>("SELECT id, data FROM config_views WHERE id = $1", [
    viewId,
  ]);
  const row = rows[0];
  return row ? parseViewConfig(row.data, row.id, knownSourceIds) : null;
}

export async function getPublicViewsBySlug(slug: string, options?: { includePrivate?: boolean }): Promise<ViewConfig[]> {
  const views = await listViewConfigs();
  return views
    .filter((v) => (options?.includePrivate || v.public) && v.slug === slug)
    .sort((a, b) => (a.tabOrder ?? 999) - (b.tabOrder ?? 999) || (a.label ?? "").localeCompare(b.label ?? ""));
}

export async function listPublicPageSummaries(): Promise<PublicPageSummary[]> {
  const [sources, views] = await Promise.all([listSourceConfigs(), listViewConfigs()]);
  const sourcesById = new Map(sources.map((s) => [s.id, s]));
  const groups = new Map<string, ViewConfig[]>();

  for (const view of views.filter((v) => v.public)) {
    const existing = groups.get(view.slug) ?? [];
    existing.push(view);
    groups.set(view.slug, existing);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, groupedViews]) => {
      const sorted = [...groupedViews].sort(
        (a, b) => (a.tabOrder ?? 999) - (b.tabOrder ?? 999) || (a.label ?? "").localeCompare(b.label ?? "")
      );
      const sourceId = sorted[0]?.sourceId ?? "";
      const sourceLabel = sourcesById.get(sourceId)?.label ?? sourceId;
      return {
        slug,
        title: humanizeSlug(slug),
        sourceId,
        sourceLabel,
        views: sorted.map((v) => ({ id: v.id, label: v.label, description: v.description })),
      };
    });
}

export async function saveSourceConfig(config: SourceConfig): Promise<void> {
  const result = validateSourceConfig(config);
  if (!result.success || !result.data) {
    throw new Error(result.errors.join(" "));
  }
  await ensureConfigTables();
  await queryConfigDb(
    `INSERT INTO config_sources (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data = $2`,
    [result.data.id, JSON.stringify(result.data)]
  );
}

export async function saveViewConfig(config: ViewConfig): Promise<void> {
  const sources = await listSourceConfigs();
  const result = validateViewConfig(config, { knownSourceIds: sources.map((s) => s.id) });
  if (!result.success || !result.data) {
    throw new Error(result.errors.join(" "));
  }
  await ensureConfigTables();
  await queryConfigDb(
    `INSERT INTO config_views (id, data) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET data = $2`,
    [result.data.id, JSON.stringify(result.data)]
  );
}

export async function deleteSourceConfig(sourceId: string): Promise<void> {
  await ensureConfigTables();
  await queryConfigDb("DELETE FROM config_sources WHERE id = $1", [sourceId]);
}

export async function deleteViewConfig(viewId: string): Promise<void> {
  await ensureConfigTables();
  await queryConfigDb("DELETE FROM config_views WHERE id = $1", [viewId]);
}

export async function updateViewPublication(viewId: string, isPublic: boolean): Promise<ViewConfig> {
  const view = await getViewConfigById(viewId);
  if (!view) {
    throw new Error(`View "${viewId}" was not found.`);
  }
  const updated = { ...view, public: isPublic };
  await saveViewConfig(updated);
  return updated;
}

export function useConfigDatabase(): boolean {
  return !!getDatabaseUrl();
}
