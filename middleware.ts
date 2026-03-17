import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
  const result = authorizeAdminRequest(request.headers.get("authorization"));
  if (result.ok) {
    return NextResponse.next();
  }

  // Return 401/503 with WWW-Authenticate so the browser shows the login prompt
  const body = result.message ?? "Authentication required.";
  return new NextResponse(body, {
    status: result.status ?? 401,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(result.headers ?? {}),
    },
  });
}

export const config = {
  matcher: [
    "/admin",
    "/admin/",
    "/admin/:path*",
    "/api/admin",
    "/api/admin/:path*",
  ],
};