import type { Metadata } from "next";
import Link from "next/link";
import { AdminGuideTabs } from "@/components/admin/AdminGuideTabs";

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
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-2xl border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--wsu-crimson)]">Smartsheet View Admin</p>
          <h1 id="page-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin guide
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--wsu-muted)]">
            This guide is organized around the real builder tabs and control names so you can configure views without guessing what each section does.
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

        <main id="main" className="rounded-2xl border border-[color:var(--wsu-border)] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="page-title">
          <AdminGuideTabs />
        </main>
      </div>
    </div>
  );
}
