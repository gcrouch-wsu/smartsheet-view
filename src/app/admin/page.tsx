import Link from "next/link";
import { listSourceConfigs, listViewConfigs } from "@/lib/config/store";

export default async function AdminDashboardPage() {
  const [sources, views] = await Promise.all([listSourceConfigs(), listViewConfigs()]);
  const publicViews = views.filter((view) => view.public);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Sources</p>
          <p className="mt-3 text-4xl font-semibold text-[color:var(--wsu-ink)]">{sources.length}</p>
          <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">Registered Smartsheet sheets or reports.</p>
        </article>
        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Views</p>
          <p className="mt-3 text-4xl font-semibold text-[color:var(--wsu-ink)]">{views.length}</p>
          <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">Editable public view definitions across all slugs.</p>
        </article>
        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Published</p>
          <p className="mt-3 text-4xl font-semibold text-[color:var(--wsu-ink)]">{publicViews.length}</p>
          <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">Views currently exposed on public routes.</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Recent sources</h2>
              <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Edit connection details, test access, and inspect schema.</p>
            </div>
            <Link href="/admin/sources" className="text-sm font-medium text-[color:var(--wsu-crimson)]">Open registry</Link>
          </div>
          <div className="mt-4 space-y-3">
            {sources.slice(0, 5).map((source) => (
              <Link key={source.id} href={`/admin/sources/${source.id}`} className="block rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 hover:border-[color:var(--wsu-crimson)]">
                <p className="font-semibold text-[color:var(--wsu-ink)]">{source.label}</p>
                <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{source.sourceType} � {source.smartsheetId}</p>
              </Link>
            ))}
            {sources.length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No sources yet.</p>}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Recent views</h2>
              <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Open a view to change layout, fields, preview, or publication state.</p>
            </div>
            <Link href="/admin/views" className="text-sm font-medium text-[color:var(--wsu-crimson)]">Open views</Link>
          </div>
          <div className="mt-4 space-y-3">
            {views.slice(0, 5).map((view) => (
              <Link key={view.id} href={`/admin/views/${view.id}`} className="block rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 hover:border-[color:var(--wsu-crimson)]">
                <p className="font-semibold text-[color:var(--wsu-ink)]">{view.label}</p>
                <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">/{view.slug} � {view.layout} � {view.public ? "published" : "draft"}</p>
              </Link>
            ))}
            {views.length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No views yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
