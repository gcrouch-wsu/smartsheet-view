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
        Opens the browser print dialog. Choose &quot;Save as PDF&quot; to download. Landscape table layout; print sizes are set in{" "}
        <code className="rounded bg-black/[0.04] px-1 py-0.5 text-[10px]">src/config/print-export-defaults.json</code> (not the page
        theme).
      </p>
    </div>
  );
}
