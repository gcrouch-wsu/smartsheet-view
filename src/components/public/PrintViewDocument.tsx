import { FieldValue } from "@/components/public/FieldValue";
import { getRowHeadingField, getRowHeadingText } from "@/components/public/layout-utils";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import type { ResolvedFieldValue, ResolvedView } from "@/lib/config/types";
import { PrintViewToolbar } from "./PrintViewToolbar";

const PRINT_STYLES = `
  @page {
    size: landscape;
    margin: 0.55in;
  }

  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    .print-root { max-width: none !important; padding: 0 !important; }
    .print-table-wrap { overflow: visible !important; }
    .print-table th,
    .print-table td {
      break-inside: avoid;
      page-break-inside: avoid;
      vertical-align: top;
    }
    .print-table th {
      letter-spacing: 0.1em;
    }
    a:link,
    a:visited {
      color: inherit;
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
      <main className="print-root mx-auto max-w-[92rem] px-4 py-8 text-[color:var(--wsu-ink)]">
        <PrintViewToolbar slug={slug} viewId={viewId} />

        <header className="mb-8 border-b border-[color:var(--wsu-border)] pb-6">
          <p className="view-field-label text-[color:var(--wsu-crimson)]">{sourceLabel}</p>
          <h1 className="font-view-heading mt-2 text-3xl font-semibold tracking-tight text-[color:var(--wsu-ink)]">
            {pageTitle}
          </h1>
          {(view.label !== pageTitle || view.description) && (
            <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">
              <span className="font-medium text-[color:var(--wsu-ink)]">{view.label}</span>
              {view.description ? ` - ${view.description}` : null}
            </p>
          )}
          <p className="mt-3 text-sm text-[color:var(--wsu-muted)]">
            Data from <span className="font-medium text-[color:var(--wsu-ink)]">{sourceName}</span>. Refreshed{" "}
            <time dateTime={fetchedAt}>{refreshed}</time>.
          </p>
        </header>

        {view.rows.length > 0 ? (
          <div className="print-table-wrap overflow-x-auto rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)]">
            <table className="print-table min-w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                {pageTitle} - {view.label} printable table
              </caption>
              <thead>
                <tr className="view-surface-muted border-b border-[color:var(--wsu-border)]">
                  {columns.map((column) => (
                    <th key={column.key} scope="col" className="view-field-label min-w-[9rem] px-4 py-3 text-[color:var(--wsu-muted)]">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.id} className="border-b border-[color:var(--wsu-border)]/60 align-top last:border-b-0">
                    {columns.map((column) => {
                      if (column.heading) {
                        const headingField = getRowHeadingField(view, row);
                        return (
                          <td key={`${row.id}-${column.key}`} className="px-4 py-4">
                            {headingField && canPrintField(headingField) ? (
                              <div className="view-row-heading text-[color:var(--wsu-ink)]">
                                <FieldValue field={headingField} />
                              </div>
                            ) : (
                              <span className="view-row-heading text-[color:var(--wsu-ink)]">{getRowHeadingText(view, row)}</span>
                            )}
                          </td>
                        );
                      }

                      const field = row.fieldMap[column.key];
                      return (
                        <td key={`${row.id}-${column.key}`} className="px-4 py-4">
                          {canPrintField(field) ? <FieldValue field={field!} /> : null}
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
