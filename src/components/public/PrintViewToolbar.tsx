"use client";

import Link from "next/link";

export function PrintViewToolbar({ slug, viewId }: { slug: string; viewId: string }) {
  return (
    <div className="no-print mb-8 flex flex-wrap items-center gap-3 border-b border-[color:var(--wsu-border)] pb-6">
      <Link href={`/view/${slug}?view=${viewId}`} className="link-pill-muted px-4 py-2 text-sm">
        Back to interactive view
      </Link>
      <button type="button" onClick={() => window.print()} className="view-control-active px-4 py-2 text-sm font-medium">
        Print or save as PDF...
      </button>
      <p className="w-full text-xs text-[color:var(--wsu-muted)]">
        Opens the browser print dialog. Choose "Save as PDF" to download. This print view defaults to a landscape table layout.
      </p>
    </div>
  );
}
