"use client";

/**
 * Logout for HTTP Basic auth. Navigate to a dedicated logout endpoint that
 * returns 401, prompting the browser to clear cached credentials.
 */
export function AdminLogoutButton() {
  function handleLogout() {
    window.location.replace("/api/admin/logout");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-[color:var(--wsu-border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--wsu-muted)] hover:border-rose-300 hover:text-rose-700"
    >
      Log out
    </button>
  );
}
