"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/admin/Toast";
import { countDelimitedRoleAttributes, detectNumberedRoleGroupsFromColumns, mergeRoleGroupSuggestions } from "@/lib/role-groups";
import type { SmartsheetSchemaSummary } from "@/lib/smartsheet";
import type { SourceConfig, SourceRoleGroupConfig } from "@/lib/config/types";

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

function getRoleGroupAttributeKeys(roleGroup: SourceRoleGroupConfig) {
  if (roleGroup.mode === "numbered_slots") {
    return ["name", "email", "phone"].filter((attr) =>
      roleGroup.slots?.some((slot) => Boolean(slot[attr as "name" | "email" | "phone"])),
    );
  }

  return ["name", "email", "phone"].filter((attr) => Boolean(roleGroup.delimited?.[attr as "name" | "email" | "phone"]?.source));
}

function selectorLabel(selector: { columnTitle?: string; columnId?: number } | undefined) {
  if (!selector) {
    return "Unmapped";
  }
  if (selector.columnTitle?.trim()) {
    return selector.columnTitle.trim();
  }
  if (typeof selector.columnId === "number") {
    return `Column ${selector.columnId}`;
  }
  return "Unmapped";
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
  const toast = useToast();
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

  function updateRoleGroup(roleGroupId: string, updater: (roleGroup: SourceRoleGroupConfig) => SourceRoleGroupConfig) {
    setForm((current) => ({
      ...current,
      roleGroups: (current.roleGroups ?? []).map((roleGroup) =>
        roleGroup.id === roleGroupId ? updater(roleGroup) : roleGroup,
      ),
    }));
  }

  function updateRoleGroupTrustPairing(roleGroupId: string, trustPairing: boolean) {
    updateRoleGroup(roleGroupId, (roleGroup) => {
      if (roleGroup.mode !== "delimited_parallel" || !roleGroup.delimited) {
        return roleGroup;
      }

      return {
        ...roleGroup,
        delimited: {
          ...roleGroup.delimited,
          trustPairing: trustPairing || undefined,
        },
      };
    });
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
      const errs = payload.errors ?? [payload.error ?? "Unable to save source."];
      setErrors(Array.isArray(errs) ? errs : [errs]);
      toast.addToast(Array.isArray(errs) ? errs[0] : errs ?? "Unable to save source.", "error");
      return;
    }

    const saved = payload.source ?? form;
    setForm(saved);
    setNotice("Source saved.");
    toast.addToast("Source saved.", "success");
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
      const errs = payload.errors ?? [payload.error ?? "Unable to delete source."];
      setErrors(Array.isArray(errs) ? errs : [errs]);
      toast.addToast(Array.isArray(errs) ? errs[0] : errs ?? "Unable to delete source.", "error");
      return;
    }

    toast.addToast("Source deleted.", "success");
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
      const err = payload.errors?.join(" ") || payload.error || payload.connection?.error || "Unable to fetch schema.";
      setSchemaError(err);
      toast.addToast(err, "error");
      return;
    }

    setSchema(payload.schema);
    const noticeMsg = payload.connection?.ok === false ? "Connection warning returned during schema fetch." : "Connection verified and schema loaded.";
    setNotice(noticeMsg);
    toast.addToast(payload.connection?.ok === false ? "Schema loaded with connection warning." : "Connection verified.", "success");
  }

  function mergeDetectedRoleGroupsFromSchema() {
    if (!schema) {
      return;
    }
    const detected = detectNumberedRoleGroupsFromColumns(schema.columns);
    if (detected.length === 0) {
      toast.addToast("No numbered role-column patterns detected in this schema.", "error");
      return;
    }
    setForm((f) => ({
      ...f,
      roleGroups: mergeRoleGroupSuggestions(f.roleGroups, detected),
    }));
    toast.addToast(`Merged ${detected.length} detected role group(s). Save the source to persist.`, "success");
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
              placeholder="e.g. grad-programs"
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 disabled:bg-[color:var(--wsu-stone)]"
            />
            <p className="text-xs text-[color:var(--wsu-muted)]">Unique, URL-safe identifier. Set once at creation; cannot be changed.</p>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Label</span>
            <input
              value={form.label}
              onChange={(event) => update("label", event.target.value)}
              placeholder="e.g. Graduate Programs"
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
            <p className="text-xs text-[color:var(--wsu-muted)]">Display name shown in the admin UI. Editable anytime.</p>
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
              placeholder="From sheet/report URL"
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
            <p className="text-xs text-[color:var(--wsu-muted)]">Numeric ID from the Smartsheet URL: app.smartsheet.com/sheets/XXXXXXXX or .../reports/XXXXXXXX</p>
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
            <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Role groups</h2>
            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
              Review grouped contact roles at the source level. Numbered slots are safe by structure. Only trust delimited pairing when those columns stay aligned in Smartsheet.
            </p>
          </div>
        </div>

        {form.roleGroups && form.roleGroups.length > 0 ? (
          <div className="mt-4 space-y-3">
            {form.roleGroups.map((roleGroup) => {
              const attrs = getRoleGroupAttributeKeys(roleGroup);
              const attrSummary = attrs.length > 0 ? attrs.join(", ") : "none";
              const isDelimited = roleGroup.mode === "delimited_parallel";
              const delimitedAttrCount = isDelimited ? countDelimitedRoleAttributes(roleGroup.delimited) : 0;
              const canTrustPairing = isDelimited && delimitedAttrCount > 1;
              const isTrusted = roleGroup.delimited?.trustPairing === true;

              return (
                <article
                  key={roleGroup.id}
                  className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[color:var(--wsu-ink)]">{roleGroup.label}</h3>
                        <span className="rounded-full bg-[color:var(--wsu-stone)]/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--wsu-muted)]">
                          {roleGroup.mode === "numbered_slots" ? "Numbered slots" : "Delimited parallel"}
                        </span>
                        {roleGroup.mode === "numbered_slots" ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                            Safe by slot
                          </span>
                        ) : canTrustPairing ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isTrusted ? "bg-emerald-50 text-emerald-800" : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {isTrusted ? "Trusted pairing" : "Read-only by default"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                            Single attribute
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">
                        ID: <span className="font-mono">{roleGroup.id}</span>
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">
                        Attributes: {attrSummary}
                      </p>
                    </div>
                  </div>

                  {roleGroup.mode === "numbered_slots" ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--wsu-border)]/70">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-[color:var(--wsu-stone)]/30 text-[color:var(--wsu-muted)]">
                          <tr>
                            <th className="px-3 py-2">Slot</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(roleGroup.slots ?? []).map((slot) => (
                            <tr key={slot.slot} className="border-t border-[color:var(--wsu-border)]/60 text-[color:var(--wsu-ink)]">
                              <td className="px-3 py-2 font-mono">{slot.slot}</td>
                              <td className="px-3 py-2">{selectorLabel(slot.name)}</td>
                              <td className="px-3 py-2">{selectorLabel(slot.email)}</td>
                              <td className="px-3 py-2">{selectorLabel(slot.phone)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-2 text-xs text-[color:var(--wsu-muted)] sm:grid-cols-3">
                        {(["name", "email", "phone"] as const).map((attr) => (
                          <div key={attr} className="rounded-xl border border-[color:var(--wsu-border)]/70 bg-[color:var(--wsu-stone)]/10 px-3 py-2">
                            <p className="font-semibold uppercase tracking-wide text-[color:var(--wsu-ink)]">{attr}</p>
                            <p className="mt-1 break-words">
                              {selectorLabel(roleGroup.delimited?.[attr]?.source)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {canTrustPairing ? (
                        <label className="flex items-start gap-3 rounded-xl border border-[color:var(--wsu-border)]/70 bg-[color:var(--wsu-stone)]/10 px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            checked={isTrusted}
                            onChange={(event) => updateRoleGroupTrustPairing(roleGroup.id, event.target.checked)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-medium text-[color:var(--wsu-ink)]">
                              Trust positional pairing for this delimited role group
                            </span>
                            <span className="mt-1 block text-xs text-[color:var(--wsu-muted)]">
                              Enable this only when the name, email, and phone columns remain in matching order in Smartsheet. If unchecked, the group stays display-only in contributor editing.
                            </span>
                          </span>
                        </label>
                      ) : (
                        <p className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900">
                          This delimited role group uses one attribute only, so there is no cross-column pairing override to manage.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[color:var(--wsu-muted)]">
            No role groups configured yet. Fetch schema and use <strong className="font-medium text-[color:var(--wsu-ink)]">Merge detected role groups</strong> to append numbered-slot groups from column titles.
          </p>
        )}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 text-sm text-[color:var(--wsu-muted)]">
                <p><span className="font-semibold text-[color:var(--wsu-ink)]">Source:</span> {schema.name}</p>
                <p className="mt-1"><span className="font-semibold text-[color:var(--wsu-ink)]">Columns:</span> {schema.columns.length}</p>
                <p className="mt-1"><span className="font-semibold text-[color:var(--wsu-ink)]">Rows returned:</span> {schema.rowCount}</p>
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => mergeDetectedRoleGroupsFromSchema())}
                className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-ink)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
              >
                Merge detected role groups
              </button>
            </div>
            {form.roleGroups && form.roleGroups.length > 0 && (
              <p className="text-xs text-[color:var(--wsu-muted)]">
                This source has {form.roleGroups.length} role group(s) in config. Use Merge to append numbered-slot groups from column titles, then review them in the Role groups section above.
              </p>
            )}
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
