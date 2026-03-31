import { FieldValue } from "@/components/public/FieldValue";
import { getRowHeadingText } from "@/components/public/layout-utils";
import { ViewStyleWrapper } from "@/components/public/ViewStyleWrapper";
import type { ResolvedView } from "@/lib/config/types";
import { PrintViewToolbar } from "./PrintViewToolbar";

const PRINT_STYLES = `
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    .print-root { max-width: none !important; padding: 0 !important; }
    .print-article { break-inside: avoid; page-break-inside: avoid; }
    a:link, a:visited { color: inherit; text-decoration: underline; }
  }
`;

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

  return (
    <ViewStyleWrapper style={view.style} themePresetId={view.themePresetId}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <main className="print-root mx-auto max-w-3xl px-4 py-8 text-[color:var(--wsu-ink)]">
        <PrintViewToolbar slug={slug} viewId={viewId} />

        <header className="mb-10 border-b border-[color:var(--wsu-border)] pb-6">
          <p className="font-view-heading text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
            {sourceLabel}
          </p>
          <h1 className="font-view-heading mt-2 text-3xl font-semibold tracking-tight text-[color:var(--wsu-ink)]">
            {pageTitle}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">
            <span className="font-medium text-[color:var(--wsu-ink)]">{view.label}</span>
            {view.description ? ` — ${view.description}` : null}
          </p>
          <p className="mt-3 text-sm text-[color:var(--wsu-muted)]">
            Data from <span className="font-medium text-[color:var(--wsu-ink)]">{sourceName}</span>. Refreshed{" "}
            <time dateTime={fetchedAt}>{refreshed}</time>.
          </p>
        </header>

        <div className="space-y-12">
          {view.rows.map((row) => (
            <article
              key={row.id}
              className="print-article border-b border-[color:var(--wsu-border)]/60 pb-10 last:border-0"
              aria-labelledby={`print-row-heading-${row.id}`}
            >
              <h2
                id={`print-row-heading-${row.id}`}
                className="font-view-heading text-xl font-semibold text-[color:var(--wsu-ink)]"
              >
                {getRowHeadingText(view, row)}
              </h2>
              <div className="mt-4 space-y-5">
                {row.fields.map((field) => (
                  <section key={field.key}>
                    {!field.hideLabel ? (
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--wsu-muted)]">
                        {field.label}
                      </h3>
                    ) : null}
                    <div className={field.hideLabel ? "" : "mt-1.5"}>
                      <FieldValue field={field} stacked />
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>

        {view.rows.length === 0 ? (
          <p className="text-sm text-[color:var(--wsu-muted)]">No rows to display for this view.</p>
        ) : null}
      </main>
    </ViewStyleWrapper>
  );
}
