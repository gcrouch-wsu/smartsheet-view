import type { AdminViewPreview } from "@/lib/public-view";

/** Display-oriented export: rows × field values only (no full view config / theme). */
export function buildSlimViewExportPayload(preview: AdminViewPreview) {
  return {
    format: "slim" as const,
    exportedAt: new Date().toISOString(),
    viewId: preview.viewConfig.id,
    viewLabel: preview.viewConfig.label,
    sourceId: preview.viewConfig.sourceId,
    schemaWarnings: preview.schemaWarnings,
    rowCount: preview.resolvedView.rowCount,
    fields: preview.resolvedView.fields.map((f) => ({
      key: f.key,
      label: f.label,
      renderType: f.renderType,
    })),
    // Includes hidden renderType fields when present (same row snapshot as admin preview; useful for audits).
    rows: preview.resolvedView.rows.map((row) => ({
      id: row.id,
      cells: row.fields.map((f) => ({
        key: f.key,
        renderType: f.renderType,
        textValue: f.textValue,
        listValue: f.listValue,
        links: f.links,
        people: f.people,
      })),
    })),
    fetchedAt: preview.fetchedAt,
  };
}
