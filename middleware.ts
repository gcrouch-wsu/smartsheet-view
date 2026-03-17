import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
  const result = authorizeAdminRequest(request.headers.get("authorization"));
  if (result.ok) {
    return NextResponse.next();
  }

  return new NextResponse(result.message, {
    status: result.status,
    headers: result.headers,
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};