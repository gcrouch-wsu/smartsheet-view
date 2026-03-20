"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { PublicHeaderLogo } from "@/components/public/PublicHeaderLogo";
import { formatLayoutLabel } from "@/components/public/ViewRenderer";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import { ViewWithSearchAndIndex } from "@/components/public/ViewWithSearchAndIndex";
import { FILTER_OPERATOR_OPTIONS, LAYOUT_OPTIONS, RENDER_TYPE_OPTIONS, TRANSFORM_OPTIONS } from "@/lib/config/options";
import { BUILT_IN_THEMES } from "@/lib/config/themes";
import { getEligibleEditableFieldDefinitions, getFieldsForMultiPersonGroup } from "@/lib/contributor-utils";
import { HeaderCustomTextEditor } from "./HeaderCustomTextEditor";
import { HeaderLogoBrandingSection } from "./HeaderLogoBrandingSection";
import { ThemeEditor } from "./ThemeEditor";
import { CARD_LAYOUT_PLACEHOLDER, CARD_LAYOUT_TEXT_PREFIX } from "@/lib/config/types";
import { VIEW_TEMPLATES, applyViewTemplate } from "@/lib/config/templates";
import { slugify } from "@/lib/utils";
import type { RenderType, SourceConfig, SmartsheetColumn, TransformConfig, ViewConfig, ViewEditingConfig, ViewFieldConfig, ViewFilterConfig, ViewSortConfig } from "@/lib/config/types";
import type { ResolvedView } from "@/lib/config/types";
import type { SmartsheetSchemaSummary } from "@/lib/smartsheet";

import { isHtmlContent, parseFormattedHeaderText, renderHeaderCustomText } from "@/lib/rendering";

type ViewBuilderTab = "setup" | "fields" | "filters" | "editing" | "preview";

function createEmptyTransform(): TransformConfig {
  return { op: "trim" };
}

function VisibilitySelect({ 
  label, 
  value, 
  onChange, 
  description 
}: { 
  label: string; 
  value: boolean; 
  onChange: (show: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-[color:var(--wsu-ink)]">{label}</span>
        <select
          value={value ? "show" : "hide"}
          onChange={(e) => onChange(e.target.value === "show")}
          className="rounded-lg border border-[color:var(--wsu-border)] bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[color:var(--wsu-crimson)]"
        >
          <option value="show">Show</option>
          <option value="hide">Hide</option>
        </select>
      </div>
      {description && <p className="text-[10px] text-[color:var(--wsu-muted)]">{description}</p>}
    </div>
  );
}

function createEmptyField(): ViewFieldConfig {
  return {
    key: "",
    label: "",
    source: { columnTitle: "" },
    transforms: [],
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
    transforms: suggestion.transforms ?? [],
    render: { type: suggestion.render },
  };
}

function buildInitialView(view: ViewConfig | null, sources: SourceConfig[]): ViewConfig {
  if (view) return view;
  const firstSource = sources[0];
  const label = firstSource?.label ?? "";
  const slug = slugify(label);
  return {
    id: slug,
    slug,
    sourceId: firstSource?.id ?? "",
    label,
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
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createEditingConfigState(current?: ViewEditingConfig): ViewEditingConfig {
  return {
    enabled: current?.enabled ?? false,
    contactColumnIds: current?.contactColumnIds ?? [],
    editableColumnIds: current?.editableColumnIds ?? [],
    editableFieldGroups: current?.editableFieldGroups ?? [],
    showLoginLink: current?.showLoginLink !== false,
  };
}

function toggleNumberSelection(values: number[], id: number, checked: boolean) {
  if (checked) {
    return values.includes(id) ? values : [...values, id];
  }
  return values.filter((value) => value !== id);
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
  const contactColumns = useMemo(
    () => schema?.columns.filter((column) => column.type === "CONTACT_LIST" || column.type === "MULTI_CONTACT_LIST") ?? [],
    [schema],
  );
  const eligibleEditableFields = useMemo(
    () => (schema ? getEligibleEditableFieldDefinitions(view, schema.columns) : []),
    [schema, view],
  );
  const fieldsForMultiPersonGroup = useMemo(
    () => (schema ? getFieldsForMultiPersonGroup(view, schema.columns) : []),
    [schema, view],
  );
  const invalidEditableColumnIds = useMemo(() => {
    if (!schema || !view.editing?.enabled) {
      return [];
    }
    const eligibleIds = new Set(eligibleEditableFields.map((field) => field.columnId));
    return view.editing.editableColumnIds.filter((columnId) => !eligibleIds.has(columnId));
  }, [eligibleEditableFields, schema, view.editing]);
  const invalidContactColumnIds = useMemo(() => {
    if (!schema || !view.editing?.enabled) {
      return [];
    }
    const contactIds = new Set(contactColumns.map((column) => column.id));
    return view.editing.contactColumnIds.filter((columnId) => !contactIds.has(columnId));
  }, [contactColumns, schema, view.editing]);

  function update<K extends keyof ViewConfig>(key: K, value: ViewConfig[K]) {
    setView((current) => ({ ...current, [key]: value }));
  }

  function updateEditing(nextEditing: ViewEditingConfig | undefined) {
    update("editing", nextEditing);
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

    try {
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
        const errs = payload.errors ?? payload.warnings ?? [payload.error ?? "Unable to save view."];
        setErrors(errs);
        toast.addToast(errs[0] ?? "Unable to save view.", "error");
        return;
      }

      const saved = payload.view ?? view;
      setView(saved);
      setNotice("View saved.");
      toast.addToast("View saved.", "success");
      router.replace(`/admin/views/${saved.id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setErrors([msg]);
      toast.addToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
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

    try {
      const response = await fetch(`/api/admin/views/${viewId}`, {
        method: "DELETE",
        credentials: FETCH_CREDENTIALS,
      });
      const text = await response.text();
      let payload: { error?: string; errors?: string[] } = {};
      try {
        payload = (text ? JSON.parse(text) : {}) as { error?: string; errors?: string[] };
      } catch {
        payload = { error: "Delete failed. Server returned invalid response." };
      }

      if (!response.ok) {
        const errs = payload.errors ?? [payload.error ?? "Unable to delete view."];
        setErrors(Array.isArray(errs) ? errs : [errs]);
        toast.addToast(Array.isArray(errs) ? errs[0] : errs ?? "Unable to delete view.", "error");
        return;
      }

      toast.addToast("View deleted.", "success");
      router.push("/admin/views");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed.";
      setErrors([msg]);
      toast.addToast(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function togglePublish(nextPublic: boolean) {
    if (isNew) {
      setErrors(["Save the view before changing publication state."]);
      return;
    }

    setIsPublishing(true);

    try {
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
        const errs = payload.errors ?? payload.warnings ?? [payload.error ?? "Unable to update publication state."];
        setErrors(errs);
        toast.addToast(Array.isArray(errs) ? errs[0] : errs ?? "Unable to update publication state.", "error");
        return;
      }

      setView(payload.view);
      setNotice(nextPublic ? "View published." : "View unpublished.");
      toast.addToast(nextPublic ? "View published." : "View unpublished.", "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publish failed.";
      setErrors([msg]);
      toast.addToast(msg, "error");
    } finally {
      setIsPublishing(false);
    }
  }

  function applyTemplate(templateId: string) {
    setView((current) => applyViewTemplate(current, templateId));
    setLastAppliedTemplateId(templateId);
    setActiveTab("fields");
    setErrors([]);
    setNotice("Layout applied. Select columns above to add them to the view.");
    toast.addToast("Layout applied. Select columns to add them.", "info");
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
  const [livePreview, setLivePreview] = useState<{ resolvedView: ResolvedView; warnings: string[] } | null>(null);
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);
  const [livePreviewError, setLivePreviewError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewData(null);
    try {
      const previewBody = {
        ...view,
        id: view.id || "preview",
        slug: view.slug || "preview",
        label: view.label || "Preview",
      };
      const response = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: FETCH_CREDENTIALS,
        body: JSON.stringify(previewBody),
      });
      const payload = (await response.json()) as {
        rows?: ResolvedView["rows"];
        fields?: ResolvedView["fields"];
        warnings?: string[];
        rowCount?: number;
        error?: string;
        errors?: string[];
      };
      if (!response.ok || !payload.rows || !payload.fields) {
        const errMsg =
          Array.isArray(payload.errors) && payload.errors.length > 0
            ? payload.errors.join(" ")
            : payload.error ?? "Preview failed.";
        setPreviewError(errMsg);
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

  useEffect(() => {
    if (activeTab !== "setup" && activeTab !== "fields") return;
    if (!view.sourceId || view.fields.length === 0) {
      setLivePreview(null);
      setLivePreviewError(null);
      return;
    }
    const timer = setTimeout(() => {
      setLivePreviewLoading(true);
      const previewBody = {
        ...view,
        id: view.id || "preview",
        slug: view.slug || "preview",
        label: view.label || "Preview",
      };
      fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: FETCH_CREDENTIALS,
        body: JSON.stringify(previewBody),
      })
        .then((r) => r.json())
        .then((payload: { rows?: ResolvedView["rows"]; fields?: ResolvedView["fields"]; warnings?: string[]; rowCount?: number; error?: string }) => {
          if (payload.rows && payload.fields) {
            setLivePreviewError(null);
            setLivePreview({
              resolvedView: {
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
              },
              warnings: payload.warnings ?? [],
            });
          } else {
            setLivePreview(null);
            setLivePreviewError(payload.error ?? "No preview data");
          }
        })
        .catch(() => {
          setLivePreview(null);
          setLivePreviewError("Failed to load preview");
        })
        .finally(() => setLivePreviewLoading(false));
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeTab, view]);

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
              className="btn-crimson rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--wsu-crimson-dark)] disabled:opacity-50"
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
          {(["setup", "fields", "filters", "editing", "preview"] as const).map((tab) => (
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
              {tab === "editing" && "Editing"}
              {tab === "preview" && "Preview"}
            </button>
          ))}
        </nav>

        {activeTab === "setup" && (
          <div id="tabpanel-setup" role="tabpanel" aria-labelledby="tab-setup" className="mt-6 space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">Layout presets</h3>
              <p className="mb-2 text-sm text-[color:var(--wsu-muted)]">Pick a layout (table, cards, accordion, etc.). Then go to the Fields tab and select which columns to include.</p>
              <p className="mb-4 text-sm text-[color:var(--wsu-muted)]">The Arrange section will show only the columns you select—reorder them there.</p>
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
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Source</span>
            <select
              value={view.sourceId}
              onChange={(event) => {
                const sourceId = event.target.value;
                const source = sources.find((s) => s.id === sourceId);
                setView((prev) => ({
                  ...prev,
                  sourceId,
                  label: prev.label || (source?.label ?? ""),
                  slug: prev.slug || (source?.label ? slugify(source.label) : prev.slug),
                  id: isNew && !prev.id ? (source?.label ? slugify(source.label) : prev.id) : prev.id,
                }));
              }}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.label}</option>
              ))}
            </select>
            <p className="text-xs text-[color:var(--wsu-muted)]">Label, slug, and ID auto-fill from the source when empty.</p>
          </label>
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Label</span>
            <input
              value={view.label}
              onChange={(event) => {
                const label = event.target.value;
                setView((prev) => ({
                  ...prev,
                  label,
                  slug: prev.slug || slugify(label),
                  id: isNew && !prev.id ? slugify(label) : prev.id,
                }));
              }}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
            <p className="text-xs text-[color:var(--wsu-muted)]">Display name. Slug and ID auto-derive when empty.</p>
          </label>
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Slug</span>
            <input
              value={view.slug}
              onChange={(event) => {
                const slug = event.target.value;
                setView((prev) => ({
                  ...prev,
                  slug,
                  id: isNew && !prev.id ? slug : prev.id,
                }));
              }}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
            <p className="text-xs text-[color:var(--wsu-muted)]">URL path (e.g. /view/graduate-programs). ID syncs when empty.</p>
          </label>
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">View ID</span>
            <input
              value={view.id}
              disabled={!isNew}
              onChange={(event) => update("id", event.target.value)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 disabled:bg-[color:var(--wsu-stone)]"
            />
            <p className="text-xs text-[color:var(--wsu-muted)]">Unique identifier. Set once at creation; cannot be changed.</p>
          </label>
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm md:col-span-2">
            <span className="font-medium text-[color:var(--wsu-ink)]">Description</span>
            <textarea
              value={view.description ?? ""}
              onChange={(event) => update("description", event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[color:var(--wsu-ink)]">Layout (override)</span>
              <p className="text-xs text-[color:var(--wsu-muted)]">Override the template layout if you want the same fields in a different arrangement (e.g. cards instead of table).</p>
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
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Tab order</span>
            <input
              type="number"
              value={view.tabOrder ?? 1}
              onChange={(event) => update("tabOrder", parseOptionalNumber(event.target.value) ?? 1)}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3"
            />
          </label>
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Heading field key</span>
            <p className="text-xs text-[color:var(--wsu-muted)]">Main title for cards and accordions. Can also be set in the Fields tab.</p>
            <select
              value={view.presentation?.headingFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, headingFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 min-h-[44px]"
            >
              <option value="">Default (First field)</option>
              {view.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label || f.key}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[72px] flex-col justify-center gap-1 text-sm">
            <span className="font-medium text-[color:var(--wsu-ink)]">Summary field key</span>
            <p className="text-xs text-[color:var(--wsu-muted)]">Sub-heading or secondary text. Can also be set in the Fields tab.</p>
            <select
              value={view.presentation?.summaryFieldKey ?? ""}
              onChange={(event) => update("presentation", { ...view.presentation, summaryFieldKey: event.target.value })}
              className="w-full rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-3 min-h-[44px]"
            >
              <option value="">Default (Second field)</option>
              {view.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label || f.key}</option>
              ))}
            </select>
          </label>

          {["cards", "list", "stacked", "accordion", "tabbed", "list_detail"].includes(view.layout) && (
            <div className="space-y-3 md:col-span-2">
              <div>
                <span className="text-sm font-medium text-[color:var(--wsu-ink)]">Custom card layout</span>
                <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">Define rows and which fields appear in each. Multiple fields in a row appear side-by-side.</p>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={(view.presentation?.cardLayout?.length ?? 0) > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      update("presentation", { ...view.presentation, cardLayout: view.fields.length > 0 ? [{ fieldKeys: [view.fields[0]!.key] }] : [] });
                    } else {
                      update("presentation", { ...view.presentation, cardLayout: undefined });
                    }
                  }}
                  className="rounded border-[color:var(--wsu-border)]"
                />
                <span>Use custom layout</span>
              </label>
              {(view.presentation?.cardLayout?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  {view.presentation!.cardLayout!.map((row, rowIndex) => (
                    <div key={rowIndex} className="rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[color:var(--wsu-ink)]">Row {rowIndex + 1}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(view.presentation?.cardLayout ?? [])];
                              const prev = next[rowIndex - 1];
                              if (prev) {
                                [next[rowIndex - 1], next[rowIndex]] = [next[rowIndex], prev];
                                update("presentation", { ...view.presentation, cardLayout: next });
                              }
                            }}
                            disabled={rowIndex === 0}
                            className="rounded border border-[color:var(--wsu-border)] px-2 py-1 text-xs disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(view.presentation?.cardLayout ?? [])];
                              const nxt = next[rowIndex + 1];
                              if (nxt) {
                                [next[rowIndex], next[rowIndex + 1]] = [nxt, next[rowIndex]];
                                update("presentation", { ...view.presentation, cardLayout: next });
                              }
                            }}
                            disabled={rowIndex === (view.presentation?.cardLayout?.length ?? 0) - 1}
                            className="rounded border border-[color:var(--wsu-border)] px-2 py-1 text-xs disabled:opacity-40"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = (view.presentation?.cardLayout ?? []).filter((_, i) => i !== rowIndex);
                              update("presentation", { ...view.presentation, cardLayout: next.length > 0 ? next : undefined });
                            }}
                            className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                          >
                            Remove row
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {row.fieldKeys.map((key, keyIndex) => {
                          const isPlaceholder = key === CARD_LAYOUT_PLACEHOLDER;
                          const isStaticText = key.startsWith(CARD_LAYOUT_TEXT_PREFIX);
                          const staticLabel = isStaticText ? key.slice(CARD_LAYOUT_TEXT_PREFIX.length) : "";
                          const field = view.fields.find((f) => f.key === key);
                          const keys = row.fieldKeys;
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-[color:var(--wsu-ink)] border border-[color:var(--wsu-border)]"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (keyIndex <= 0) return;
                                  const next = [...(view.presentation?.cardLayout ?? [])];
                                  const nextKeys = [...keys];
                                  [nextKeys[keyIndex - 1], nextKeys[keyIndex]] = [nextKeys[keyIndex]!, nextKeys[keyIndex - 1]!];
                                  next[rowIndex] = { fieldKeys: nextKeys };
                                  update("presentation", { ...view.presentation, cardLayout: next });
                                }}
                                disabled={keyIndex === 0}
                                className="text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-crimson)] disabled:opacity-40"
                                title="Move left"
                              >
                                ←
                              </button>
                              {isPlaceholder ? (
                                <span className="italic text-[color:var(--wsu-muted)]">(placeholder)</span>
                              ) : isStaticText ? (
                                <span className="text-[color:var(--wsu-muted)]">&quot;{staticLabel}&quot;</span>
                              ) : (
                                field?.label ?? key
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (keyIndex >= keys.length - 1) return;
                                  const next = [...(view.presentation?.cardLayout ?? [])];
                                  const nextKeys = [...keys];
                                  [nextKeys[keyIndex], nextKeys[keyIndex + 1]] = [nextKeys[keyIndex + 1]!, nextKeys[keyIndex]!];
                                  next[rowIndex] = { fieldKeys: nextKeys };
                                  update("presentation", { ...view.presentation, cardLayout: next });
                                }}
                                disabled={keyIndex === keys.length - 1}
                                className="text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-crimson)] disabled:opacity-40"
                                title="Move right"
                              >
                                →
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(view.presentation?.cardLayout ?? [])];
                                  const nextKeys = next[rowIndex]!.fieldKeys.filter((_, i) => i !== keyIndex);
                                  next[rowIndex] = { fieldKeys: nextKeys };
                                  if (nextKeys.length === 0) {
                                    next.splice(rowIndex, 1);
                                  }
                                  update("presentation", { ...view.presentation, cardLayout: next.length > 0 ? next : undefined });
                                }}
                                className="ml-1 text-[color:var(--wsu-muted)] hover:text-rose-600"
                                title="Remove from row"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                        <select
                          value=""
                          onChange={(e) => {
                            const key = e.target.value;
                            if (!key) return;
                            const next = [...(view.presentation?.cardLayout ?? [])];
                            const nextKeys = [...(next[rowIndex]?.fieldKeys ?? []), key];
                            next[rowIndex] = { fieldKeys: nextKeys };
                            update("presentation", { ...view.presentation, cardLayout: next });
                            e.target.value = "";
                          }}
                          className="rounded border border-[color:var(--wsu-border)] bg-white px-2 py-1 text-xs min-h-[32px]"
                        >
                          <option value="">Add field</option>
                          <option value={CARD_LAYOUT_PLACEHOLDER}>Add placeholder (blank for alignment)</option>
                          {view.fields
                            .filter((f) => !row.fieldKeys.includes(f.key))
                            .map((f) => (
                              <option key={f.key} value={f.key}>{f.label || f.key}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Static text label"
                            className="w-28 rounded border border-[color:var(--wsu-border)] bg-white px-2 py-1 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const input = e.currentTarget;
                                const label = input.value.trim();
                                if (label) {
                                  const key = `${CARD_LAYOUT_TEXT_PREFIX}${label}`;
                                  const next = [...(view.presentation?.cardLayout ?? [])];
                                  const nextKeys = [...(next[rowIndex]?.fieldKeys ?? []), key];
                                  next[rowIndex] = { fieldKeys: nextKeys };
                                  update("presentation", { ...view.presentation, cardLayout: next });
                                  input.value = "";
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              const input = (e.currentTarget as HTMLButtonElement).parentElement?.querySelector("input[type='text']") as HTMLInputElement | null;
                              const label = input?.value?.trim();
                              if (label) {
                                const key = `${CARD_LAYOUT_TEXT_PREFIX}${label}`;
                                const next = [...(view.presentation?.cardLayout ?? [])];
                                const nextKeys = [...(next[rowIndex]?.fieldKeys ?? []), key];
                                next[rowIndex] = { fieldKeys: nextKeys };
                                update("presentation", { ...view.presentation, cardLayout: next });
                                if (input) input.value = "";
                              }
                            }}
                            className="rounded border border-[color:var(--wsu-border)] px-2 py-1 text-xs"
                          >
                            Add text
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(view.presentation?.cardLayout ?? []), { fieldKeys: [] }];
                      update("presentation", { ...view.presentation, cardLayout: next });
                    }}
                    className="rounded border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-sm font-medium"
                  >
                    Add row
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Layout & cards */}
          {["cards", "list", "stacked", "accordion", "tabbed", "list_detail"].includes(view.layout) && (
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--wsu-muted)]">Layout & cards</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--wsu-muted)]">Row dividers</label>
                  <select
                    value={view.presentation?.rowDividerStyle ?? "default"}
                    onChange={(e) => update("presentation", { ...view.presentation, rowDividerStyle: e.target.value as "default" | "subtle" | "none" })}
                    className="w-full max-w-xs rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="subtle">Subtle</option>
                    <option value="none">None</option>
                  </select>
                  <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">Divider between rows/cards.</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={view.presentation?.hideRowBadge ?? false}
                    onChange={(e) => update("presentation", { ...view.presentation, hideRowBadge: e.target.checked })}
                    className="rounded border-[color:var(--wsu-border)]"
                  />
                  <span>Hide row badge</span>
                </label>
              </div>
            </div>
          )}

          {/* Page Header & Branding */}
          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--wsu-muted)]">Page Header & Branding</h3>
            <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">Customize the top section of your public page.</p>
            
            <div className="mt-6 space-y-8">
              <VisibilitySelect
                label="Page header"
                value={!view.presentation?.hideHeader}
                onChange={(show) => update("presentation", { ...view.presentation, hideHeader: !show })}
                description="The top card with custom text and status. Hide when neither is needed."
              />
              {/* Custom Content */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[color:var(--wsu-ink)]">Custom header text</span>
                  <label className="flex items-center gap-2 text-xs font-medium text-[color:var(--wsu-muted)] cursor-pointer hover:text-[color:var(--wsu-crimson)]">
                    <input 
                      type="checkbox" 
                      checked={view.presentation?.headerCustomText !== undefined} 
                      onChange={(e) => {
                        if (!e.target.checked) {
                          update("presentation", { ...view.presentation, headerCustomText: undefined });
                        } else {
                          update("presentation", { ...view.presentation, headerCustomText: "" });
                        }
                      }}
                      className="rounded border-[color:var(--wsu-border)]"
                    />
                    Enable custom text
                  </label>
                </div>
                {view.presentation?.headerCustomText !== undefined && (
                  <HeaderCustomTextEditor
                    value={view.presentation?.headerCustomText ?? ""}
                    onChange={(v) => update("presentation", { ...view.presentation, headerCustomText: v || undefined })}
                    placeholder="Enter branding, instructions, or extra links..."
                  />
                )}
              </div>

              <HeaderLogoBrandingSection
                viewLabel={view.label}
                presentation={view.presentation}
                onPresentationChange={(next) => update("presentation", next)}
              />

              <div className="grid gap-8 md:grid-cols-2">
                {/* Visibility Toggles */}
                <div className="space-y-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-muted)]">Header Elements</span>
                  <div className="space-y-3">
                    <VisibilitySelect
                      label="Back link"
                      value={!view.presentation?.hideHeaderBackLink}
                      onChange={(show) => update("presentation", { ...view.presentation, hideHeaderBackLink: !show })}
                    />
                    <VisibilitySelect
                      label="Source label"
                      value={!view.presentation?.hideHeaderSourceLabel}
                      onChange={(show) => update("presentation", { ...view.presentation, hideHeaderSourceLabel: !show })}
                    />
                    <VisibilitySelect
                      label="Page title"
                      value={!view.presentation?.hideHeaderPageTitle}
                      onChange={(show) => update("presentation", { ...view.presentation, hideHeaderPageTitle: !show })}
                    />
                    <VisibilitySelect
                      label="Live data text"
                      value={!view.presentation?.hideHeaderLiveDataText}
                      onChange={(show) => update("presentation", { ...view.presentation, hideHeaderLiveDataText: !show })}
                    />
                  </div>
                </div>

                {/* Info Box Toggles */}
                <div className="space-y-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-muted)]">Status/Info Box</span>
                  <div className="space-y-3">
                    <VisibilitySelect
                      label="Status Box"
                      value={!view.presentation?.hideHeaderInfoBox}
                      onChange={(show) => update("presentation", { ...view.presentation, hideHeaderInfoBox: !show })}
                      description="Shows active view, row count, and refresh time."
                    />
                    
                    {!view.presentation?.hideHeaderInfoBox && (
                      <div className="ml-4 space-y-3 border-l-2 border-[color:var(--wsu-border)] pl-4 animate-in fade-in slide-in-from-left-2 duration-200">
                        <VisibilitySelect
                          label="Active view name"
                          value={!view.presentation?.hideHeaderActiveView}
                          onChange={(show) => update("presentation", { ...view.presentation, hideHeaderActiveView: !show })}
                        />
                        <VisibilitySelect
                          label="Row count"
                          value={!view.presentation?.hideHeaderRows}
                          onChange={(show) => update("presentation", { ...view.presentation, hideHeaderRows: !show })}
                        />
                        <VisibilitySelect
                          label="Refresh time"
                          value={!view.presentation?.hideHeaderRefreshed}
                          onChange={(show) => update("presentation", { ...view.presentation, hideHeaderRefreshed: !show })}
                        />
                        {view.editing?.enabled && (
                          <VisibilitySelect
                            label="Contributor sign in"
                            value={view.editing.showLoginLink !== false}
                            onChange={(show) =>
                              update("editing", {
                                ...createEditingConfigState(view.editing),
                                enabled: true,
                                showLoginLink: show,
                              })
                            }
                            description="Shows login link in status box. Same setting as Editing tab."
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 md:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--wsu-muted)]">Content Area (below header)</h3>
            <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">Control the title, tabs, and layout switcher displayed above your data.</p>
            
            <div className="mt-6 space-y-6">
              <VisibilitySelect
                label="View title section"
                value={!view.presentation?.hideViewTitleSection}
                onChange={(show) => update("presentation", { ...view.presentation, hideViewTitleSection: !show })}
                description="The h2 title and optional description below the tabs."
              />

              <div className="space-y-4 rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-4">
                <VisibilitySelect
                  label="View tabs"
                  value={!view.presentation?.hideViewTabs}
                  onChange={(show) => update("presentation", { ...view.presentation, hideViewTabs: !show })}
                  description="Navigation tabs when multiple views share a slug."
                />
                
                {!view.presentation?.hideViewTabs && (
                  <div className="ml-4 space-y-4 border-l-2 border-[color:var(--wsu-border)] pl-4 animate-in fade-in slide-in-from-left-2 duration-200">
                    <VisibilitySelect
                      label="Row count on tabs"
                      value={!view.presentation?.hideViewTabCount}
                      onChange={(show) => update("presentation", { ...view.presentation, hideViewTabCount: !show })}
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-[color:var(--wsu-ink)]">Custom tab label</span>
                      <input 
                        type="text" 
                        value={view.presentation?.viewTabLabel ?? ""} 
                        onChange={(e) => update("presentation", { ...view.presentation, viewTabLabel: e.target.value || undefined })} 
                        placeholder={view.label} 
                        className="w-full rounded-lg border border-[color:var(--wsu-border)] bg-white px-3 py-2 text-sm" 
                      />
                      <p className="text-[10px] text-[color:var(--wsu-muted)]">Overrides the view label on the tab.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <VisibilitySelect
                  label="Layout switcher"
                  value={!view.fixedLayout}
                  onChange={(show) => update("fixedLayout", !show)}
                  description="Allow viewers to switch between table, cards, and list views."
                />
              </div>
            </div>
          </div>

            </div>

          <ThemeEditor view={view} update={update} />

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
              <p className="mt-1">
                <span className="font-medium">Public URL:</span>{" "}
                {view.public ? (
                  <a
                    href={`${typeof window !== "undefined" ? window.location.origin : ""}/view/${view.slug}?view=${view.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[color:var(--wsu-crimson)] underline hover:text-[color:var(--wsu-crimson-dark)]"
                  >
                    {typeof window !== "undefined" ? window.location.origin : ""}/view/{view.slug}?view={view.id}
                  </a>
                ) : (
                  "Not published."
                )}
              </p>
              <p className="mt-3 font-medium text-[color:var(--wsu-ink)]">WordPress embed</p>
              <textarea
                readOnly
                rows={3}
                value={view.public ? `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/view/${view.slug}?view=${view.id}&embed=1" style="width:100%;border:0;min-height:640px;" loading="lazy"></iframe>` : "Publish the view to generate an embed snippet."}
                className="mt-2 w-full rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-3 py-2 font-mono text-xs text-[color:var(--wsu-ink)]"
              />
            </div>

            {view.sourceId && view.fields.length > 0 && (
              <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4">
                <p className="text-sm font-semibold text-[color:var(--wsu-ink)]">Live preview</p>
                <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">Updates as you edit (1s delay)</p>
                {livePreviewLoading ? (
                  <p className="mt-4 text-sm text-[color:var(--wsu-muted)]">Loading…</p>
                ) : livePreview ? (
                  <div className="mt-3 max-h-[500px] overflow-auto rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-3">
                    <div className="scale-[0.85] origin-top">
                      <ViewStyleWrapper style={livePreview.resolvedView.style} themePresetId={livePreview.resolvedView.themePresetId}>
                        {!view.presentation?.hideHeader && (
                        <header className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-6 shadow-[0_24px_64px_rgba(35,31,32,0.07)]">
                          <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                              <PublicHeaderLogo presentation={view.presentation} />
                              <div className="min-w-0 flex-1 space-y-3">
                              {!view.presentation?.hideHeaderBackLink && (
                                <span className="text-[10px] font-medium text-[color:var(--wsu-muted)]">
                                  Back to configured pages
                                </span>
                              )}
                              <div>
                                {!view.presentation?.hideHeaderSourceLabel && (
                                  <p className="font-view-heading text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                                    {sourceMap.get(view.sourceId) ?? "Source Label"}
                                  </p>
                                )}
                                {!view.presentation?.hideHeaderPageTitle && (
                                  <h1 className="font-view-heading mt-1 text-xl font-semibold tracking-tight text-[color:var(--wsu-ink)]">
                                    {view.label || "Page Title"}
                                  </h1>
                                )}
                              </div>
                              {view.presentation?.headerCustomText && (
                                <div className="mt-2 text-xs leading-5 text-[color:var(--wsu-ink)]">
                                  {isHtmlContent(view.presentation.headerCustomText) ? (
                                    <div
                                      className="custom-header-text [&_a]:text-[color:var(--wsu-crimson)] [&_a]:underline"
                                      dangerouslySetInnerHTML={{
                                        __html: renderHeaderCustomText(
                                          view.presentation.headerCustomText,
                                          `https://example.com/view/${view.slug || "slug"}?view=${view.id}`
                                        ),
                                      }}
                                    />
                                  ) : (
                                    <div className="custom-header-text">
                                      {view.presentation.headerCustomText.split("\n").map((line, i) => (
                                        <p key={i} className="whitespace-pre-wrap">
                                          {parseFormattedHeaderText(
                                            line, 
                                            `https://example.com/view/${view.slug || "slug"}?view=${view.id}`
                                          ).map((part, j) =>
                                            typeof part === "string" ? (
                                              <span key={j}>{part}</span>
                                            ) : (
                                              <span
                                                key={j}
                                                className="text-[color:var(--wsu-crimson)] underline"
                                              >
                                                {part.c}
                                              </span>
                                            )
                                          )}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            </div>
                            {/* Info Box */}
                            {!view.presentation?.hideHeaderInfoBox && 
                              (!view.presentation?.hideHeaderActiveView || 
                               !view.presentation?.hideHeaderRows || 
                               !view.presentation?.hideHeaderRefreshed) && (
                              <div className="shrink-0">
                                <div className="rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-[10px] text-[color:var(--wsu-muted)] leading-tight">
                                  {!view.presentation?.hideHeaderActiveView && (
                                    <p>
                                      <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Active view:</span> {view.label}
                                    </p>
                                  )}
                                  {!view.presentation?.hideHeaderRows && (
                                    <p className={!view.presentation?.hideHeaderActiveView ? "mt-1.5" : ""}>
                                      <span className="font-semibold text-[color:var(--wsu-ink)]">Rows:</span> {livePreview.resolvedView.rowCount}
                                    </p>
                                  )}
                                  {!view.presentation?.hideHeaderRefreshed && (
                                    <p className={!view.presentation?.hideHeaderActiveView || !view.presentation?.hideHeaderRows ? "mt-1.5" : ""}>
                                      <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Refreshed:</span> {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </header>
                        )}
                        <div className="mt-4 space-y-4">
                          {!view.presentation?.hideViewTabs && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              <span className="rounded-full border border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] px-4 py-2 text-[10px] font-medium text-white whitespace-nowrap">
                                {view.presentation?.viewTabLabel ?? view.label}
                                {!view.presentation?.hideViewTabCount && ` ${livePreview.resolvedView.rowCount}`}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {!view.presentation?.hideViewTitleSection && (
                              <div>
                                <h2 className="font-view-heading text-lg font-semibold text-[color:var(--wsu-ink)]">{view.label}</h2>
                                {view.description && (
                                  <p className="mt-1 text-[10px] text-[color:var(--wsu-muted)]">{view.description}</p>
                                )}
                              </div>
                            )}
                            {!view.fixedLayout && (
                              <div className="flex flex-wrap gap-2">
                                {LAYOUT_OPTIONS.map((option) => {
                                  const active = option === livePreview.resolvedView.layout;
                                  return (
                                    <span
                                      key={option}
                                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                                        active
                                          ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                                          : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)]"
                                      }`}
                                    >
                                      {formatLayoutLabel(option)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <ViewWithSearchAndIndex view={livePreview.resolvedView} layout={livePreview.resolvedView.layout} embed={false} />
                        </div>
                      </ViewStyleWrapper>
                    </div>
                  </div>
                ) : livePreviewError ? (
                  <p className="mt-4 text-sm text-amber-600">{livePreviewError}</p>
                ) : (
                  <p className="mt-4 text-sm text-[color:var(--wsu-muted)]">Preview will appear when data is loaded. Ensure the view is saved and the source has data.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "fields" && (
          <div id="tabpanel-fields" role="tabpanel" aria-labelledby="tab-fields" className="mt-6 space-y-6">
            <div className="rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 px-4 py-3 text-sm text-[color:var(--wsu-muted)]">
              <p className="font-medium text-[color:var(--wsu-ink)]">Steps:</p>
              <ol className="mt-1 list-decimal list-inside space-y-1">
                <li>Select a source in Setup, then click <strong>Load columns</strong> below.</li>
                <li>Check each column you want in the view; edit display names as needed.</li>
                <li>Use the Arrange section to reorder fields (up/down) or remove ones you don&apos;t need.</li>
                <li>Switch to Preview to see the result.</li>
              </ol>
            </div>
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
              {["cards", "list", "stacked", "accordion", "tabbed", "list_detail"].includes(view.layout) && (
                <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">
                  To control field layout <em>within</em> each card (rows, side-by-side), go to <strong>Setup</strong> → <strong>Custom card layout</strong> and enable it.
                </p>
              )}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      value={field.label}
                      onChange={(e) => updateField(index, { ...field, label: e.target.value })}
                      placeholder={field.key || "Display name"}
                      className="min-w-0 flex-1 rounded-xl border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-sm font-medium"
                    />
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                    Smartsheet: {field.source.columnTitle ?? field.source.columnId ?? (isUnmapped ? "—" : "—")}
                    {isUnmapped && (
                      <span className="ml-2 text-amber-600 font-medium">Map this field to a column</span>
                    )}
                  {field.source.columnType && (
                      <span className="ml-1.5 rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-[10px] font-mono">{field.source.columnType}</span>
                    )}
                  </p>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-muted)]">
                      <span>Render as</span>
                      <select
                        value={field.render.type}
                        onChange={(e) => updateField(index, { ...field, render: { ...field.render, type: e.target.value as RenderType } })}
                        className="w-full rounded-xl border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-xs font-medium focus:border-[color:var(--wsu-crimson)] focus:outline-none"
                      >
                        {RENDER_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </label>
                    {(["list", "mailto_list", "phone_list"].includes(field.render.type) ||
                      (field.render.type === "text" && field.transforms?.some((t) => t.op === "split"))) && (
                      <>
                        <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-muted)]">
                          <span>List display</span>
                          <select
                            value={field.render.listDisplay ?? "stacked"}
                            onChange={(e) => updateField(index, { ...field, render: { ...field.render, listDisplay: (e.target.value || undefined) as "inline" | "stacked" | undefined } })}
                            className="w-full rounded-xl border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-xs font-medium focus:border-[color:var(--wsu-crimson)] focus:outline-none"
                          >
                            <option value="stacked">Stacked (each on own row)</option>
                            <option value="inline">Inline (delimiter between)</option>
                          </select>
                        </label>
                        {field.render.listDisplay === "inline" && (
                          <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-muted)]">
                            <span>Delimiter</span>
                            <input
                              type="text"
                              value={field.render.listDelimiter ?? ", "}
                              onChange={(e) => updateField(index, { ...field, render: { ...field.render, listDelimiter: e.target.value || undefined } })}
                              placeholder=", "
                              className="w-full rounded-xl border border-[color:var(--wsu-border)] bg-white px-3 py-1.5 text-xs font-medium focus:border-[color:var(--wsu-crimson)] focus:outline-none"
                            />
                          </label>
                        )}
                      </>
                    )}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--wsu-muted)]">Transforms</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {field.transforms?.map((t, ti) => (
                          <span key={ti} className="group relative flex items-center gap-1 rounded-full bg-[color:var(--wsu-stone)]/40 px-2 py-0.5 text-[10px] font-medium text-[color:var(--wsu-muted)]">
                            {t.op}
                            {t.op === "split" && (
                              <input
                                type="text"
                                value={t.delimiter ?? ","}
                                onChange={(e) => {
                                  const next = [...(field.transforms ?? [])];
                                  next[ti] = { ...t, delimiter: e.target.value || undefined };
                                  updateField(index, { ...field, transforms: next });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-10 min-w-0 rounded border-0 bg-white/60 px-1 py-0 text-[10px] focus:ring-1"
                                placeholder=","
                                title="Delimiter (e.g. comma)"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...(field.transforms ?? [])];
                                next.splice(ti, 1);
                                updateField(index, { ...field, transforms: next });
                              }}
                              className="text-[color:var(--wsu-muted)] hover:text-rose-600"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const op = e.target.value;
                            const newTransform = op === "split" ? { op: "split", delimiter: "," } : { op };
                            const next = [...(field.transforms ?? []), newTransform];
                            updateField(index, { ...field, transforms: next });
                            e.target.value = "";
                          }}
                          className="rounded-full border border-[color:var(--wsu-border)] bg-white px-2 py-0.5 text-[10px] font-medium"
                        >
                          <option value="">+ Add</option>
                          {TRANSFORM_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-ink)]">
                      <input
                        type="radio"
                        name={`heading-${view.id}`}
                        checked={view.presentation?.headingFieldKey === field.key}
                        onChange={() => update("presentation", { ...view.presentation, headingFieldKey: field.key })}
                        className="text-[color:var(--wsu-crimson)] focus:ring-[color:var(--wsu-crimson)] h-3 w-3"
                      />
                      <span>Heading</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-ink)]">
                      <input
                        type="radio"
                        name={`summary-${view.id}`}
                        checked={view.presentation?.summaryFieldKey === field.key}
                        onChange={() => update("presentation", { ...view.presentation, summaryFieldKey: field.key })}
                        className="text-[color:var(--wsu-crimson)] focus:ring-[color:var(--wsu-crimson)] h-3 w-3"
                      />
                      <span>Summary</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-ink)]">
                      <input
                        type="checkbox"
                        checked={field.hideLabel ?? false}
                        onChange={(e) => updateField(index, { ...field, hideLabel: e.target.checked })}
                        className="rounded border-[color:var(--wsu-border)] text-[color:var(--wsu-crimson)] focus:ring-[color:var(--wsu-crimson)] h-3 w-3"
                      />
                      <span>Hide label</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-ink)]">
                      <input
                        type="checkbox"
                        checked={(field.emptyBehavior ?? "show") === "hide"}
                        onChange={(e) => updateField(index, { ...field, emptyBehavior: e.target.checked ? "hide" : "show" })}
                        className="rounded border-[color:var(--wsu-border)] text-[color:var(--wsu-crimson)] focus:ring-[color:var(--wsu-crimson)] h-3 w-3"
                      />
                      <span>Hide when empty</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-[color:var(--wsu-muted)] hover:text-[color:var(--wsu-ink)]" title="Field used for A-Z index and search">
                      <input
                        type="checkbox"
                        checked={view.presentation?.indexFieldKey === field.key}
                        onChange={(e) => update("presentation", { ...view.presentation, indexFieldKey: e.target.checked ? field.key : undefined })}
                        className="rounded border-[color:var(--wsu-border)] text-[color:var(--wsu-crimson)] focus:ring-[color:var(--wsu-crimson)] h-3 w-3"
                      />
                      <span>A-Z index</span>
                    </label>
                  </div>
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

            {(livePreview || livePreviewLoading) && view.sourceId && view.fields.length > 0 && (
              <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4">
                <p className="text-sm font-semibold text-[color:var(--wsu-ink)]">Live preview</p>
                <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">Updates as you map columns and reorder (1s delay)</p>
                {livePreviewLoading ? (
                  <p className="mt-4 text-sm text-[color:var(--wsu-muted)]">Loading…</p>
                ) : livePreview ? (
                  <div className="mt-3 max-h-[500px] overflow-auto rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-3">
                    <div className="scale-[0.85] origin-top">
                      <ViewStyleWrapper style={livePreview.resolvedView.style} themePresetId={livePreview.resolvedView.themePresetId}>
                        {!view.presentation?.hideHeader && (
                        <header className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-6 shadow-[0_24px_64px_rgba(35,31,32,0.07)]">
                          <div className="flex flex-wrap items-start justify-between gap-6">
                            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
                              <PublicHeaderLogo presentation={view.presentation} />
                              <div className="min-w-0 flex-1 space-y-3">
                              {!view.presentation?.hideHeaderBackLink && (
                                <span className="text-[10px] font-medium text-[color:var(--wsu-muted)]">
                                  Back to configured pages
                                </span>
                              )}
                              <div>
                                {!view.presentation?.hideHeaderSourceLabel && (
                                  <p className="font-view-heading text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                                    {sourceMap.get(view.sourceId) ?? "Source Label"}
                                  </p>
                                )}
                                {!view.presentation?.hideHeaderPageTitle && (
                                  <h1 className="font-view-heading mt-1 text-xl font-semibold tracking-tight text-[color:var(--wsu-ink)]">
                                    {view.label || "Page Title"}
                                  </h1>
                                )}
                              </div>
                              {view.presentation?.headerCustomText && (
                                <div className="mt-2 text-xs leading-5 text-[color:var(--wsu-ink)]">
                                  {isHtmlContent(view.presentation.headerCustomText) ? (
                                    <div
                                      className="custom-header-text [&_a]:text-[color:var(--wsu-crimson)] [&_a]:underline"
                                      dangerouslySetInnerHTML={{
                                        __html: renderHeaderCustomText(
                                          view.presentation.headerCustomText,
                                          `https://example.com/view/${view.slug || "slug"}?view=${view.id}`
                                        ),
                                      }}
                                    />
                                  ) : (
                                    <div className="custom-header-text">
                                      {view.presentation.headerCustomText.split("\n").map((line, i) => (
                                        <p key={i} className="whitespace-pre-wrap">
                                          {parseFormattedHeaderText(
                                            line, 
                                            `https://example.com/view/${view.slug || "slug"}?view=${view.id}`
                                          ).map((part, j) =>
                                            typeof part === "string" ? (
                                              <span key={j}>{part}</span>
                                            ) : (
                                              <span
                                                key={j}
                                                className="text-[color:var(--wsu-crimson)] underline"
                                              >
                                                {part.c}
                                              </span>
                                            )
                                          )}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            </div>
                            {/* Info Box */}
                            {!view.presentation?.hideHeaderInfoBox && 
                              (!view.presentation?.hideHeaderActiveView || 
                               !view.presentation?.hideHeaderRows || 
                               !view.presentation?.hideHeaderRefreshed) && (
                              <div className="shrink-0">
                                <div className="rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-[10px] text-[color:var(--wsu-muted)] leading-tight">
                                  {!view.presentation?.hideHeaderActiveView && (
                                    <p>
                                      <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Active view:</span> {view.label}
                                    </p>
                                  )}
                                  {!view.presentation?.hideHeaderRows && (
                                    <p className={!view.presentation?.hideHeaderActiveView ? "mt-1.5" : ""}>
                                      <span className="font-semibold text-[color:var(--wsu-ink)]">Rows:</span> {livePreview.resolvedView.rowCount}
                                    </p>
                                  )}
                                  {!view.presentation?.hideHeaderRefreshed && (
                                    <p className={!view.presentation?.hideHeaderActiveView || !view.presentation?.hideHeaderRows ? "mt-1.5" : ""}>
                                      <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Refreshed:</span> {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </header>
                        )}
                        <div className="mt-4 space-y-4">
                          {!view.presentation?.hideViewTabs && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              <span className="rounded-full border border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] px-4 py-2 text-[10px] font-medium text-white whitespace-nowrap">
                                {view.presentation?.viewTabLabel ?? view.label}
                                {!view.presentation?.hideViewTabCount && ` ${livePreview.resolvedView.rowCount}`}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {!view.presentation?.hideViewTitleSection && (
                              <div>
                                <h2 className="font-view-heading text-lg font-semibold text-[color:var(--wsu-ink)]">{view.label}</h2>
                                {view.description && (
                                  <p className="mt-1 text-[10px] text-[color:var(--wsu-muted)]">{view.description}</p>
                                )}
                              </div>
                            )}
                            {!view.fixedLayout && (
                              <div className="flex flex-wrap gap-2">
                                {LAYOUT_OPTIONS.map((option) => {
                                  const active = option === livePreview.resolvedView.layout;
                                  return (
                                    <span
                                      key={option}
                                      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
                                        active
                                          ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                                          : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)]"
                                      }`}
                                    >
                                      {formatLayoutLabel(option)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <ViewWithSearchAndIndex view={livePreview.resolvedView} layout={livePreview.resolvedView.layout} embed={false} />
                        </div>
                      </ViewStyleWrapper>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
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
                  {schema && filter.columnId && schema.columns.find((c) => c.id === filter.columnId)?.options ? (
                    <select
                      value={String(filter.value ?? "")}
                      onChange={(event) => updateFilter(index, { ...filter, value: event.target.value })}
                      className="rounded-xl border border-[color:var(--wsu-border)] px-3 py-2 min-h-[44px]"
                    >
                      <option value="">Select value</option>
                      {schema.columns
                        .find((c) => c.id === filter.columnId)
                        ?.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  ) : (
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
                  )}
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

        {activeTab === "editing" && (
          <div id="tabpanel-editing" role="tabpanel" aria-labelledby="tab-editing" className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Contributor editing</h2>
                  <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                    Enable row-level editing for contributors who appear in the configured contact columns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchSchema()}
                  disabled={schemaLoading || !view.sourceId}
                  className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {schemaLoading ? "Loading schema..." : schema ? "Refresh schema" : "Load schema"}
                </button>
              </div>

              {schemaError && (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {schemaError}
                </p>
              )}

              {!schema ? (
                <p className="mt-6 text-sm text-[color:var(--wsu-muted)]">
                  Load the source schema to configure contact columns and eligible editable fields.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-4">
                    <input
                      type="checkbox"
                      checked={view.editing?.enabled ?? false}
                      onChange={(event) =>
                        updateEditing({
                          ...createEditingConfigState(view.editing),
                          enabled: event.target.checked,
                        })
                      }
                      className="mt-1 rounded border-[color:var(--wsu-border)]"
                    />
                    <div>
                      <p className="text-sm font-medium text-[color:var(--wsu-ink)]">Enable contributor editing</p>
                      <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">
                        Contributors can edit only rows where their `@wsu.edu` email appears in one of the selected contact columns.
                      </p>
                    </div>
                  </label>

                  {view.editing?.enabled && (
                    <>
                      <section className="rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-5">
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                            Public Login Link
                          </h3>
                          <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                            Control whether the public page shows a contributor sign-in link for this view.
                          </p>
                        </div>
                        <label className="mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--wsu-border)] bg-white p-4">
                          <input
                            type="checkbox"
                            checked={view.editing.showLoginLink !== false}
                            onChange={(event) =>
                              updateEditing({
                                ...createEditingConfigState(view.editing),
                                enabled: true,
                                showLoginLink: event.target.checked,
                              })
                            }
                            className="mt-1 rounded border-[color:var(--wsu-border)]"
                          />
                          <div>
                            <p className="text-sm font-medium text-[color:var(--wsu-ink)]">Show contributor login link on the public page</p>
                            <p className="mt-1 text-xs text-[color:var(--wsu-muted)]">
                              When hidden, contributor editing still works for direct login URLs and existing signed-in contributors.
                            </p>
                          </div>
                        </label>
                      </section>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <section className="space-y-4 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-5">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                              Contact Columns
                            </h3>
                            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                              Any matching contact in these columns grants row edit access. <strong>You must also select Editable Fields or add a Multi-person group below</strong> — contact columns define who can edit, not what.
                            </p>
                          </div>
                          <div className="space-y-3">
                            {contactColumns.length === 0 ? (
                              <p className="text-sm text-[color:var(--wsu-muted)]">
                                No CONTACT_LIST or MULTI_CONTACT_LIST columns are available in this source.
                              </p>
                            ) : (
                              contactColumns.map((column) => {
                                const checked = view.editing?.contactColumnIds.includes(column.id) ?? false;
                                return (
                                  <label
                                    key={column.id}
                                    className="flex items-start gap-3 rounded-xl border border-[color:var(--wsu-border)] bg-white p-3"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        updateEditing({
                                          ...createEditingConfigState(view.editing),
                                          enabled: true,
                                          contactColumnIds: toggleNumberSelection(
                                            view.editing?.contactColumnIds ?? [],
                                            column.id,
                                            event.target.checked,
                                          ),
                                        })
                                      }
                                      className="mt-1 rounded border-[color:var(--wsu-border)]"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-[color:var(--wsu-ink)]">{column.title}</p>
                                      <p className="text-xs text-[color:var(--wsu-muted)]">{column.type}</p>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </section>

                        <section className="space-y-4 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-5">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                              Editable Fields
                            </h3>
                            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                              Select which columns contributors can edit. <strong>At least one is required.</strong> Eligible: visible direct-mapped TEXT_NUMBER, PICKLIST, PHONE (no transforms), and CONTACT_LIST/MULTI_CONTACT_LIST (with contact_emails or contact_names transform).
                            </p>
                          </div>
                          <div className="space-y-3">
                            {eligibleEditableFields.length === 0 ? (
                              <p className="text-sm text-[color:var(--wsu-muted)]">
                                No eligible editable fields. In the <strong>Fields</strong> tab, add a visible TEXT_NUMBER, PICKLIST, PHONE, or CONTACT_LIST/MULTI_CONTACT_LIST field (contact columns need contact_emails or contact_names transform) with direct column mapping. Or use <strong>Multi-person field groups</strong> below for comma-separated columns (e.g. coordinator names, emails).
                              </p>
                            ) : (
                              eligibleEditableFields.map((field) => {
                                const checked = view.editing?.editableColumnIds.includes(field.columnId) ?? false;
                                return (
                                  <label
                                    key={field.columnId}
                                    className="flex items-start gap-3 rounded-xl border border-[color:var(--wsu-border)] bg-white p-3"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) =>
                                        updateEditing({
                                          ...createEditingConfigState(view.editing),
                                          enabled: true,
                                          editableColumnIds: toggleNumberSelection(
                                            view.editing?.editableColumnIds ?? [],
                                            field.columnId,
                                            event.target.checked,
                                          ),
                                        })
                                      }
                                      className="mt-1 rounded border-[color:var(--wsu-border)]"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-[color:var(--wsu-ink)]">{field.label}</p>
                                      <p className="text-xs text-[color:var(--wsu-muted)]">
                                        Column {field.columnId} · {field.columnType} · render {field.renderType}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </section>

                        <section className="space-y-4 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/10 p-5">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                              Multi-person field groups
                            </h3>
                            <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">
                              For columns like &quot;Coordinator&quot; and &quot;Coordinator email&quot; that hold comma-separated values. Contributors edit one card per person; values save comma-separated. Uses a broader field list than Editable Fields — if that section is empty, you can still add a group here.
                            </p>
                          </div>
                          <div className="space-y-4">
                            {(view.editing?.editableFieldGroups ?? []).map((group, groupIdx) => (
                              <div
                                key={group.id}
                                className="rounded-xl border border-[color:var(--wsu-border)] bg-white p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={group.label}
                                    onChange={(e) => {
                                      const next = [...(view.editing?.editableFieldGroups ?? [])];
                                      next[groupIdx] = { ...next[groupIdx]!, label: e.target.value };
                                      updateEditing({ ...createEditingConfigState(view.editing), enabled: true, editableFieldGroups: next });
                                    }}
                                    placeholder="Group label (e.g. Grad program coordinators)"
                                    className="flex-1 rounded-lg border border-[color:var(--wsu-border)] px-3 py-2 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (view.editing?.editableFieldGroups ?? []).filter((_, i) => i !== groupIdx);
                                      updateEditing({ ...createEditingConfigState(view.editing), enabled: true, editableFieldGroups: next });
                                    }}
                                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs text-rose-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                                <div className="grid gap-2 text-sm">
                                  {(["name", "email", "phone"] as const).map((attr) => {
                                    const current = group.attributes.find((a) => a.attribute === attr);
                                    return (
                                      <div key={attr} className="flex items-center gap-2">
                                        <span className="w-14 shrink-0 capitalize text-[color:var(--wsu-muted)]">{attr}:</span>
                                        <select
                                          value={current?.fieldKey ?? ""}
                                          onChange={(e) => {
                                            const fieldKey = e.target.value;
                                            const mpField = (fieldsForMultiPersonGroup.length > 0 ? fieldsForMultiPersonGroup : eligibleEditableFields).find((f) => f.fieldKey === fieldKey);
                                            const columnId = mpField?.columnId ?? 0;
                                            const columnType = mpField && "columnType" in mpField ? mpField.columnType : undefined;
                                            const next = [...(view.editing?.editableFieldGroups ?? [])];
                                            const attrs = [...(next[groupIdx]?.attributes ?? [])];
                                            const existingIdx = attrs.findIndex((a) => a.attribute === attr);
                                            const newAttr = { attribute: attr, fieldKey: fieldKey || "", columnId, columnType };
                                            if (existingIdx >= 0) {
                                              attrs[existingIdx] = newAttr;
                                            } else {
                                              attrs.push(newAttr);
                                            }
                                            next[groupIdx] = { ...next[groupIdx]!, attributes: attrs };
                                            updateEditing({ ...createEditingConfigState(view.editing), enabled: true, editableFieldGroups: next });
                                          }}
                                          className="flex-1 rounded-lg border border-[color:var(--wsu-border)] px-2 py-1.5 text-sm"
                                        >
                                          <option value="">— Select field —</option>
                                          {(fieldsForMultiPersonGroup.length > 0 ? fieldsForMultiPersonGroup : eligibleEditableFields).map((f) => (
                                            <option key={`${f.fieldKey}-${f.columnId}`} value={f.fieldKey}>
                                              {f.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...(view.editing?.editableFieldGroups ?? []), { id: `group-${Date.now()}`, label: "New group", attributes: [] }];
                                updateEditing({ ...createEditingConfigState(view.editing), enabled: true, editableFieldGroups: next });
                              }}
                              className="w-full rounded-xl border border-dashed border-[color:var(--wsu-border)] py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:bg-white"
                            >
                              Add multi-person group
                            </button>
                          </div>
                        </section>
                      </div>

                      {view.editing?.enabled &&
                        (view.editing.editableColumnIds?.length ?? 0) === 0 &&
                        (view.editing.editableFieldGroups?.length ?? 0) === 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <p className="font-semibold">Select what contributors can edit</p>
                          <p className="mt-1">
                            Contact columns define <em>who</em> can edit. You must also select at least one <strong>Editable Field</strong> or add a <strong>Multi-person field group</strong> to define <em>what</em> they can edit.
                          </p>
                        </div>
                      )}

                      {(invalidContactColumnIds.length > 0 || invalidEditableColumnIds.length > 0) && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <p className="font-semibold">Current selections need attention</p>
                          {invalidContactColumnIds.length > 0 && (
                            <p className="mt-2">
                              Contact columns no longer valid: {invalidContactColumnIds.join(", ")}.
                            </p>
                          )}
                          {invalidEditableColumnIds.length > 0 && (
                            <p className="mt-2">
                              Editable columns no longer eligible: {invalidEditableColumnIds.join(", ")}.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-sm text-[color:var(--wsu-muted)]">
                        <p>
                          <span className="font-semibold text-[color:var(--wsu-ink)]">Selected contact columns:</span>{" "}
                          {view.editing.contactColumnIds.length}
                        </p>
                        <p className="mt-2">
                          <span className="font-semibold text-[color:var(--wsu-ink)]">Selected editable columns:</span>{" "}
                          {view.editing.editableColumnIds.length}
                        </p>
                        <p className="mt-2">
                          Save-time validation will re-check these selections against the live schema.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
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
            <div className="flex justify-center rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-4">
              <div
                className="w-full bg-[#f9f4ef] p-4 sm:p-6 lg:p-8"
                style={{ maxWidth: previewViewport === "full" ? "100%" : previewViewport === "768" ? 768 : 375 }}
              >
                <div className="mx-auto max-w-7xl space-y-6 text-left">
                  <ViewStyleWrapper style={previewData.resolvedView.style} themePresetId={previewData.resolvedView.themePresetId}>
                    {!view.presentation?.hideHeader && (
                    <header className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-6 shadow-[0_24px_64px_rgba(35,31,32,0.07)] sm:px-8">
                      <div className="flex flex-wrap items-start justify-between gap-6">
                        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-5">
                          <PublicHeaderLogo presentation={view.presentation} />
                          <div className="min-w-0 flex-1 space-y-3">
                          {!view.presentation?.hideHeaderBackLink && (
                            <span className="text-sm font-medium text-[color:var(--wsu-muted)]">
                              Back to configured pages
                            </span>
                          )}
                          <div>
                            {!view.presentation?.hideHeaderSourceLabel && (
                              <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                                {sourceMap.get(view.sourceId) ?? "Source Label"}
                              </p>
                            )}
                            {!view.presentation?.hideHeaderPageTitle && (
                              <h1 className="font-view-heading mt-2 text-3xl font-semibold tracking-tight text-[color:var(--wsu-ink)] sm:text-4xl">
                                {view.label || "Page Title"}
                              </h1>
                            )}
                            {!view.presentation?.hideHeaderLiveDataText && (
                              <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--wsu-muted)]">
                                Live data from <span className="font-medium text-[color:var(--wsu-ink)]">Smartsheet Asset</span>.
                              </p>
                            )}
                          </div>
                          {view.presentation?.headerCustomText && (
                            <div className="mt-3 text-sm leading-6 text-[color:var(--wsu-ink)]">
                              {isHtmlContent(view.presentation.headerCustomText) ? (
                                <div
                                  className="custom-header-text [&_a]:text-[color:var(--wsu-crimson)] [&_a]:underline"
                                  dangerouslySetInnerHTML={{
                                    __html: renderHeaderCustomText(
                                      view.presentation.headerCustomText,
                                      `https://example.com/view/${view.slug || "slug"}?view=${view.id}`
                                    ),
                                  }}
                                />
                              ) : (
                                <div className="custom-header-text">
                                  {view.presentation.headerCustomText.split("\n").map((line, i) => (
                                    <p key={i} className="whitespace-pre-wrap">
                                      {parseFormattedHeaderText(
                                        line, 
                                        `https://example.com/view/${view.slug || "slug"}?view=${view.id}`
                                      ).map((part, j) =>
                                        typeof part === "string" ? (
                                          <span key={j}>{part}</span>
                                        ) : (
                                          <span
                                            key={j}
                                            className="text-[color:var(--wsu-crimson)] underline cursor-pointer"
                                          >
                                            {part.c}
                                          </span>
                                        )
                                      )}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          </div>
                        </div>
                        {/* Info Box */}
                        {!view.presentation?.hideHeaderInfoBox && 
                          (!view.presentation?.hideHeaderActiveView || 
                           !view.presentation?.hideHeaderRows || 
                           !view.presentation?.hideHeaderRefreshed) && (
                          <div className="shrink-0">
                            <div className="rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-white px-4 py-4 text-sm text-[color:var(--wsu-muted)]">
                              {!view.presentation?.hideHeaderActiveView && (
                                <p>
                                  <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Active view:</span> {view.label}
                                </p>
                              )}
                              {!view.presentation?.hideHeaderRows && (
                                <p className={!view.presentation?.hideHeaderActiveView ? "mt-2" : ""}>
                                  <span className="font-semibold text-[color:var(--wsu-ink)]">Rows:</span> {previewData.resolvedView.rowCount}
                                </p>
                              )}
                              {!view.presentation?.hideHeaderRefreshed && (
                                <p className={!view.presentation?.hideHeaderActiveView || !view.presentation?.hideHeaderRows ? "mt-2" : ""}>
                                  <span className="font-view-heading font-semibold text-[color:var(--wsu-ink)]">Refreshed:</span> {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </header>
                    )}

                    <section className="mt-6 space-y-4">
                      {!view.presentation?.hideViewTabs && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          <span className="rounded-full border border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white whitespace-nowrap">
                            {view.presentation?.viewTabLabel ?? view.label}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {!view.presentation?.hideViewTitleSection && (
                          <div>
                            <h2 className="font-view-heading text-2xl font-semibold text-[color:var(--wsu-ink)]">{view.label}</h2>
                            {view.description && (
                              <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{view.description}</p>
                            )}
                          </div>
                        )}
                        {!view.fixedLayout && (
                          <div className="flex flex-wrap gap-2">
                            {LAYOUT_OPTIONS.map((option) => {
                              const active = option === previewData.resolvedView.layout;
                              return (
                                <span
                                  key={option}
                                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                                    active
                                      ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                                      : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)]"
                                  }`}
                                >
                                  {formatLayoutLabel(option)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <ViewWithSearchAndIndex view={previewData.resolvedView} layout={previewData.resolvedView.layout} embed={false} />
                    </section>
                  </ViewStyleWrapper>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </section>
    </div>
  );
}
