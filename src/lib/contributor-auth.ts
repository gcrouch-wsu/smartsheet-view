import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { validateAdminPassword } from "@/lib/admin-auth";
import { ensureConfigTables, queryConfigDb, useConfigDatabase } from "@/lib/config/config-db";
import { isWsuEmail, normalizeContributorEmail } from "@/lib/contributor-utils";

export const CONTRIBUTOR_SESSION_COOKIE_NAME = "smartsheets_view_contributor_session";
export const CONTRIBUTOR_SESSION_SECRET_ENV_VAR = "CONTRIBUTOR_SESSION_SECRET";
export const CONTRIBUTOR_SESSION_TTL_ENV_VAR = "CONTRIBUTOR_SESSION_TTL_SECONDS";
export const CONTRIBUTOR_DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 4;
export const CONTRIBUTOR_RATE_LIMIT_MAX_ATTEMPTS = 5;
export const CONTRIBUTOR_RATE_LIMIT_WINDOW_MINUTES = 15;
export const CONTRIBUTOR_GENERIC_LOGIN_ERROR = "Invalid email or password.";
export const CONTRIBUTOR_GENERIC_CLAIM_ERROR =
  "Unable to set password. Use sign in if you already have access or contact your coordinator.";
export const CONTRIBUTOR_TOO_MANY_ATTEMPTS_ERROR = "Too many attempts. Try again later.";

export interface ContributorSessionPayload {
  email: string;
  issuedAt: number;
  expiresAt: number;
}

export interface ContributorSessionReadResult {
  ok: boolean;
  payload?: ContributorSessionPayload;
  status?: number;
  message?: string;
}

interface ContributorUserDbRow {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ContributorUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

function getContributorSessionSecret() {
  return process.env[CONTRIBUTOR_SESSION_SECRET_ENV_VAR]?.trim() ?? "";
}

export function getContributorSessionTtlSeconds() {
  const raw = process.env[CONTRIBUTOR_SESSION_TTL_ENV_VAR]?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : CONTRIBUTOR_DEFAULT_SESSION_TTL_SECONDS;
}

export function getContributorConfigurationError() {
  if (!useConfigDatabase()) {
    return "Contributor editing requires DATABASE_URL.";
  }

  if (!getContributorSessionSecret()) {
    return `${CONTRIBUTOR_SESSION_SECRET_ENV_VAR} is required for contributor editing.`;
  }

  return null;
}

function encodePayload(payload: ContributorSessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ContributorSessionPayload>;
}

function signPayload(payload: string) {
  return createHmac("sha256", getContributorSessionSecret()).update(payload).digest("base64url");
}

function toIsoTimestamp(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toContributorUserRecord(row: ContributorUserDbRow): ContributorUserRecord {
  return {
    id: row.id,
    email: normalizeContributorEmail(row.email),
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: toIsoTimestamp(row.created_at),
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

async function ensureContributorAuthStorage() {
  const configurationError = getContributorConfigurationError();
  if (configurationError) {
    throw new Error(configurationError);
  }
  await ensureConfigTables();
}

export function validateContributorPassword(password: string) {
  return validateAdminPassword(password);
}

export async function createContributorSessionToken(
  email: string,
  expiresAt = Date.now() + getContributorSessionTtlSeconds() * 1000,
) {
  const configurationError = getContributorConfigurationError();
  if (configurationError) {
    throw new Error(configurationError);
  }

  const payload = encodePayload({
    email: normalizeContributorEmail(email),
    issuedAt: Date.now(),
    expiresAt,
  });

  return `${payload}.${signPayload(payload)}`;
}

export async function readContributorSessionToken(
  sessionToken: string | undefined | null,
): Promise<ContributorSessionReadResult> {
  const configurationError = getContributorConfigurationError();
  if (configurationError) {
    return {
      ok: false,
      status: 503,
      message: configurationError,
    };
  }

  if (!sessionToken) {
    return {
      ok: false,
      status: 401,
      message: "Sign in to edit.",
    };
  }

  const [payload, signature] = sessionToken.split(".");
  if (!payload || !signature) {
    return {
      ok: false,
      status: 401,
      message: "Sign in to edit.",
    };
  }

  const expectedSignature = Buffer.from(signPayload(payload));
  const receivedSignature = Buffer.from(signature);
  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return {
      ok: false,
      status: 401,
      message: "Sign in to edit.",
    };
  }

  try {
    const decoded = decodePayload(payload);
    if (
      typeof decoded.email !== "string" ||
      typeof decoded.issuedAt !== "number" ||
      typeof decoded.expiresAt !== "number"
    ) {
      return {
        ok: false,
        status: 401,
        message: "Sign in to edit.",
      };
    }

    if (decoded.expiresAt <= Date.now()) {
      return {
        ok: false,
        status: 401,
        message: "Sign in to edit.",
      };
    }

    return {
      ok: true,
      payload: {
        email: normalizeContributorEmail(decoded.email),
        issuedAt: decoded.issuedAt,
        expiresAt: decoded.expiresAt,
      },
    };
  } catch {
    return {
      ok: false,
      status: 401,
      message: "Sign in to edit.",
    };
  }
}

export function getContributorSessionCookieSettings() {
  return {
    httpOnly: true,
    maxAge: getContributorSessionTtlSeconds(),
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function getContributorUserByEmail(email: string) {
  await ensureContributorAuthStorage();
  const normalizedEmail = normalizeContributorEmail(email);
  const { rows } = await queryConfigDb<ContributorUserDbRow>(
    `SELECT id, email, password_hash, password_salt, created_at, updated_at
     FROM contributor_users
     WHERE lower(email) = $1
     LIMIT 1`,
    [normalizedEmail],
  );
  return rows[0] ? toContributorUserRecord(rows[0]) : null;
}

export function hashContributorPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return {
    passwordHash: hash.toString("base64"),
    passwordSalt: salt.toString("base64"),
  };
}

export function verifyContributorPassword(password: string, record: Pick<ContributorUserRecord, "passwordHash" | "passwordSalt">) {
  const derived = scryptSync(password, Buffer.from(record.passwordSalt, "base64"), 64);
  return timingSafeEqual(derived, Buffer.from(record.passwordHash, "base64"));
}

export async function createContributorUser(email: string, password: string) {
  await ensureContributorAuthStorage();
  const normalizedEmail = normalizeContributorEmail(email);
  if (!isWsuEmail(normalizedEmail)) {
    throw new Error("Contributor email must be a @wsu.edu address.");
  }

  const passwordError = validateContributorPassword(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const { passwordHash, passwordSalt } = hashContributorPassword(password);
  const { rows } = await queryConfigDb<ContributorUserDbRow>(
    `INSERT INTO contributor_users (email, password_hash, password_salt)
     VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, password_salt, created_at, updated_at`,
    [normalizedEmail, passwordHash, passwordSalt],
  );

  return toContributorUserRecord(rows[0]!);
}

export async function recordContributorFailedAttempt(ip: string) {
  await ensureContributorAuthStorage();
  await queryConfigDb(
    `INSERT INTO contributor_login_attempts (ip, attempted_at)
     VALUES ($1, now())`,
    [ip],
  );
}

export async function pruneContributorFailedAttempts() {
  await ensureContributorAuthStorage();
  await queryConfigDb(
    `DELETE FROM contributor_login_attempts
     WHERE attempted_at < now() - interval '1 day'`,
  );
}

export async function getContributorRecentFailedAttemptCount(ip: string) {
  await ensureContributorAuthStorage();
  await pruneContributorFailedAttempts();
  const { rows } = await queryConfigDb<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM contributor_login_attempts
     WHERE ip = $1
       AND attempted_at > now() - make_interval(mins => $2)`,
    [ip, CONTRIBUTOR_RATE_LIMIT_WINDOW_MINUTES],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function isContributorRateLimited(ip: string) {
  return (await getContributorRecentFailedAttemptCount(ip)) >= CONTRIBUTOR_RATE_LIMIT_MAX_ATTEMPTS;
}

export function getContributorClientIp(requestHeaders: Headers) {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}
