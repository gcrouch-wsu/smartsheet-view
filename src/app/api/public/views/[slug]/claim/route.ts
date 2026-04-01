import { NextResponse } from "next/server";
import {
  CONTRIBUTOR_CLAIM_ACCOUNT_EXISTS_ERROR,
  CONTRIBUTOR_CLAIM_NOT_ELIGIBLE_ERROR,
  CONTRIBUTOR_SESSION_COOKIE_NAME,
  CONTRIBUTOR_TOO_MANY_ATTEMPTS_ERROR,
  createContributorSessionToken,
  createContributorUser,
  getContributorClientIp,
  getContributorConfigurationError,
  getContributorSessionCookieSettings,
  getContributorUserByEmail,
  isContributorRateLimited,
  recordContributorFailedAttempt,
  validateContributorPassword,
} from "@/lib/contributor-auth";
import { isContributorStillInSheet, isWsuEmail, normalizeContributorEmail } from "@/lib/contributor-utils";
import { CONTRIBUTOR_DATASET_OPTIONS, loadContributorDataset, loadContributorViewContext } from "@/lib/contributor-view";

export const runtime = "nodejs";

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const configurationError = getContributorConfigurationError();
  if (configurationError) {
    return NextResponse.json({ error: configurationError }, { status: 503 });
  }

  const { slug } = await params;
  const url = new URL(request.url);
  const requestedViewId = url.searchParams.get("view");
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = normalizeContributorEmail(typeof body?.email === "string" ? body.email : "");
  const password = typeof body?.password === "string" ? body.password : "";
  const ip = getContributorClientIp(request.headers);

  if (await isContributorRateLimited(ip)) {
    return NextResponse.json({ error: CONTRIBUTOR_TOO_MANY_ATTEMPTS_ERROR }, { status: 429 });
  }

  const context = await loadContributorViewContext(slug, requestedViewId);
  if (!context) {
    return NextResponse.json({ error: "View not found." }, { status: 404 });
  }

  if (!context.activeView.editing?.enabled) {
    return NextResponse.json({ error: "Editing not enabled for this view." }, { status: 400 });
  }

  const passwordError = validateContributorPassword(password);
  if (passwordError) {
    await recordContributorFailedAttempt(ip);
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (!isWsuEmail(email)) {
    await recordContributorFailedAttempt(ip);
    return NextResponse.json({ error: CONTRIBUTOR_CLAIM_NOT_ELIGIBLE_ERROR }, { status: 403 });
  }

  const dataset = await loadContributorDataset(context.sourceConfig, CONTRIBUTOR_DATASET_OPTIONS);
  const existingUser = await getContributorUserByEmail(email);
  if (existingUser) {
    return NextResponse.json({ error: CONTRIBUTOR_CLAIM_ACCOUNT_EXISTS_ERROR }, { status: 409 });
  }

  const isEligible = isContributorStillInSheet(dataset.rows, email, context.activeView.editing.contactColumnIds);
  if (!isEligible) {
    await recordContributorFailedAttempt(ip);
    return NextResponse.json({ error: CONTRIBUTOR_CLAIM_NOT_ELIGIBLE_ERROR }, { status: 403 });
  }

  try {
    await createContributorUser(email, password);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: CONTRIBUTOR_CLAIM_ACCOUNT_EXISTS_ERROR }, { status: 409 });
    }
    throw error;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CONTRIBUTOR_SESSION_COOKIE_NAME,
    await createContributorSessionToken(email),
    getContributorSessionCookieSettings(),
  );
  return response;
}
