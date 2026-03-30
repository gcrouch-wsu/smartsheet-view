import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin guide - Smartsheet View",
  description: "Create sources, build views, publish updates, manage contributors, and operate Smartsheet View safely.",
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
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Smartsheet View Admin</p>
          <h1 id="page-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin guide
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--wsu-muted)]">
            Use this guide to connect Smartsheet sources, build public views, publish changes, and manage contributor access.
          </p>
          <nav aria-label="Related pages" className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] underline-offset-2 hover:underline"
            >
              Open admin
            </Link>
            <Link
              href="/instructions/contributor"
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] underline-offset-2 hover:underline"
            >
              Contributor guide
            </Link>
          </nav>
        </header>

        <main
          id="main"
          className="space-y-10 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="page-title"
        >
          <section aria-labelledby="s-overview">
            <h2 id="s-overview" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              What admins do here
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Create and test Smartsheet sources.</li>
              <li>Build public views by choosing columns, labels, layout, filters, and branding.</li>
              <li>Publish updates after previewing them.</li>
              <li>Manage contributor editing and password reset links.</li>
              <li>Manage additional admin accounts.</li>
            </ul>
          </section>

          <section aria-labelledby="s-start">
            <h2 id="s-start" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Before you start
            </h2>
            <div className="mt-4 rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-4 text-sm text-[color:var(--wsu-muted)] sm:text-base">
              <p className="font-medium text-[color:var(--wsu-ink)]">Required environment values</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                <li><code className="rounded bg-white px-1.5 py-0.5 text-xs">SMARTSHEET_API_TOKEN</code></li>
                <li><code className="rounded bg-white px-1.5 py-0.5 text-xs">SMARTSHEETS_VIEW_ADMIN_USERNAME</code></li>
                <li><code className="rounded bg-white px-1.5 py-0.5 text-xs">SMARTSHEETS_VIEW_ADMIN_PASSWORD</code></li>
                <li><code className="rounded bg-white px-1.5 py-0.5 text-xs">SMARTSHEETS_VIEW_ADMIN_SESSION_SECRET</code></li>
                <li><code className="rounded bg-white px-1.5 py-0.5 text-xs">DATABASE_URL</code></li>
                <li><code className="rounded bg-white px-1.5 py-0.5 text-xs">CONTRIBUTOR_SESSION_SECRET</code> if contributor editing is enabled</li>
              </ul>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              If you use Supabase for Postgres, backend-owned tables in <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-xs">public</code> must keep RLS enabled. New public tables should ship with RLS in the same change.
            </p>
          </section>

          <section aria-labelledby="s-build">
            <h2 id="s-build" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Build and publish a view
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Create a source using the numeric Smartsheet sheet or report ID.</li>
              <li>Use <strong className="text-[color:var(--wsu-ink)]">Test connection</strong> to confirm the source is valid.</li>
              <li>Create a view and configure setup, fields, filters, editing, and branding.</li>
              <li>Preview the result before publishing.</li>
              <li>Publish only after checking field labels, layout, filters, and contributor settings.</li>
            </ol>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              If publishing is blocked, schema drift is the usual cause. That means a required Smartsheet column was changed, removed, or renamed.
            </p>
          </section>

          <section aria-labelledby="s-contributors">
            <h2 id="s-contributors" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Contributor access
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Contributors can create an account only when their <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-xs">@wsu.edu</code> email appears in the configured contact field on the Smartsheet row.</li>
              <li>Editable fields control what they can change after sign-in.</li>
              <li>Use multi-person groups when contributors need Add/Remove person controls instead of plain text entry.</li>
              <li>Contributor passwords are stored as one-way hashes and cannot be viewed by admins.</li>
              <li>If a contributor forgets a password, generate a reset link from <strong className="text-[color:var(--wsu-ink)]">Contributors</strong>.</li>
            </ul>
          </section>

          <section aria-labelledby="s-admins">
            <h2 id="s-admins" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Admin accounts
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              The bootstrap owner account comes from environment variables. Additional managed admins can be created in the admin UI.
            </p>
            <div className="mt-4 rounded-xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/20 p-4 text-sm text-[color:var(--wsu-muted)] sm:text-base">
              <p className="font-medium text-[color:var(--wsu-ink)]">Admin password rule</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>at least 8 characters</li>
                <li>at least 1 uppercase letter</li>
                <li>at least 1 number</li>
                <li>at least 1 special character such as <code className="rounded bg-white px-1.5 py-0.5 text-xs">!</code>, <code className="rounded bg-white px-1.5 py-0.5 text-xs">*</code>, or <code className="rounded bg-white px-1.5 py-0.5 text-xs">_</code></li>
              </ul>
            </div>
          </section>

          <section aria-labelledby="s-checklist">
            <h2 id="s-checklist" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Release checklist
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Confirm environment values and database connectivity.</li>
              <li>Confirm RLS is enabled on backend-owned public tables.</li>
              <li>Preview the public page and verify layout, filters, search, and branding.</li>
              <li>If contributor editing is enabled, test first-time access, sign-in, row eligibility, save to Smartsheet, and password reset.</li>
              <li>Commit and push changes before expecting Vercel to deploy them.</li>
            </ol>
          </section>
        </main>
      </div>
    </div>
  );
}
