"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { formatLayoutLabel } from "@/components/public/ViewRenderer";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import { ViewWithSearchAndIndex } from "@/components/public/ViewWithSearchAndIndex";
import { FILTER_OPERATOR_OPTIONS, LAYOUT_OPTIONS } from "@/lib/config/options";
import { BUILT_IN_THEMES } from "@/lib/config/themes";
import { VIEW_TEMPLATES, applyViewTemplate } from "@/lib/config/templates";
import type { SourceConfig, SmartsheetColumn, TransformConfig, ViewConfig, ViewFieldConfig, ViewFilterConfig, ViewSortConfig } from "@/lib/config/types";
import type { ResolvedView } from "@/lib/config/types";
import type { SmartsheetSchemaSummary } from "@/lib/smartsheet";

type ViewBuilderTab = "setup" | "fields" | "filters" | "preview";

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

const COLUMN_TYPE_SUGGESTIONS: Record<string, { render: ViewFieldConfig["render"]["type"]; transforms?: TransformConfig[] }> = {
  TEXT_NUMBER: { render: "text" },
  DATE: { render: "date", transforms: [{ op: "format_date" }] },
  DATETIME: { render: "date", transforms: [{ op: "format_date" }] },
  PICKLIST: { render: "badge" },
  MULTI_PICKLIST: { render: "list", transforms: [{ op: "split" }] },
  CONTACT_LIST: { render: "mailto", transforms: [{ op: "contact_emails" }] },
  MULTI_CONTACT_LIST: { render: "mailto_list", transforms: [{ op: "contact_emails" }] },
  CHECKBOX: { render: "badge" },
  DURATION: { render: "text" },
  ABSTRACT_DATETIME: { render: "date", transforms: [{ op: "format_date" }] },
};

function columnToKey(col: SmartsheetColumn): string {
  return col.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") || `col_${col.id}`;
}

function columnToField(col: SmartsheetColumn, displayName?: string): ViewFieldConfig {
  const suggestion = COLUMN_TYPE_SUGGESTIONS[col.type ?? "TEXT_NUMBER"] ?? { render: "text" as const };
  return {
    key: columnToKey(col),
    label: displayName ?? col.title,
    source: { columnTitle: col.title, columnId: col.id, columnType: col.type },
    transforms: suggestion.transforms ?? [{ op: "trim" }],
    render: { type: suggestion.render },
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
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
    setIsSaving(true);

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
      setIsSaving(false);
      const errs = payload.errors ?? payload.warnings ?? [payload.error ?? "Unable to save view."];
      setErrors(errs);
      toast.addToast(errs[0] ?? "Unable to save view.", "error");
      return;
    }

    setIsSaving(false);
    const saved = payload.view ?? view;
    setView(saved);
    setNotice("View saved.");
    toast.addToast("View saved.", "success");
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
    setIsDeleting(true);
    const response = await fetch(`/api/admin/views/${viewId}`, {
      method: "DELETE",
      credentials: FETCH_CREDENTIALS,
    });
    const payload = (await response.json()) as { error?: string; errors?: string[] };

    if (!response.ok) {
      setIsDeleting(false);
      const errs = payload.errors ?? [payload.error ?? "Unable to delete view."];
      setErrors(Array.isArray(errs) ? errs : [errs]);
      toast.addToast(Array.isArray(errs) ? errs[0] : errs ?? "Unable to delete view.", "error");
      return;
    }

    setIsDeleting(false);
    toast.addToast("View deleted.", "success");
    router.push("/admin/views");
    router.refresh();
  }

  async function togglePublish(nextPublic: boolean) {
    if (isNew) {
      setErrors(["Save the view before changing publication state."]);
      return;
    }

    setIsPublishing(true);
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
      setIsPublishing(false);
      const errs = payload.errors ?? payload.warnings ?? [payload.error ?? "Unable to update publication state."];
      setErrors(errs);
      toast.addToast(Array.isArray(errs) ? errs[0] : errs ?? "Unable to update publication state.", "error");
      return;
    }

    setIsPublishing(false);
    setView(payload.view);
    setNotice(nextPublic ? "View published." : "View unpublished.");
    toast.addToast(nextPublic ? "View published." : "View unpublished.", "success");
    router.refresh();
  }

  function applyTemplate(templateId: string) {
    setView((current) => applyViewTemplate(current, templateId));
    setLastAppliedTemplateId(templateId);
    setActiveTab("fields");
    setErrors([]);
    setNotice("Template applied. Map each field to a column.");
    toast.addToast("Template applied. Map fields to columns.", "info");
  }

  async function duplicateView() {
    const viewId = initialView?.id ?? view.id;
    if (!viewId) return;
    setErrors([]);
    try {
      const response = await fetch(`/api/admin/views/${viewId}/duplicate`, {
        method: "POST",
        credentials: FETCH_CREDENTIALS,
      });
      const payload = (await response.json()) as { view?: ViewConfig; error?: string };
      if (!response.ok || !payload.view) {
        setErrors([payload.error ?? "Unable to duplicate view."]);
        toast.addToast(payload.error ?? "Unable to duplicate view.", "error");
        return;
      }
      toast.addToast("View duplicated.", "success");
      router.push(`/admin/views/${payload.view.id}`);
      router.refresh();
    } catch {
      setErrors(["Failed to duplicate view."]);
      toast.addToast("Failed to duplicate view.", "error");
    }
  }

  const [activeTab, setActiveTab] = useState<ViewBuilderTab>("setup");
  const [lastAppliedTemplateId, setLastAppliedTemplateId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    resolvedView: ResolvedView;
    warnings: string[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>("");
  const [previewViewport, setPreviewViewport] = useState<"full" | "768" | "375">("full");

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewData(null);
    try {
      const response = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: FETCH_CREDENTIALS,
        body: JSON.stringify(view),
      });
      const payload = (await response.json()) as {
        rows?: ResolvedView["rows"];
        fields?: ResolvedView["fields"];
        warnings?: string[];
        rowCount?: number;
        error?: string;
      };
      if (!response.ok || !payload.rows || !payload.fields) {
        setPreviewError(payload.error ?? "Preview failed.");
        return;
      }
      const resolvedView: ResolvedView = {
        id: view.id,
        label: view.label,
        description: view.description,
        layout: view.layout,
        presentation: view.presentation,
        style: view.style,
        themePresetId: view.themePresetId,
        fixedLayout: view.fixedLayout,
        rowCount: payload.rowCount ?? payload.rows.length,
        fields: payload.fields,
        rows: payload.rows,
      };
      setPreviewData({ resolvedView, warnings: payload.warnings ?? [] });
    } finally {
      setPreviewLoading(false);
    }
  }, [view]);

  useEffect(() => {
    if (activeTab === "preview") {
      void fetchPreview();
    }
  }, [activeTab, fetchPreview]);

  const previewHref = !isNew && view.id ? `/admin/views/${view.id}/preview` : null;

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
                onClick={() => void deleteView()}
                disabled={isDeleting}
                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-400 hover:text-rose-800 disabled:opacity-50"
              >
                {isDeleting ? "Working..." : "Delete View"}
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
                onClick={() => void togglePublish(!view.public)}
                disabled={isPublishing}
                className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)] disabled:opacity-50"
              >
                {isPublishing ? "Working..." : view.public ? "Unpublish" : "Publish"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveView()}
              disabled={isSaving}
              className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save View"}
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

        <nav className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="View builder tabs">
          {(["setup", "fields", "filters", "preview"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                  : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
              }`}
            >
              {tab === "setup" && "Setup"}
              {tab === "fields" && "Fields"}
              {tab === "filters" && "Filters & Sort"}
              {tab === "preview" && "Preview"}
            </button>
          ))}
        </nav>

        {activeTab === "setup" && (
          <div id="tabpanel-setup" role="tabpanel" aria-labelledby="tab-setup" className="mt-6 space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Start from template</h3>
              <p className="mb-4 text-sm text-[color:var(--wsu-muted)]">Choose a layout pattern. You will map fields to columns in the Fields tab.</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {VIEW_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={`min-h-[44px] rounded-[1.5rem] border p-4 text-left transition ${
                      lastAppliedTemplateId === template.id
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

            <div className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[color:var(--wsu-ink)]">Layout</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {LAYOUT_OPTIONS.map((layout) => (
                  <button
                    key={layout}
                    type="button"
                    onClick={() => update("layout", layout)}
                    className={`min-h-[44px] rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                      view.layout === layout
                        ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)]/5"
                        : "border-[color:var(--wsu-border)] bg-white hover:border-[color:var(--wsu-crimson)]"
                    }`}
                  >
                    {formatLayoutLabel(layout)}
                  </button>
                ))}
              </div>
            </div>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Tab order</span>
            <input
              type="number"
              value={view.tabOrder ?? 1}
              onChange={(event) => update("tabOrder", parseOptionalNumber(event.target.value) ?? 1)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Heading field key</span>
            <select
              value={view.presentation?.headingFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, headingFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 min-h-[44px]"
            >
              <option value="">—</option>
              {view.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label || f.key}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Summary field key</span>
            <select
              value={view.presentation?.summaryFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, summaryFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 min-h-[44px]"
            >
              <option value="">—</option>
              {view.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label || f.key}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">A-Z index field key</span>
            <select
              value={view.presentation?.indexFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, indexFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 min-h-[44px]"
            >
              <option value="">Same as heading if blank</option>
              {view.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label || f.key}</option>
              ))}
            </select>
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
            <span className="font-medium text-[color:var(--wsu-ink)]">Lock layout for viewers</span>
          </label>
        </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Theme</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BUILT_IN_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => update("themePresetId", theme.id)}
                    className={`min-h-[44px] rounded-2xl border p-4 text-left transition ${
                      (view.themePresetId ?? "wsu_crimson") === theme.id
                        ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)]/5"
                        : "border-[color:var(--wsu-border)] bg-white hover:border-[color:var(--wsu-crimson)]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[color:var(--wsu-ink)]">{theme.label}</p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">Accent color override:</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="color"
                  value={view.style?.accentColor ?? (BUILT_IN_THEMES.find((t) => t.id === (view.themePresetId ?? "wsu_crimson"))?.tokens.accentColor ?? "#a60f2d")}
                  onChange={(event) => update("style", { ...view.style, accentColor: event.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-xl border border-[color:var(--wsu-border)]"
                />
                <input
                  value={view.style?.accentColor ?? ""}
                  onChange={(event) => update("style", { ...view.style, accentColor: event.target.value })}
                  placeholder="Override accent"
                  className="flex-1 rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 font-mono text-sm"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-sm text-[color:var(--wsu-muted)]">
              <p><span className="font-semibold text-[color:var(--wsu-ink)]">Publication state:</span> {view.public ? "Published" : "Draft"}</p>
              <p className="mt-2">Publication is controlled only by the Publish button so schema validation always runs before a view goes live.</p>
            </div>

            {!isNew && (
              <div>
                <button
                  type="button"
                  onClick={() => void duplicateView()}
                  className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
                >
                  Duplicate view
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 text-sm text-[color:var(--wsu-muted)]">
              <p className="font-semibold text-[color:var(--wsu-ink)]">Publish outputs</p>
              <p className="mt-2"><span className="font-medium">Preview:</span> {previewHref ?? "Save the view to enable preview."}</p>
              <p className="mt-1"><span className="font-medium">Public URL:</span> {view.public ? `${typeof window !== "undefined" ? window.location.origin : ""}/view/${view.slug}?view=${view.id}` : "Not published."}</p>
              <p className="mt-3 font-medium text-[color:var(--wsu-ink)]">WordPress embed</p>
              <textarea
                readOnly
                rows={3}
                value={view.public ? `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/view/${view.slug}?view=${view.id}&embed=1" style="width:100%;border:0;min-height:640px;" loading="lazy"></iframe>` : "Publish the view to generate an embed snippet."}
                className="mt-2 w-full rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-3 py-2 font-mono text-xs text-[color:var(--wsu-ink)]"
              />
            </div>
          </div>
        )}

        {activeTab === "fields" && (
          <div id="tabpanel-fields" role="tabpanel" aria-labelledby="tab-fields" className="mt-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Columns & display names</h2>
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
                        <label className="flex min-h-[44px] items-center gap-2">
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={() => toggleColumnIncluded(col)}
                            className="rounded border-[color:var(--wsu-border)]"
                          />
                          <span className="text-sm font-medium text-[color:var(--wsu-ink)]">{col.title}</span>
                          <span className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-[10px] font-mono text-[color:var(--wsu-muted)]" title="Smartsheet column type">
                            {col.type ?? "TEXT_NUMBER"}
                          </span>
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

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Arrange</h2>
              <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Reorder columns for display. Order here = display order in the view.</p>
              <div className="mt-4 space-y-3">
          {view.fields.length === 0 ? (
            <p className="text-sm text-[color:var(--wsu-muted)]">Select columns above to add them here, then reorder.</p>
          ) : (
            view.fields.map((field, index) => {
              const isUnmapped = !field.source.columnId && !field.source.columnTitle;
              return (
              <div
                key={`${field.key}-${index}`}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                  isUnmapped ? "border-amber-400 bg-amber-50/50" : "border-[color:var(--wsu-border)] bg-white"
                }`}
              >
                <div>
                  <p className="font-medium text-[color:var(--wsu-ink)]">{field.label || field.key || "Unnamed"}</p>
                  <p className="text-sm text-[color:var(--wsu-muted)]">
                    Smartsheet: {field.source.columnTitle ?? field.source.columnId ?? (isUnmapped ? "—" : "—")}
                    {isUnmapped && (
                      <span className="ml-2 text-amber-600 font-medium">Map this field to a column</span>
                    )}
                    {field.source.columnType && (
                      <span className="ml-1.5 rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-[10px] font-mono">{field.source.columnType}</span>
                    )}
                  </p>
                  {field.transforms && field.transforms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {field.transforms.map((t, i) => (
                        <span key={i} className="rounded-full bg-[color:var(--wsu-stone)]/40 px-2 py-0.5 text-xs font-medium text-[color:var(--wsu-muted)]">
                          {t.op}
                        </span>
                      ))}
                    </div>
                  )}
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
            );
            })
          )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "filters" && (
          <div id="tabpanel-filters" role="tabpanel" aria-labelledby="tab-filters" className="mt-6 space-y-6">
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
            <div className="space-y-4">
              {(view.filters ?? []).map((filter, index) => (
                <div key={`${filter.columnTitle ?? filter.columnId ?? "filter"}-${index}`} className="grid gap-3 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 md:grid-cols-[1fr_180px_1fr_auto]">
                  {schema ? (
                    <select
                      value={filter.columnId ?? ""}
                      onChange={(event) => {
                        const colId = parseOptionalNumber(event.target.value);
                        const col = schema.columns.find((c) => c.id === colId);
                        updateFilter(index, {
                          ...filter,
                          columnId: colId,
                          columnTitle: col?.title ?? "",
                          columnType: col?.type,
                        });
                      }}
                      className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 min-h-[44px]"
                    >
                      <option value="">Select column</option>
                      {schema.columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title} ({col.type ?? "TEXT_NUMBER"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2 md:col-span-1">
                      <input
                        value={filter.columnTitle ?? ""}
                        onChange={(event) => updateFilter(index, { ...filter, columnTitle: event.target.value })}
                        placeholder="Column title"
                        className="min-w-0 flex-1 rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
                      />
                      <input
                        type="number"
                        value={filter.columnId ?? ""}
                        onChange={(event) => updateFilter(index, { ...filter, columnId: parseOptionalNumber(event.target.value) })}
                        placeholder="ID"
                        className="w-20 rounded-xl border border-[color:var(--wsu-border)] px-3 py-2"
                      />
                    </div>
                  )}
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
                    onChange={(event) => {
                      const raw = event.target.value;
                      const value =
                        filter.op === "in" || filter.op === "not_in"
                          ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                          : raw;
                      updateFilter(index, { ...filter, value });
                    }}
                    placeholder={filter.op === "in" || filter.op === "not_in" ? "Comma-separated values" : "Value"}
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
            <div className="space-y-4">
              {(view.defaultSort ?? []).map((sort, index) => (
                <div key={`${sort.field}-${index}`} className="grid gap-3 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 md:grid-cols-[1fr_180px_auto]">
                  <select
                    value={sort.field}
                    onChange={(event) => updateSort(index, { ...sort, field: event.target.value})}
                    className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 min-h-[44px]"
                  >
                    <option value="">Select field</option>
                    {view.fields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label || f.key}</option>
                    ))}
                  </select>
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
          </div>
        )}

        {activeTab === "preview" && (
          <div id="tabpanel-preview" role="tabpanel" aria-labelledby="tab-preview" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(["full", "768", "375"] as const).map((vp) => (
                  <button
                    key={vp}
                    type="button"
                    onClick={() => setPreviewViewport(vp)}
                    className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium ${
                      previewViewport === vp
                        ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                        : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)]"
                    }`}
                  >
                    {vp === "full" ? "Full" : vp === "768" ? "Tablet (768px)" : "Mobile (375px)"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void fetchPreview()}
                disabled={previewLoading}
                className="min-h-[44px] rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {previewLoading ? "Loading…" : "Refresh preview"}
              </button>
            </div>
            {previewError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{previewError}</p>
            )}
            {previewData?.warnings && previewData.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Schema drift warnings</p>
                <ul className="mt-1 list-disc pl-4">
                  {previewData.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {previewData && (
              <div
                className="overflow-auto rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-4"
                style={{ maxWidth: previewViewport === "full" ? "100%" : previewViewport === "768" ? 768 : 375 }}
              >
                <ViewStyleWrapper style={previewData.resolvedView.style} themePresetId={previewData.resolvedView.themePresetId}>
                  <ViewWithSearchAndIndex view={previewData.resolvedView} layout={previewData.resolvedView.layout} embed={false} />
                </ViewStyleWrapper>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
