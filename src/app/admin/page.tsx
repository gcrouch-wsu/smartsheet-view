import Link from "next/link";
import { getManagedAdminStorageMode, listManagedAdminUsers } from "@/lib/admin-users";
import { requireAdminPageAccess } from "@/lib/admin-page";
import { listSourceConfigs, listViewConfigs } from "@/lib/config/store";

export default async function AdminDashboardPage() {
  const principal = await requireAdminPageAccess("/admin");
  const [sources, views] = await Promise.all([
    listSourceConfigs(),
    listViewConfigs(),
  ]);
  const managedAdmins = principal.role === "owner" ? await listManagedAdminUsers() : [];
  const publicViews = views.filter((view) => view.public);
  const adminStorageMode = getManagedAdminStorageMode();

  return (
    <div className="space-y-6">
      <section className={`grid gap-4 ${principal.role === "owner" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
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
        {principal.role === "owner" && (
          <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Admins</p>
            <p className="mt-3 text-4xl font-semibold text-[color:var(--wsu-ink)]">{managedAdmins.length + 1}</p>
            <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">One bootstrap owner plus {managedAdmins.length} managed admin account{managedAdmins.length === 1 ? "" : "s"}.</p>
          </article>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Session</p>
        <h2 className="mt-2 text-xl font-semibold text-[color:var(--wsu-ink)]">Signed in as {principal.displayName ?? principal.username}</h2>
        <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">
          {principal.role === "owner"
            ? "This bootstrap owner account comes from environment configuration and can also manage additional admins."
            : adminStorageMode === "database"
              ? "This managed admin account is stored in Postgres and is suitable for production deployments without additional environment-variable users."
              : "This managed admin account is stored in the app's local config files. For Railway or any production deployment where local files are not durable, switch managed admins to Postgres by setting DATABASE_URL."}
        </p>
        {principal.role === "owner" && (
          <Link href="/admin/users" className="link-pill-muted mt-4">
            Manage admin access
          </Link>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Recent sources</h2>
              <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Connection, schema, and role groups.</p>
            </div>
            <Link
              href="/admin/sources"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-ink)] transition hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
            >
              All sources
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {sources.slice(0, 5).map((source) => (
              <Link key={source.id} href={`/admin/sources/${source.id}`} className="group block cursor-pointer rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 transition hover:border-[color:var(--wsu-crimson)] hover:shadow-[0_14px_30px_rgba(35,31,32,0.06)]">
                <p className="font-semibold text-[color:var(--wsu-ink)]">{source.label}</p>
                <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">{source.sourceType} · {source.smartsheetId}</p>
              </Link>
            ))}
            {sources.length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No sources yet.</p>}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_40px_rgba(35,31,32,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-[color:var(--wsu-ink)]">Recent views</h2>
              <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">Layout, fields, preview, and publishing.</p>
            </div>
            <Link
              href="/admin/views"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-ink)] transition hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
            >
              All views
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {views.slice(0, 5).map((view) => (
              <Link key={view.id} href={`/admin/views/${view.id}`} className="group block cursor-pointer rounded-2xl border border-[color:var(--wsu-border)] bg-white px-4 py-4 transition hover:border-[color:var(--wsu-crimson)] hover:shadow-[0_14px_30px_rgba(35,31,32,0.06)]">
                <p className="font-semibold text-[color:var(--wsu-ink)]">{view.label}</p>
                <p className="mt-1 text-sm text-[color:var(--wsu-muted)]">/{view.slug} · {view.layout} · {view.public ? "published" : "draft"}</p>
              </Link>
            ))}
            {views.length === 0 && <p className="text-sm text-[color:var(--wsu-muted)]">No views yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
