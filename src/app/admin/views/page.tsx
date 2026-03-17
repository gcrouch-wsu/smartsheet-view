import Link from "next/link";
import { listSourceConfigs, listViewConfigs } from "@/lib/config/store";

export default async function ViewsIndexPage() {
  const [sources, views] = await Promise.all([listSourceConfigs(), listViewConfigs()]);
  const sourceMap = new Map(sources.map((source) => [source.id, source.label]));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[color:var(--wsu-muted)]">Admin routes</p>
          <h2 className="mt-1 text-2xl font-semibold text-[color:var(--wsu-ink)]">Views</h2>
        </div>
        <Link href="/admin/views/new" className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)]">Create view</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {views.map((view) => (
          <article key={view.id} className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">{view.public ? "Published" : "Draft"}</p>
                <h3 className="mt-2 text-2xl font-semibold text-[color:var(--wsu-ink)]">{view.label}</h3>
                <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">Slug: /view/{view.slug}?view={view.id}</p>
                <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Source: {sourceMap.get(view.sourceId) ?? view.sourceId} � Layout: {view.layout}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Link href={`/admin/views/${view.id}`} className="inline-flex items-center rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]">Edit</Link>
                <Link href={`/admin/views/${view.id}/preview`} className="text-sm font-medium text-[color:var(--wsu-crimson)]">Preview</Link>
              </div>
            </div>
          </article>
        ))}
        {views.length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No views registered.</p>}
      </div>
    </section>
  );
}
