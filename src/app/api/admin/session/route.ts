import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSessionCookieSettings,
} from "@/lib/admin-auth";
import {
  authenticateAdminCredentials,
  createAdminSessionForPrincipal,
} from "@/lib/admin-users";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const username = typeof (body as { username?: unknown })?.username === "string"
    ? (body as { username: string }).username.trim()
    : "";
  const password = typeof (body as { password?: unknown })?.password === "string"
    ? (body as { password: string }).password
    : "";

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  const authorization = await authenticateAdminCredentials(username, password);
  if (!authorization.ok || !authorization.principal) {
    return NextResponse.json(
      {
        message: authorization.message ?? "Authentication failed.",
      },
      {
        status: authorization.status ?? 401,
      },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...getAdminSessionCookieSettings(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: await createAdminSessionForPrincipal(authorization.principal),
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...getAdminSessionCookieSettings(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
  });
  return response;
}