import { NextResponse } from "next/server";

/**
 * Logout endpoint for HTTP Basic auth. Returns 401 to force the browser to
 * clear cached credentials and show the login prompt again.
 */
export async function GET() {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Logged out</title></head><body style="font-family:system-ui;padding:2rem;text-align:center"><p>You have been logged out.</p><p><a href="/admin">Log in again</a></p></body></html>`,
    {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "WWW-Authenticate": 'Basic realm="Smartsheets View Admin", charset="UTF-8"',
      },
    }
  );
}
