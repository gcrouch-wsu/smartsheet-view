import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/views", label: "Views" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(166,15,45,0.06),rgba(248,246,243,0.8))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-[color:var(--wsu-border)] bg-[color:var(--wsu-paper)] px-6 py-6 shadow-[0_24px_64px_rgba(35,31,32,0.07)] sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--wsu-crimson)]">Phase 2</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--wsu-ink)]">Admin Builder</h1>
              <p className="mt-2 max-w-3xl text-sm text-[color:var(--wsu-muted)]">
                Register Smartsheet sources, build views, preview live output, and publish without editing JSON by hand.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/sources/new" className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]">
                New source
              </Link>
              <Link href="/admin/views/new" className="rounded-full bg-[color:var(--wsu-crimson)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--wsu-crimson-dark)]">
                New view
              </Link>
              <AdminLogoutButton />
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-[color:var(--wsu-crimson)] hover:text-[color:var(--wsu-crimson)]">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
