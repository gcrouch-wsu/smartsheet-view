import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicViewRenderer, formatLayoutLabel } from "@/components/public/ViewRenderer";
import { LAYOUT_OPTIONS } from "@/lib/config/options";
import type { LayoutType } from "@/lib/config/types";
import { loadAdminViewPreview } from "@/lib/public-view";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ViewPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const preview = await loadAdminViewPreview(id);

  if (!preview) {
    notFound();
  }

  const requestedLayout = firstValue(resolvedSearchParams.layout);
  const layout = LAYOUT_OPTIONS.includes(requestedLayout as LayoutType)
    ? (requestedLayout as LayoutType)
    : preview.resolvedView.layout;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Preview</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--wsu-ink)]">{preview.viewConfig.label}</h2>
            <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">
              Live preview from {preview.sourceConfig.label} ({preview.sourceName}) with {preview.resolvedView.rowCount} resolved rows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/views/${preview.viewConfig.id}`} className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]">Back to builder</Link>
            {preview.viewConfig.public && (
              <Link href={`/view/${preview.viewConfig.slug}?view=${preview.viewConfig.id}`} className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)]">Open public page</Link>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-4 text-sm text-[color:var(--wsu-muted)]">
          <p><span className="font-semibold text-[color:var(--wsu-ink)]">Fetched:</span> {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.fetchedAt))}</p>
          <p className="mt-1"><span className="font-semibold text-[color:var(--wsu-ink)]">Layout:</span> {formatLayoutLabel(layout)}</p>
          <p className="mt-1"><span className="font-semibold text-[color:var(--wsu-ink)]">Publication:</span> {preview.viewConfig.public ? "Published" : "Draft"}</p>
        </div>

        {preview.schemaWarnings.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Schema drift warnings</p>
            <ul className="mt-2 space-y-1">
              {preview.schemaWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {LAYOUT_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/admin/views/${preview.viewConfig.id}/preview?layout=${option}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                option === layout
                  ? "border-[color:var(--wsu-crimson)] bg-[color:var(--wsu-crimson)] text-white"
                  : "border-[color:var(--wsu-border)] bg-white text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
              }`}
            >
              {formatLayoutLabel(option)}
            </Link>
          ))}
        </div>
        <PublicViewRenderer layout={layout} view={preview.resolvedView} />
      </section>
    </div>
  );
}
