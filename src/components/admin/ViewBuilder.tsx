"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FILTER_OPERATOR_OPTIONS, LAYOUT_OPTIONS, RENDER_TYPE_OPTIONS, TRANSFORM_OPTIONS } from "@/lib/config/options";
import { VIEW_TEMPLATES, applyViewTemplate } from "@/lib/config/templates";
import type { SourceConfig, SmartsheetColumn, TransformConfig, ViewConfig, ViewFieldConfig, ViewFilterConfig, ViewSortConfig } from "@/lib/config/types";
import type { SmartsheetSchemaSummary } from "@/lib/smartsheet";

function createEmptyTransform(): TransformConfig {
  return { op: "trim" };
}

function createEmptyField(): ViewFieldConfig {
  return {
    key: "",
    label: "",
    source: { columnTitle: "" },
    transforms: [{ op: "trim" }],
    render: { type: "text" },
  };
}

function createEmptyFilter(): ViewFilterConfig {
  return {
    columnTitle: "",
    op: "equals",
    value: "",
  };
}

function createEmptySort(): ViewSortConfig {
  return {
    field: "",
    direction: "asc",
  };
}

function columnToKey(col: SmartsheetColumn): string {
  return col.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || `col_${col.id}`;
}

function columnToField(col: SmartsheetColumn, displayName?: string): ViewFieldConfig {
  return {
    key: columnToKey(col),
    label: displayName ?? col.title,
    source: { columnTitle: col.title, columnId: col.id },
    transforms: [{ op: "trim" }],
    render: { type: "text" },
  };
}

function buildInitialView(view: ViewConfig | null, sources: SourceConfig[]): ViewConfig {
  return (
    view ?? {
      id: "",
      slug: "",
      sourceId: sources[0]?.id ?? "",
      label: "",
      description: "",
      layout: "table",
      public: false,
      tabOrder: 1,
      presentation: {
        headingFieldKey: "",
        summaryFieldKey: "",
      },
      filters: [],
      defaultSort: [],
      fields: [],
    }
  );
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const FETCH_CREDENTIALS: RequestCredentials = "include";

export function ViewBuilder({
  initialView,
  sources,
  isNew,
}: {
  initialView: ViewConfig | null;
  sources: SourceConfig[];
  isNew: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<ViewConfig>(() => buildInitialView(initialView, sources));
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>("");
  const [schema, setSchema] = useState<SmartsheetSchemaSummary | null>(null);
  const [schemaError, setSchemaError] = useState<string>("");
  const [schemaLoading, setSchemaLoading] = useState(false);
  const sourceMap = useMemo(() => new Map(sources.map((source) => [source.id, source.label])), [sources]);

  function update<K extends keyof ViewConfig>(key: K, value: ViewConfig[K]) {
    setView((current) => ({ ...current, [key]: value }));
  }

  function updateField(index: number, nextField: ViewFieldConfig) {
    setView((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) => (fieldIndex === index ? nextField : field)),
    }));
  }

  function moveField(fromIndex: number, direction: "up" | "down") {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= view.fields.length) return;
    setView((current) => {
      const next = [...current.fields];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return { ...current, fields: next };
    });
  }

  function updateFilter(index: number, nextFilter: ViewFilterConfig) {
    setView((current) => ({
      ...current,
      filters: (current.filters ?? []).map((filter, filterIndex) => (filterIndex === index ? nextFilter : filter)),
    }));
  }

  function updateSort(index: number, nextSort: ViewSortConfig) {
    setView((current) => ({
      ...current,
      defaultSort: (current.defaultSort ?? []).map((sort, sortIndex) => (sortIndex === index ? nextSort : sort)),
    }));
  }

  const fetchSchema = useCallback(async () => {
    if (!view.sourceId) {
      setSchemaError("Select a source first.");
      return;
    }
    setSchemaLoading(true);
    setSchemaError("");
    setSchema(null);
    try {
      const response = await fetch(`/api/admin/sources/${view.sourceId}/schema`, {
        method: "GET",
        credentials: FETCH_CREDENTIALS,
      });
      const payload = (await response.json()) as {
        schema?: SmartsheetSchemaSummary;
        error?: string;
        errors?: string[];
      };
      if (!response.ok || !payload.schema) {
        setSchemaError(payload.errors?.join(" ") || payload.error || "Unable to fetch schema.");
        return;
      }
      setSchema(payload.schema);
    } finally {
      setSchemaLoading(false);
    }
  }, [view.sourceId]);

  useEffect(() => {
    setSchema(null);
    setSchemaError("");
  }, [view.sourceId]);

  function toggleColumnIncluded(col: SmartsheetColumn) {
    const match = view.fields.find(
      (f) => f.source.columnTitle === col.title || f.source.columnId === col.id
    );
    if (match) {
      setView((current) => ({
        ...current,
        fields: current.fields.filter(
          (f) => f.source.columnTitle !== col.title && f.source.columnId !== col.id
        ),
      }));
    } else {
      setView((current) => ({
        ...current,
        fields: [...current.fields, columnToField(col, col.title)],
      }));
    }
  }

  function isColumnIncluded(col: SmartsheetColumn): boolean {
    const key = columnToKey(col);
    return view.fields.some((f) => f.key === key || f.source.columnTitle === col.title || f.source.columnId === col.id);
  }

  function getFieldForColumn(col: SmartsheetColumn): ViewFieldConfig | undefined {
    return view.fields.find(
      (f) => f.key === columnToKey(col) || f.source.columnTitle === col.title || f.source.columnId === col.id
    );
  }

  async function saveView() {
    setErrors([]);
    setNotice("");

    const endpoint = isNew ? "/api/admin/views" : `/api/admin/views/${initialView?.id ?? view.id}`;
    const method = isNew ? "POST" : "PUT";
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: FETCH_CREDENTIALS,
      body: JSON.stringify(view),
    });
    const payload = (await response.json()) as { errors?: string[]; error?: string; warnings?: string[]; view?: ViewConfig };

    if (!response.ok) {
      setErrors(payload.errors ?? payload.warnings ?? [payload.error ?? "Unable to save view."]);
      return;
    }

    const saved = payload.view ?? view;
    setView(saved);
    setNotice("View saved.");
    router.replace(`/admin/views/${saved.id}`);
    router.refresh();
  }

  async function deleteView() {
    const viewId = initialView?.id ?? view.id;
    if (!viewId) {
      return;
    }

    if (!window.confirm(`Delete view \"${viewId}\"? This cannot be undone.`)) {
      return;
    }

    setErrors([]);
    setNotice("");
    const response = await fetch(`/api/admin/views/${viewId}`, {
      method: "DELETE",
      credentials: FETCH_CREDENTIALS,
    });
    const payload = (await response.json()) as { error?: string; errors?: string[] };

    if (!response.ok) {
      setErrors(payload.errors ?? [payload.error ?? "Unable to delete view."]);
      return;
    }

    router.push("/admin/views");
    router.refresh();
  }

  async function togglePublish(nextPublic: boolean) {
    if (isNew) {
      setErrors(["Save the view before changing publication state."]);
      return;
    }

    const response = await fetch(`/api/admin/views/${initialView?.id ?? view.id}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: FETCH_CREDENTIALS,
      body: JSON.stringify({ public: nextPublic }),
    });
    const payload = (await response.json()) as { error?: string; errors?: string[]; warnings?: string[]; view?: ViewConfig };

    if (!response.ok || !payload.view) {
      setErrors(payload.errors ?? payload.warnings ?? [payload.error ?? "Unable to update publication state."]);
      return;
    }

    setView(payload.view);
    setNotice(nextPublic ? "View published." : "View unpublished.");
    router.refresh();
  }

  function applyTemplate(templateId: string) {
    setView((current) => applyViewTemplate(current, templateId));
    setErrors([]);
    setNotice("Template applied. Update the field mappings before publishing.");
  }

  const previewHref = !isNew && view.id ? `/admin/views/${view.id}/preview` : null;
  const publicPath = view.public ? `/view/${view.slug}?view=${view.id}` : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicHref = publicPath ? `${origin}${publicPath}` : null;
  const embedHref = publicPath ? `${origin}${publicPath}&embed=1` : null;
  const embedSnippet = embedHref
    ? `<iframe src="${embedHref}" style="width:100%;border:0;min-height:640px;" loading="lazy"></iframe>`
    : "Publish the view to generate an embed snippet.";

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">View Builder</p>
            <h1 className="mt-2 text-3xl font-semibold text-[color:var(--wsu-ink)]">
              {isNew ? "Create view" : `Edit view: ${initialView?.label ?? view.label}`}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--wsu-muted)]">
              Build the public view config through the UI, then preview and publish it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <button
                type="button"
                onClick={() => startTransition(() => {
                  void deleteView();
                })}
                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-400 hover:text-rose-800"
              >
                {isPending ? "Working..." : "Delete View"}
              </button>
            )}
            {previewHref && (
              <Link href={previewHref} className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]">
                Preview
              </Link>
            )}
            {!isNew && (
              <button
                type="button"
                onClick={() => startTransition(() => {
                  void togglePublish(!view.public);
                })}
                className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
              >
                {isPending ? "Working..." : view.public ? "Unpublish" : "Publish"}
              </button>
            )}
            <button
              type="button"
              onClick={() => startTransition(() => {
                void saveView();
              })}
              className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)]"
            >
              {isPending ? "Saving..." : "Save View"}
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

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">1. Template</h3>
          <p className="mb-4 text-sm text-[color:var(--wsu-muted)]">Choose a layout pattern for the view.</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {VIEW_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  view.layout === template.layout
                    ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)]/5"
                    : "border-[color:var(--wsu-border)] bg-white hover:border-[color:var(--wsu-crimson)]"
                }`}
              >
                <p className="text-sm font-semibold text-[color:var(--wsu-ink)]">{template.label}</p>
                <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">View ID</span>
            <input
              value={view.id}
              disabled={!isNew}
              onChange={(event) => update("id", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 disabled:bg-[color:var(--wsu-stone)]"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Slug</span>
            <input
              value={view.slug}
              onChange={(event) => update("slug", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Label</span>
            <input
              value={view.label}
              onChange={(event) => update("label", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Source</span>
            <select
              value={view.sourceId}
              onChange={(event) => update("sourceId", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-[color:var(--wsu-ink)]">Description</span>
            <textarea
              value={view.description ?? ""}
              onChange={(event) => update("description", event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Layout</span>
            <select
              value={view.layout}
              onChange={(event) => update("layout", event.target.value as ViewConfig["layout"])}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            >
              {LAYOUT_OPTIONS.map((layout) => (
                <option key={layout} value={layout}>{layout}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Tab order</span>
            <input
              type="number"
              value={view.tabOrder ?? 1}
              onChange={(event) => update("tabOrder", Number(event.target.value) || 0)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Heading field key</span>
            <input
              value={view.presentation?.headingFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, headingFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Summary field key</span>
            <input
              value={view.presentation?.summaryFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, summaryFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">A-Z index field key</span>
            <input
              value={view.presentation?.indexFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, indexFieldKey: event.target.value })}
              placeholder="Same as heading if blank"
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={view.presentation?.hideRowBadge ?? false}
              onChange={(event) => update("presentation", { ...view.presentation, hideRowBadge: event.target.checked })}
              className="rounded border-[color:var(--wsu-border)]"
            />
            <span className="font-medium text-[color:var(--wsu-ink)]">Hide row badge</span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={view.fixedLayout ?? false}
              onChange={(event) => update("fixedLayout", event.target.checked)}
              className="rounded border-[color:var(--wsu-border)]"
            />
            <span className="font-medium text-[color:var(--wsu-ink)]">Fixed layout only</span>
          </label>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">View style</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--wsu-ink)]">Primary color</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={view.style?.primaryColor ?? "#a60f2d"}
                  onChange={(event) => update("style", { ...view.style, primaryColor: event.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-xl border border-[color:var(--wsu-border)]"
                />
                <input
                  value={view.style?.primaryColor ?? ""}
                  onChange={(event) => update("style", { ...view.style, primaryColor: event.target.value })}
                  placeholder="#a60f2d"
                  className="flex-1 rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 font-mono text-sm"
                />
              </div>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--wsu-ink)]">Accent / border color</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={view.style?.accentColor ?? "#d8cdc3"}
                  onChange={(event) => update("style", { ...view.style, accentColor: event.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-xl border border-[color:var(--wsu-border)]"
                />
                <input
                  value={view.style?.accentColor ?? ""}
                  onChange={(event) => update("style", { ...view.style, accentColor: event.target.value })}
                  placeholder="#d8cdc3"
                  className="flex-1 rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 font-mono text-sm"
                />
              </div>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--wsu-ink)]">Border radius</span>
              <input
                value={view.style?.borderRadius ?? ""}
                onChange={(event) => update("style", { ...view.style, borderRadius: event.target.value })}
                placeholder="1.75rem"
                className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 font-mono text-sm"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-sm text-[color:var(--wsu-muted)]">
          <p>
            <span className="font-semibold text-[color:var(--wsu-ink)]">Publication state:</span> {view.public ? "Published" : "Draft"}
          </p>
          <p className="mt-2">
            Publication is controlled only by the Publish button so schema validation always runs before a view goes live.
          </p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">2. Columns & 3. Display names</h2>
          <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Load columns from the source, then select which to include and set their display names.</p>
        </div>
        {!view.sourceId ? (
          <p className="mt-4 text-sm text-[color:var(--wsu-muted)]">Select a source above, then load columns.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchSchema()}
                disabled={schemaLoading}
                className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium hover:border-[color:var(--wsu-crimson)] disabled:opacity-50"
              >
                {schemaLoading ? "Loading…" : schema ? "Reload columns" : "Load columns"}
              </button>
              {schema && (
                <span className="text-sm text-[color:var(--wsu-muted)]">
                  {schema.columns.length} columns from {schema.name}
                </span>
              )}
            </div>
            {schemaError && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{schemaError}</p>
            )}
            {schema && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-[color:var(--wsu-ink)]">Select columns to include and edit display names:</p>
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4">
                  {schema.columns.map((col) => {
                    const included = isColumnIncluded(col);
                    const field = getFieldForColumn(col);
                    return (
                      <div key={col.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--wsu-border)]/60 bg-[color:var(--wsu-stone)]/20 p-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={() => toggleColumnIncluded(col)}
                            className="rounded border-[color:var(--wsu-border)]"
                          />
                          <span className="text-sm font-medium text-[color:var(--wsu-ink)]">{col.title}</span>
                        </label>
                        {included && (
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            <span className="text-sm text-[color:var(--wsu-muted)]">Display name:</span>
                            <input
                              value={field?.label ?? col.title}
                              onChange={(event) => {
                                const nextLabel = event.target.value;
                                const idx = view.fields.findIndex(
                                  (f) => f.source.columnTitle === col.title || f.source.columnId === col.id
                                );
                                if (idx >= 0 && view.fields[idx]) {
                                  updateField(idx, { ...view.fields[idx], label: nextLabel });
                                }
                              }}
                              placeholder={col.title}
                              className="min-w-0 flex-1 rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">4. Arrange</h2>
          <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Reorder columns for display. Order here = display order in the view.</p>
        </div>
        <div className="mt-4 space-y-3">
          {view.fields.length === 0 ? (
            <p className="text-sm text-[color:var(--wsu-muted)]">Select columns above to add them here, then reorder.</p>
          ) : (
            view.fields.map((field, index) => (
              <div
                key={`${field.key}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4"
              >
                <div>
                  <p className="font-medium text-[color:var(--wsu-ink)]">{field.label || field.key || "Unnamed"}</p>
                  <p className="text-sm text-[color:var(--wsu-muted)]">Smartsheet: {field.source.columnTitle ?? field.source.columnId ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveField(index, "up")}
                    disabled={index === 0}
                    className="rounded-full border border-[color:var(--wsu-border)] px-3 py-1.5 text-sm disabled:opacity-40"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveField(index, "down")}
                    disabled={index === view.fields.length - 1}
                    className="rounded-full border border-[color:var(--wsu-border)] px-3 py-1.5 text-sm disabled:opacity-40"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => update("fields", view.fields.filter((_, i) => i !== index))}
                    className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Filters</h2>
            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Configure row inclusion rules.</p>
          </div>
          <button
            type="button"
            onClick={() => update("filters", [...(view.filters ?? []), createEmptyFilter()])}
            className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-sm font-medium"
          >
            Add filter
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {(view.filters ?? []).map((filter, index) => (
            <div key={`${filter.columnTitle ?? filter.columnId ?? "filter"}-${index}`} className="grid gap-3 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 md:grid-cols-[1fr_150px_180px_1fr_auto]">
              <input
                value={filter.columnTitle ?? ""}
                onChange={(event) => updateFilter(index, { ...filter, columnTitle: event.target.value })}
                placeholder="Column title"
                className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
              />
              <input
                type="number"
                value={filter.columnId ?? ""}
                onChange={(event) => updateFilter(index, { ...filter, columnId: parseOptionalNumber(event.target.value) })}
                placeholder="Column ID"
                className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
              />
              <select
                value={filter.op}
                onChange={(event) => updateFilter(index, { ...filter, op: event.target.value as ViewFilterConfig["op"] })}
                className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
              >
                {FILTER_OPERATOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <input
                value={Array.isArray(filter.value) ? filter.value.join(", ") : String(filter.value ?? "")}
                onChange={(event) => updateFilter(index, { ...filter, value: event.target.value })}
                placeholder="Value"
                className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
              />
              <button
                type="button"
                onClick={() => update("filters", (view.filters ?? []).filter((_, filterIndex) => filterIndex !== index))}
                className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
          {(view.filters ?? []).length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No filters configured.</p>}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Sort order</h2>
            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Configure default row ordering.</p>
          </div>
          <button
            type="button"
            onClick={() => update("defaultSort", [...(view.defaultSort ?? []), createEmptySort()])}
            className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-sm font-medium"
          >
            Add sort
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {(view.defaultSort ?? []).map((sort, index) => (
            <div key={`${sort.field}-${index}`} className="grid gap-3 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 md:grid-cols-[1fr_180px_auto]">
              <input
                value={sort.field}
                onChange={(event) => updateSort(index, { ...sort, field: event.target.value })}
                placeholder="Field key"
                className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
              />
              <select
                value={sort.direction}
                onChange={(event) => updateSort(index, { ...sort, direction: event.target.value as ViewSortConfig["direction"] })}
                className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
              >
                <option value="asc">asc</option>
                <option value="desc">desc</option>
              </select>
              <button
                type="button"
                onClick={() => update("defaultSort", (view.defaultSort ?? []).filter((_, sortIndex) => sortIndex !== index))}
                className="rounded-full border border-rose-200 px-3 py-2 text-sm text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
          {(view.defaultSort ?? []).length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No sort configured.</p>}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Publish outputs</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 text-sm text-[color:var(--wsu-muted)]">
            <p><span className="font-semibold text-[color:var(--wsu-ink)]">Preview:</span> {previewHref ?? "Save the view to enable preview."}</p>
            <p className="mt-2"><span className="font-semibold text-[color:var(--wsu-ink)]">Public URL:</span> {publicHref ?? "Not published."}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 text-sm text-[color:var(--wsu-muted)]">
            <p className="font-semibold text-[color:var(--wsu-ink)]">WordPress embed snippet</p>
            <textarea readOnly rows={5} value={embedSnippet} className="mt-3 w-full rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-3 py-2 font-mono text-xs text-[color:var(--wsu-ink)]" />
          </div>
        </div>
      </section>
    </div>
  );
}
