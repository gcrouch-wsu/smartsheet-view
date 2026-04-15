import { NextResponse } from "next/server";
import {
  CONTRIBUTOR_TOO_MANY_ATTEMPTS_ERROR,
  isContributorRateLimited,
  recordContributorFailedAttempt,
  resetContributorPassword,
  validateContributorPassword,
  verifyContributorResetToken,
} from "@/lib/contributor-auth";
import { contributorPasswordResetRateLimitKey } from "@/lib/request-ip";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; password?: string } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rateKey = contributorPasswordResetRateLimitKey(request.headers, token);

  if (await isContributorRateLimited(rateKey)) {
    return NextResponse.json({ error: CONTRIBUTOR_TOO_MANY_ATTEMPTS_ERROR }, { status: 429 });
  }

  if (!token || !password) {
    await recordContributorFailedAttempt(rateKey);
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }

  const email = await verifyContributorResetToken(token);
  if (!email) {
    await recordContributorFailedAttempt(rateKey);
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Ask your administrator for a new one." },
      { status: 400 },
    );
  }

  const passwordError = validateContributorPassword(password);
  if (passwordError) {
    await recordContributorFailedAttempt(rateKey);
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    await resetContributorPassword(email, password);
  } catch (err) {
    await recordContributorFailedAttempt(rateKey);
    const message = err instanceof Error ? err.message : "Unable to reset password.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
