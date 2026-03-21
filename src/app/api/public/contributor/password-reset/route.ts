import { NextResponse } from "next/server";
import { resetContributorPassword, verifyContributorResetToken } from "@/lib/contributor-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; password?: string } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }

  const email = await verifyContributorResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Ask your administrator for a new one." },
      { status: 400 },
    );
  }

  try {
    await resetContributorPassword(email, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to reset password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
