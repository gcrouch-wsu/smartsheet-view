import Link from "next/link";
import { getPublicPageSummaries } from "@/lib/public-view";
import { testSmartsheetConnection } from "@/lib/smartsheet";

export default async function HomePage() {
  const [pages, connectionOk] = await Promise.all([
    getPublicPageSummaries(),
    testSmartsheetConnection(),
  ]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] shadow-[0_24px_80px_rgba(35,31,32,0.08)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center rounded-full border border-[color:var(--wsu-border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--wsu-crimson)]">
                Admin Builder
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[color:var(--wsu-muted)]">
                  Live Smartsheet display layer
                </p>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--wsu-ink)] sm:text-5xl">
                  Self-service public views for live Smartsheet data.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[color:var(--wsu-muted)] sm:text-lg">
                  Public pages read Smartsheet live and render server-side, while the admin builder handles sources, fields, layouts, contributor access, and publishing.
                </p>
              </div>
            </div>
            <div className="space-y-4 rounded-[1.5rem] border border-[color:var(--wsu-border)] bg-[linear-gradient(180deg,rgba(166,15,45,0.08),rgba(255,255,255,0.9))] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                  Environment
                </p>
                <p className="mt-3 text-sm leading-6 text-[color:var(--wsu-muted)]">
                  The app expects a server-side Smartsheet token through <code className="font-mono text-[color:var(--wsu-ink)]">SMARTSHEET_API_TOKEN</code>
                  or <code className="font-mono text-[color:var(--wsu-ink)]">SMARTSHEET_CONNECTIONS_JSON</code>.
                </p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 text-sm ${connectionOk ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                {connectionOk
                  ? "Smartsheet connection verified."
                  : "Smartsheet connection unavailable. Check your API token and environment."}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin" className="btn-crimson inline-flex items-center rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium transition hover:bg-[color:var(--wsu-crimson-dark)]">
                  Open admin builder
                </Link>
                <Link href="/instructions/admin" className="inline-flex items-center rounded-full border border-[color:var(--wsu-crimson)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] transition hover:bg-[color:var(--wsu-crimson)]/8">
                  Admin guide
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[color:var(--wsu-muted)]">
                Public routes
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[color:var(--wsu-ink)]">Configured pages</h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {pages.map((page) => (
              <article
                key={page.slug}
                className="rounded-[1.75rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-[0_16px_48px_rgba(35,31,32,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
                      {page.sourceLabel}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-[color:var(--wsu-ink)]">{page.title}</h3>
                    <p className="mt-2 text-sm text-[color:var(--wsu-muted)]">
                      Views: {page.views.map((view) => view.label).join(" / ")}
                    </p>
                  </div>
                  <Link
                    href={`/view/${page.slug}`}
                    className="btn-crimson inline-flex items-center rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium transition hover:bg-[color:var(--wsu-crimson-dark)]"
                  >
                    Open page
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {page.views.map((view) => (
                    <span
                      key={view.id}
                      className="rounded-full border border-[color:var(--wsu-border)] bg-white px-3 py-1 text-xs font-medium text-[color:var(--wsu-muted)]"
                    >
                      {view.label}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
