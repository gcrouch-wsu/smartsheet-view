import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contributor help — create an account & edit your row",
  description:
    "Step-by-step help for WSU contributors: create a password, sign in, and update your row on a public Smartsheet view. No login needed to read this page.",
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
        <header className="mb-8 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Smartsheet View</p>
          <h1 id="page-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Help for contributors
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[color:var(--wsu-muted)]">
            This page is for <strong className="text-[color:var(--wsu-ink)]">faculty and staff</strong> who appear in a published
            directory (for example as a coordinator or contact). You can update <strong>your own row</strong> after you create a
            small <strong>contributor password</strong>—different from your main WSU login.
          </p>
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
            <strong>You do not need a password to read this help page.</strong> Bookmark it or share the link with colleagues.
          </p>
          <nav aria-label="Related pages" className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-crimson)] underline-offset-2 hover:underline"
            >
              Published views home
            </Link>
          </nav>
        </header>

        <main
          id="main"
          className="space-y-10 rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="page-title"
        >
          <section aria-labelledby="s-account">
            <h2 id="s-account" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Create your contributor account (first time only)
            </h2>
            <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>
                Open the <strong className="text-[color:var(--wsu-ink)]">public page link</strong> your program sent you (or go to
                your organization’s published view and use <strong className="text-[color:var(--wsu-ink)]">Contributor sign in</strong>
                ).
              </li>
              <li>
                On the contributor page, select <strong className="text-[color:var(--wsu-ink)]">First-time access</strong> (not
                “Sign in” yet).
              </li>
              <li>
                Enter your <strong className="text-[color:var(--wsu-ink)]">WSU email</strong> (it must end in{" "}
                <code className="rounded bg-[color:var(--wsu-stone)]/40 px-1.5 py-0.5 text-xs">@wsu.edu</code>
                ).
              </li>
              <li>
                Choose a <strong className="text-[color:var(--wsu-ink)]">new password</strong> just for this directory. Follow the
                rules on the screen (length and complexity). This password is{" "}
                <strong className="text-[color:var(--wsu-ink)]">not</strong> synced with your WSU network password.
              </li>
              <li>
                Submit the form. You can now use <strong className="text-[color:var(--wsu-ink)]">Sign in</strong> any time with
                that email and password.
              </li>
            </ol>
          </section>

          <section aria-labelledby="s-signin">
            <h2 id="s-signin" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Sign in next time
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>Open the same public page.</li>
              <li>
                Choose <strong className="text-[color:var(--wsu-ink)]">Sign in</strong> (not first-time access).
              </li>
              <li>Enter your WSU email and your contributor password.</li>
            </ol>
          </section>

          <section aria-labelledby="s-who">
            <h2 id="s-who" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Who can edit what?
            </h2>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>
                You can only change rows where <strong className="text-[color:var(--wsu-ink)]">your email</strong> appears in the
                columns your administrator configured (often a “contact” or “coordinator” column).
              </li>
              <li>
                Many views <strong className="text-[color:var(--wsu-ink)]">only show your rows</strong> after you sign in, so you
                don’t have to search the whole list.
              </li>
              <li>
                You can only edit <strong className="text-[color:var(--wsu-ink)]">fields your administrator turned on</strong> for
                contributors.
              </li>
            </ul>
          </section>

          <section aria-labelledby="s-edit">
            <h2 id="s-edit" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Edit and save your row
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>
                Click <strong className="text-[color:var(--wsu-ink)]">Edit</strong> on your row. A panel opens on the right.
              </li>
              <li>
                Update the fields shown. Some views use <strong className="text-[color:var(--wsu-ink)]">cards per person</strong> for
                grouped contacts—use <strong className="text-[color:var(--wsu-ink)]">Add person</strong> or{" "}
                <strong className="text-[color:var(--wsu-ink)]">Remove</strong> if you see them.
              </li>
              <li>
                Click <strong className="text-[color:var(--wsu-ink)]">Save changes</strong> to write to Smartsheet, or{" "}
                <strong className="text-[color:var(--wsu-ink)]">Close</strong> / <strong className="text-[color:var(--wsu-ink)]">Cancel</strong>{" "}
                to leave without saving. Press{" "}
                <kbd className="rounded border border-[color:var(--wsu-border)] bg-[color:var(--wsu-stone)]/30 px-1.5 py-0.5 text-xs">
                  Escape
                </kbd>{" "}
                to close the panel.
              </li>
              <li>If you see an error message, read it and try again, or contact your administrator.</li>
            </ol>
          </section>

          <section aria-labelledby="s-search">
            <h2 id="s-search" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Search and A–Z index
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              <li>
                <strong className="text-[color:var(--wsu-ink)]">Search</strong> narrows the list. The count updates for screen
                readers as you type.
              </li>
              <li>
                The <strong className="text-[color:var(--wsu-ink)]">A–Z</strong> strip jumps to the first row for that letter when it
                exists.
              </li>
            </ul>
          </section>

          <section aria-labelledby="s-signout">
            <h2 id="s-signout" className="text-xl font-semibold text-[color:var(--wsu-ink)] sm:text-2xl">
              Sign out
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--wsu-muted)] sm:text-base">
              When you’re done—especially on a <strong className="text-[color:var(--wsu-ink)]">shared computer</strong>—use{" "}
              <strong className="text-[color:var(--wsu-ink)]">Sign out</strong> in the bar at the top of the view.
            </p>
          </section>

          <section
            aria-labelledby="s-help"
            className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950"
          >
            <h2 id="s-help" className="text-lg font-semibold">
              Need more help?
            </h2>
            <p className="mt-2 leading-relaxed">
              Contact your program <strong>administrator</strong>. They manage Smartsheet, who appears in each column, and which
              fields you can change. This app cannot add you to a row or reset your contributor password for you if the
              administrator has not listed your email in the right place.
            </p>
          </section>
        </main>

        <p className="mt-6 text-center text-xs text-[color:var(--wsu-muted)]">
          This guide is part of your organization’s Smartsheet View site—no extra login to read it.
        </p>
      </div>
    </div>
  );
}
