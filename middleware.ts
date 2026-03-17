import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  authorizeAdminSession,
  normalizeAdminNextPath,
} from "@/lib/admin-auth";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/sign-in", "/api/admin/session", "/api/admin/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdminApiRequest = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.has(pathname);
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const result = await authorizeAdminSession(sessionToken);

  if (pathname === "/admin/sign-in") {
    if (result.ok) {
      return NextResponse.redirect(new URL(normalizeAdminNextPath(request.nextUrl.searchParams.get("next")), request.url));
    }

    return NextResponse.next();
  }

  if (isPublicAdminPath) {
    return NextResponse.next();
  }

  if (result.ok) {
    return NextResponse.next();
  }

  if (isAdminApiRequest) {
    return NextResponse.json(
      {
        message: result.message ?? "Authentication required.",
      },
      {
        status: result.status ?? 401,
      },
    );
  }

  const signInUrl = new URL("/admin/sign-in", request.url);
  signInUrl.searchParams.set("next", normalizeAdminNextPath(`${pathname}${search}`));
  return NextResponse.redirect(signInUrl);
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