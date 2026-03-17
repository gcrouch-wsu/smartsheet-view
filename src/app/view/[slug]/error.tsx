"use client";

import Link from "next/link";

export default function ViewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-10 shadow-[0_24px_64px_rgba(35,31,32,0.07)] sm:px-8">
          <div className="max-w-xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">
              Data unavailable
            </p>
            <h1 className="text-2xl font-semibold text-[color:var(--wsu-ink)]">
              This view could not be loaded.
            </h1>
            <p className="text-sm leading-6 text-[color:var(--wsu-muted)]">
              The data source may be temporarily unavailable. Try refreshing the page or check back shortly.
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="rounded-xl border border-[color:var(--wsu-border)] bg-white p-3 font-mono text-xs text-[color:var(--wsu-ink)]">
                {error.message}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={reset}
                className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--wsu-crimson-dark)]"
              >
                Try again
              </button>
              <Link
                href="/"
                className="rounded-full border border-[color:var(--wsu-border)] px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] transition hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
