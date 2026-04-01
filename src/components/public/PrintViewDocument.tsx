import type { ReactNode } from "react";
import { FieldValue } from "@/components/public/FieldValue";
import { getRowHeadingField } from "@/components/public/layout-utils";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";
import { buildPrintExportStylesheet, getPrintExportConfig } from "@/lib/print-export";
import { PrintViewToolbar } from "./PrintViewToolbar";

function PrintCellInner({ primary, children }: { primary?: boolean; children: ReactNode }) {
  return (
    <div className={primary ? "print-cell-inner print-cell-inner--primary" : "print-cell-inner"}>
      {children}
    </div>
  );
}

type PrintableColumn = {
  key: string;
  label: string;
  heading?: boolean;
};

function canPrintField(field: ResolvedFieldValue | undefined) {
  return Boolean(field && !(field.hideWhenEmpty && field.isEmpty));
}

function getPrintableColumns(view: ResolvedView): PrintableColumn[] {
  const firstHeading = view.rows.map((row) => getRowHeadingField(view, row)).find(Boolean);
  const headingKey = view.presentation?.headingFieldKey ?? firstHeading?.key ?? null;
  const headingLabel =
    (headingKey && view.fields.find((field) => field.key === headingKey)?.label) || firstHeading?.label || "Record";

  const columns: PrintableColumn[] = [];
  const seen = new Set<string>();

  if (headingKey) {
    columns.push({ key: headingKey, label: headingLabel, heading: true });
    seen.add(headingKey);
  }

  for (const field of view.fields) {
    if (field.renderType === "hidden" || seen.has(field.key)) {
      continue;
    }
    const hasAnyValue = view.rows.some((row) => canPrintField(row.fieldMap[field.key]));
    if (hasAnyValue) {
      columns.push({ key: field.key, label: field.label || field.key });
    }
  }

  return columns;
}

export function PrintViewDocument({
  slug,
  viewId,
  pageTitle,
  sourceLabel,
  sourceName,
  fetchedAt,
  view,
}: {
  slug: string;
  viewId: string;
  pageTitle: string;
  sourceLabel: string;
  sourceName: string;
  fetchedAt: string;
  view: ResolvedView;
}) {
  const printConfig = getPrintExportConfig();
  const printStyles = buildPrintExportStylesheet(printConfig);
  const preview = printConfig.screenPreview;
  const refreshed = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fetchedAt));
  const columns = getPrintableColumns(view);

  return (
    <ViewStyleWrapper style={view.style} themePresetId={view.themePresetId}>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <main
        className="print-export print-root mx-auto px-3 py-6 sm:px-4 sm:py-8"
        style={{ maxWidth: preview.rootMaxWidth }}
        lang="en"
      >
        <PrintViewToolbar slug={slug} viewId={viewId} />

        <header className="print-masthead mb-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6">
            <div className="min-w-0">
              <p className="view-header-source-label">{sourceLabel}</p>
              <h1 className="view-header-page-title mt-1 text-balance">{pageTitle}</h1>
            </div>
            <p className="print-masthead-meta shrink-0">
              <span className="font-medium" style={{ color: "var(--print-ink)" }}>
                Source:
              </span>{" "}
              {sourceName}
              <span className="mx-1.5 opacity-60">|</span>
              <span className="font-medium" style={{ color: "var(--print-ink)" }}>
                Printed
              </span>{" "}
              <time dateTime={fetchedAt}>{refreshed}</time>
            </p>
          </div>
          {(view.label !== pageTitle || view.description) && (
            <p className="print-masthead-subtitle mt-2 max-w-[70ch]">
              <span className="font-medium" style={{ color: "var(--print-ink)" }}>
                {view.label}
              </span>
              {view.description ? ` — ${view.description}` : null}
            </p>
          )}
        </header>

        {view.rows.length > 0 ? (
          <div
            className="print-table-wrap overflow-x-auto border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)]"
            style={{ borderRadius: preview.tableBorderRadius }}
          >
            <table className="print-data-table min-w-full border-separate border-spacing-0 text-left">
              <caption>
                {pageTitle}
                {view.label !== pageTitle ? ` · ${view.label}` : ""} ({view.rows.length} row
                {view.rows.length === 1 ? "" : "s"})
              </caption>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} scope="col" className="whitespace-normal">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    {columns.map((column) => {
                      if (column.heading) {
                        const headingField = row.fieldMap[column.key];
                        return (
                          <th key={`${row.id}-${column.key}`} scope="row">
                            {headingField && canPrintField(headingField) ? (
                              <PrintCellInner primary>
                                <FieldValue field={headingField} />
                              </PrintCellInner>
                            ) : (
                              <span className="print-empty-cell">—</span>
                            )}
                          </th>
                        );
                      }

                      const field = row.fieldMap[column.key];
                      return (
                        <td key={`${row.id}-${column.key}`}>
                          {canPrintField(field) ? (
                            <PrintCellInner>
                              <FieldValue field={field!} />
                            </PrintCellInner>
                          ) : (
                            <span className="print-empty-cell">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--wsu-muted)]">No rows to display for this view.</p>
        )}
      </main>
    </ViewStyleWrapper>
  );
}
