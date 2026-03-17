import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME, getAdminSessionCookieSettings } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/sign-in", request.url));
  response.cookies.set({
    ...getAdminSessionCookieSettings(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
  });
  return response;
}