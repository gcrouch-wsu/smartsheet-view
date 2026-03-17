"use client";

/**
 * Logout for HTTP Basic auth. Browsers cache Basic credentials; navigating to
 * a URL with invalid credentials causes the browser to clear the cache and
 * show the login prompt again.
 */
export function AdminLogoutButton() {
  function handleLogout() {
    const { protocol, host } = window.location;
    window.location.href = `${protocol}//logout:logout@${host}/admin`;
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
