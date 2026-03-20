import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Administrator setup guide — Smartsheet View",
  description: "Configure sources, views, publishing, contributor editing, branding, and deployment.",
};

export default function AdminInstructionsPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(166,15,45,0.06),rgba(248,246,243,0.9))] px-4 py-8 text-[color:var(--wsu-ink)] sm:px-6 lg:px-8">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to guide content
      </a>
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Smartsheet View — Admin</p>
          <h1 id="page-title" className="mt-2 text-3xl font-semibold tracking-tight">
            Setup and maintenance guide
          </h1>
          <p className="mt-3 text-sm text-[color:var(--wsu-muted)]">
            Use this checklist to stand up and operate public views from Smartsheet. For day-to-day <strong>contributor</strong> tasks,
            share the{" "}
            <Link href="/instructions/contributor" className="font-medium text-[color:var(--wsu-crimson)] underline">
              contributor guide
            </Link>
            .
          </p>
          <nav aria-label="Related pages" className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] underline-offset-2 hover:underline"
            >
              Open admin home
            </Link>
          </nav>
        </header>

        <main id="main" className="space-y-10 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="page-title">
          <section aria-labelledby="s-sources">
            <h2 id="s-sources" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Sources
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>Create a <strong>source</strong> for each Smartsheet sheet or report; the numeric ID comes from the Smartsheet URL.</li>
              <li>Use <strong>Test connection</strong> after saving to verify the API token and asset type.</li>
              <li>On Vercel, set <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 text-xs">DATABASE_URL</code> so configs persist; the server filesystem is not writable for long-term storage.</li>
            </ul>
          </section>

          <section aria-labelledby="s-views">
            <h2 id="s-views" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Views
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>
                <strong>Setup:</strong> slug, layout, optional fixed layout, page header, <strong>header logo</strong> (PNG/JPEG, alt text required), theme, card layout.
              </li>
              <li>
                <strong>Fields:</strong> pick columns, render types, transforms, heading/summary for card-style layouts.
              </li>
              <li>
                <strong>Filters and sort:</strong> narrow rows and order them for the public page.
              </li>
              <li>
                <strong>Preview</strong> tabs mirror production rendering; use the public URL to test drafts before publish.
              </li>
            </ul>
          </section>

          <section aria-labelledby="s-publish">
            <h2 id="s-publish" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Publishing and schema drift
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              Publishing is blocked if required Smartsheet columns disappeared or were renamed out from under the view.
              Fix the sheet or update field mappings, then publish again.
            </p>
          </section>

          <section aria-labelledby="s-contributor">
            <h2 id="s-contributor" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Contributor editing
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>Requires PostgreSQL <strong>13+</strong>, <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 text-xs">DATABASE_URL</code>, and a non-empty <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 text-xs">CONTRIBUTOR_SESSION_SECRET</code>.</li>
              <li>Configure contact column(s), editable columns, optional multi-person groups, and whether to show the login link.</li>
              <li>API routes that touch the database use the Node.js runtime on Vercel (already set for contributor endpoints).</li>
            </ul>
          </section>

          <section aria-labelledby="s-brand">
            <h2 id="s-brand" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Branding and accessibility
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>
                <strong>Header branding:</strong> in <strong>Setup → Page header &amp; branding</strong>, upload a PNG/JPEG logo (≤256KB, <strong>alt text</strong> required) and optionally two text lines beside it (organization + unit), similar to a lockup layout.
              </li>
              <li>The public page includes skip links, landmarks, table semantics where applicable, and an accessible edit drawer.</li>
            </ul>
          </section>

          <section aria-labelledby="s-vercel">
            <h2 id="s-vercel" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Vercel and this guide
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              These instruction pages are part of the Next.js app—no separate static host is needed. They deploy with your project and
              work the same in production and preview deployments. Production builds use{" "}
              <strong>Webpack</strong> (<code className="rounded bg-[color:var(--wsu-stone)]/40 px-1 text-xs">next build --webpack</code>) for
              compatibility with the database driver and rich-text editor.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
