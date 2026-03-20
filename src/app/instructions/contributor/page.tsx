import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contributor guide — Smartsheet View",
  description: "How to sign in, find your rows, and update data on a public Smartsheet View page.",
};

export default function ContributorInstructionsPage() {
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Smartsheet View</p>
          <h1 id="page-title" className="mt-2 text-3xl font-semibold tracking-tight">
            Contributor guide
          </h1>
          <p className="mt-3 text-sm text-[color:var(--wsu-muted)]">
            This page explains how to use <strong>contributor editing</strong> on a published directory or listing. Your organization
            turns this feature on per view; you only see <strong>Edit</strong> on rows you are allowed to change.
          </p>
          <nav aria-label="Related pages" className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] underline-offset-2 hover:underline"
            >
              Back to configured pages
            </Link>
          </nav>
        </header>

        <main id="main" className="space-y-10 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="page-title">
          <section aria-labelledby="s-before">
            <h2 id="s-before" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Before you start
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>Use your <strong>WSU email</strong> address. Access is tied to your row in Smartsheet (usually a contact column).</li>
              <li>
                First time only: use <strong>First-time access</strong> on the sign-in page to set a password that meets the
                policy shown there.
              </li>
              <li>
                If you cannot sign in or don’t see any editable rows, contact your site <strong>administrator</strong>—they
                manage Smartsheet columns and which rows you may edit.
              </li>
            </ul>
          </section>

          <section aria-labelledby="s-signin">
            <h2 id="s-signin" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Sign in
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>Open the public page URL your administrator shared.</li>
              <li>Choose <strong>Contributor sign in</strong> (or follow the login link in the header).</li>
              <li>Sign in with your WSU email and password, or complete <strong>First-time access</strong> if needed.</li>
            </ol>
          </section>

          <section aria-labelledby="s-find">
            <h2 id="s-find" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Find your content
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>
                <strong>Search</strong> filters the list. Results are announced to screen readers when the count changes.
              </li>
              <li>
                The <strong>A–Z index</strong> on the side jumps to the first entry for that letter when available.
              </li>
              <li>
                Editable rows may show an <strong>Editable</strong> label and an <strong>Edit</strong> button. Only use{" "}
                <strong>Edit</strong> on your own assigned rows.
              </li>
            </ul>
          </section>

          <section aria-labelledby="s-edit">
            <h2 id="s-edit" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Edit your row
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              <li>Select <strong>Edit</strong> on your row. A panel opens on the right; keyboard focus moves into the panel.</li>
              <li>
                Change the fields your administrator exposed. Some views use <strong>cards per person</strong> for grouped
                contact fields—use <strong>Add person</strong> or <strong>Remove</strong> as needed.
              </li>
              <li>
                Choose <strong>Save changes</strong> to write to Smartsheet, or <strong>Cancel</strong> / <strong>Close</strong>{" "}
                to leave without saving. <kbd className="rounded border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-1.5 py-0.5 text-xs">Escape</kbd>{" "}
                also closes the panel.
              </li>
              <li>If an error appears, read the message at the bottom of the panel; fix the issue and try again.</li>
            </ol>
          </section>

          <section aria-labelledby="s-signout">
            <h2 id="s-signout" className="text-xl font-semibold text-[color:var(--wsu-ink)]">
              Sign out
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--wsu-muted)]">
              Use <strong>Sign out</strong> in the bar at the top of the view when you are finished, especially on a shared
              computer.
            </p>
          </section>
        </main>

        <p className="mt-6 text-center text-xs text-[color:var(--wsu-muted)]">
          Hosted on Vercel like the rest of this app—no extra setup required for this guide.
        </p>
      </div>
    </div>
  );
}
