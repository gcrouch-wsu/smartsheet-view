import { FieldValue } from "@/components/public/FieldValue";
import { getRowHeadingField } from "@/components/public/layout-utils";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";
import { PrintViewToolbar } from "./PrintViewToolbar";

const PRINT_STYLES = `
  @page {
    size: landscape;
    margin: 0.35in 0.42in;
  }

  @media print {
    .no-print { display: none !important; }
    body {
      background: white !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-root {
      max-width: none !important;
      padding: 0 !important;
      color: #111 !important;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .print-masthead {
      border-bottom: 2pt solid #000 !important;
      padding-bottom: 8pt !important;
      margin-bottom: 10pt !important;
    }
    .print-table-wrap {
      overflow: visible !important;
      border-radius: 0 !important;
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
    }
    .print-data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      line-height: 1.28;
      table-layout: auto;
    }
    .print-data-table caption {
      text-align: left;
      font-size: 8.5pt;
      font-weight: 600;
      color: #333 !important;
      padding: 0 0 6pt 0;
    }
    .print-data-table thead {
      display: table-header-group;
    }
    .print-data-table th {
      text-align: left;
      font-weight: 700;
      letter-spacing: 0 !important;
      text-transform: none !important;
      font-size: 8.5pt;
      border: 1pt solid #111 !important;
      background: #e8e8e8 !important;
      padding: 5pt 5pt 4pt 5pt !important;
      vertical-align: bottom;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .print-data-table td {
      border: 1pt solid #bbb !important;
      padding: 3pt 5pt !important;
      vertical-align: top;
      break-inside: avoid;
      page-break-inside: avoid;
      max-width: 11rem;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    /* Light horizontal rules between programs (rows) for readability */
    .print-data-table tbody tr:not(:first-child) td {
      border-top: 1.25pt solid #e3e3e3 !important;
    }
    .print-data-table tbody tr:nth-child(even) td {
      background: #f7f7f7 !important;
    }
    .print-data-table a:link,
    .print-data-table a:visited {
      color: inherit !important;
      text-decoration: underline;
    }
  }
`;

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
  const refreshed = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fetchedAt));
  const columns = getPrintableColumns(view);

  return (
    <ViewStyleWrapper style={view.style} themePresetId={view.themePresetId}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <main className="print-root mx-auto max-w-[92rem] px-3 py-6 text-[color:var(--wsu-ink)] sm:px-4 sm:py-8">
        <PrintViewToolbar slug={slug} viewId={viewId} />

        <header className="print-masthead mb-6 text-[color:var(--wsu-ink)]">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6">
            <div className="min-w-0">
              <p className="view-header-source-label">{sourceLabel}</p>
              <h1 className="view-header-page-title mt-1 text-balance">{pageTitle}</h1>
            </div>
            <p className="shrink-0 text-xs text-[color:var(--wsu-muted)]">
              <span className="font-medium text-[color:var(--wsu-ink)]">Source:</span> {sourceName}
              <span className="mx-1.5 text-[color:var(--wsu-border)]">|</span>
              <span className="font-medium text-[color:var(--wsu-ink)]">Printed</span>{" "}
              <time dateTime={fetchedAt}>{refreshed}</time>
            </p>
          </div>
          {(view.label !== pageTitle || view.description) && (
            <p className="mt-2 max-w-[70ch] text-xs leading-snug text-[color:var(--wsu-muted)] sm:text-sm">
              <span className="font-medium text-[color:var(--wsu-ink)]">{view.label}</span>
              {view.description ? ` — ${view.description}` : null}
            </p>
          )}
        </header>

        {view.rows.length > 0 ? (
          <div className="print-table-wrap overflow-x-auto rounded-lg border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] sm:rounded-xl">
            <table className="print-data-table print-table min-w-full border-collapse text-left text-xs sm:text-sm">
              <caption>
                {pageTitle}
                {view.label !== pageTitle ? ` · ${view.label}` : ""} ({view.rows.length} row{view.rows.length === 1 ? "" : "s"})
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
                          <td key={`${row.id}-${column.key}`} className="max-w-[11rem] align-top break-words">
                            {headingField && canPrintField(headingField) ? (
                              <div className="view-row-heading font-medium text-[color:var(--wsu-ink)]">
                                <FieldValue field={headingField} />
                              </div>
                            ) : (
                              <span className="text-[color:var(--wsu-muted)]">—</span>
                            )}
                          </td>
                        );
                      }

                      const field = row.fieldMap[column.key];
                      return (
                        <td
                          key={`${row.id}-${column.key}`}
                          className="max-w-[11rem] align-top break-words"
                        >
                          {canPrintField(field) ? <FieldValue field={field!} /> : <span className="text-[color:var(--wsu-muted)]">—</span>}
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
