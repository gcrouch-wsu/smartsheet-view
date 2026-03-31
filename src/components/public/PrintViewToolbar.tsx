"use client";

import Link from "next/link";

export function PrintViewToolbar({ slug, viewId }: { slug: string; viewId: string }) {
  return (
    <div className="no-print mb-8 flex flex-wrap items-center gap-3 border-b border-[color:var(--wsu-border)] pb-6">
      <Link
        href={`/view/${slug}?view=${viewId}`}
        className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-ink)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]"
      >
        Back to interactive view
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)]"
      >
        Print or save as PDF…
      </button>
      <p className="w-full text-xs text-[color:var(--wsu-muted)]">
        Opens the browser print dialog. Choose “Save as PDF” to download. This page uses simplified layout for printing.
      </p>
    </div>
  );
}
