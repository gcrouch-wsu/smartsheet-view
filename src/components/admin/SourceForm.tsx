"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { SmartsheetSchemaSummary } from "@/lib/smartsheet";
import type { SourceConfig } from "@/lib/config/types";

function buildInitialState(source: SourceConfig | null, connectionKeys: string[]): SourceConfig {
  return (
    source ?? {
      id: "",
      label: "",
      sourceType: "sheet",
      smartsheetId: 0,
      connectionKey: connectionKeys[0] ?? "default",
      apiBaseUrl: "https://api.smartsheet.com/2.0",
      cacheTtlSeconds: 120,
      fetchOptions: {
        includeObjectValue: true,
        includeColumnOptions: true,
        level: 2,
      },
    }
  );
}

export function SourceForm({
  initialSource,
  connectionKeys,
  isNew,
}: {
  initialSource: SourceConfig | null;
  connectionKeys: string[];
  isNew: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<SourceConfig>(() => buildInitialState(initialSource, connectionKeys));
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>("");
  const [schema, setSchema] = useState<SmartsheetSchemaSummary | null>(null);
  const [schemaError, setSchemaError] = useState<string>("");
  const connectionOptions = useMemo(() => Array.from(new Set(connectionKeys.filter(Boolean))), [connectionKeys]);

  function update<K extends keyof SourceConfig>(key: K, value: SourceConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateFetchOption(key: keyof NonNullable<SourceConfig["fetchOptions"]>, value: boolean | number | undefined) {
    setForm((current) => ({
      ...current,
      fetchOptions: {
        includeObjectValue: current.fetchOptions?.includeObjectValue ?? true,
        includeColumnOptions: current.fetchOptions?.includeColumnOptions ?? true,
        level: current.fetchOptions?.level,
        [key]: value,
      },
    }));
  }

  async function saveSource() {
    setErrors([]);
    setNotice("");

    const endpoint = isNew ? "/api/admin/sources" : `/api/admin/sources/${initialSource?.id ?? form.id}`;
    const method = isNew ? "POST" : "PUT";
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as { errors?: string[]; source?: SourceConfig; error?: string };

    if (!response.ok) {
      setErrors(payload.errors ?? [payload.error ?? "Unable to save source."]);
      return;
    }

    const saved = payload.source ?? form;
    setForm(saved);
    setNotice("Source saved.");
    router.replace(`/admin/sources/${saved.id}`);
    router.refresh();
  }

  async function deleteSource() {
    const sourceId = initialSource?.id ?? form.id;
    if (!sourceId) {
      return;
    }

    if (!window.confirm(`Delete source \"${sourceId}\"? This cannot be undone.`)) {
      return;
    }

    setErrors([]);
    setNotice("");
    const response = await fetch(`/api/admin/sources/${sourceId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const payload = (await response.json()) as { error?: string; errors?: string[] };

    if (!response.ok) {
      setErrors(payload.errors ?? [payload.error ?? "Unable to delete source."]);
      return;
    }

    router.push("/admin/sources");
    router.refresh();
  }

  async function fetchSchema() {
    setSchema(null);
    setSchemaError("");

    const response = await fetch(`/api/admin/sources/${form.id || "preview"}/schema`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const payload = (await response.json()) as {
      schema?: SmartsheetSchemaSummary;
      connection?: { ok: boolean; error?: string };
      error?: string;
      errors?: string[];
    };

    if (!response.ok || !payload.schema) {
      setSchemaError(payload.errors?.join(" ") || payload.error || payload.connection?.error || "Unable to fetch schema.");
      return;
    }

    setSchema(payload.schema);
    setNotice(payload.connection?.ok === false ? "Connection warning returned during schema fetch." : "Connection verified and schema loaded.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">
              Source Registry
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[color:var(--wsu-ink)]">
              {isNew ? "Create source" : `Edit source: ${initialSource?.label ?? form.label}`}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--wsu-muted)]">
              Register the Smartsheet source once, then point one or more views at it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => startTransition(() => {
                  void deleteSource();
                })}
                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-400 hover:text-rose-800"
              >
                {isPending ? "Working..." : "Delete Source"}
              </button>
            )}
            <button
              type="button"
              onClick={() => startTransition(() => {
                void fetchSchema();
              })}
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
            >
              {isPending ? "Working..." : "Test + Fetch Schema"}
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => {
                void saveSource();
              })}
              className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)]"
            >
              {isPending ? "Saving..." : "Save Source"}
            </button>
          </div>
        </div>

        {notice && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
        {errors.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <ul className="space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Source ID</span>
            <input
              value={form.id}
              disabled={!isNew}
              onChange={(event) => update("id", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 disabled:bg-[color:var(--wsu-stone)]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Label</span>
            <input
              value={form.label}
              onChange={(event) => update("label", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Source type</span>
            <select
              value={form.sourceType}
              onChange={(event) => update("sourceType", event.target.value as SourceConfig["sourceType"])}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            >
              <option value="sheet">Sheet</option>
              <option value="report">Report</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Smartsheet ID</span>
            <input
              type="number"
              value={form.smartsheetId || ""}
              onChange={(event) => update("smartsheetId", Number(event.target.value) || 0)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Connection key</span>
            <input
              list="connection-keys"
              value={form.connectionKey ?? ""}
              onChange={(event) => update("connectionKey", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
            <datalist id="connection-keys">
              {connectionOptions.map((key) => (
                <option key={key} value={key} />
              ))}
            </datalist>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">API base URL</span>
            <input
              value={form.apiBaseUrl ?? ""}
              onChange={(event) => update("apiBaseUrl", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Cache TTL seconds</span>
            <input
              type="number"
              value={form.cacheTtlSeconds ?? 120}
              onChange={(event) => update("cacheTtlSeconds", Number(event.target.value) || 0)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Fetch level</span>
            <input
              type="number"
              value={form.fetchOptions?.level ?? 2}
              onChange={(event) => updateFetchOption("level", Number(event.target.value) || 0)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-[color:var(--wsu-muted)]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.fetchOptions?.includeObjectValue ?? true}
              onChange={(event) => updateFetchOption("includeObjectValue", event.target.checked)}
            />
            Include objectValue
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.fetchOptions?.includeColumnOptions ?? true}
              onChange={(event) => updateFetchOption("includeColumnOptions", event.target.checked)}
            />
            Include column options
          </label>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Schema preview</h2>
            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
              Verify the connection and inspect the current columns before mapping fields.
            </p>
          </div>
        </div>

        {schemaError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{schemaError}</p>}

        {schema ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 text-sm text-[color:var(--wsu-muted)]">
              <p><span className="font-semibold text-[color:var(--wsu-ink)]">Source:</span> {schema.name}</p>
              <p className="mt-1"><span className="font-semibold text-[color:var(--wsu-ink)]">Columns:</span> {schema.columns.length}</p>
              <p className="mt-1"><span className="font-semibold text-[color:var(--wsu-ink)]">Rows returned:</span> {schema.rowCount}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[color:var(--wsu-border)] bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[color:var(--wsu-stone)]/70 text-[color:var(--wsu-muted)]">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schema.columns.map((column) => (
                      <tr key={column.id} className="border-t border-[color:var(--wsu-border)]/60">
                        <td className="px-4 py-3 text-[color:var(--wsu-ink)]">{column.title}</td>
                        <td className="px-4 py-3">{column.type}</td>
                        <td className="px-4 py-3 font-mono text-xs">{column.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--wsu-muted)]">No schema loaded yet.</p>
        )}
      </section>
    </div>
  );
}