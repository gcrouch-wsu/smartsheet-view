export const ADMIN_USERNAME_ENV_VAR = "SMARTSHEETS_VIEW_ADMIN_USERNAME";
export const ADMIN_PASSWORD_ENV_VAR = "SMARTSHEETS_VIEW_ADMIN_PASSWORD";
const ADMIN_REALM = "Smartsheets View Admin";

export interface AdminAuthorizationResult {
  ok: boolean;
  status?: number;
  message?: string;
  headers?: Record<string, string>;
}

interface AdminCredentials {
  username: string;
  password: string;
}

function getAdminCredentials(): AdminCredentials | null {
  const username = process.env[ADMIN_USERNAME_ENV_VAR]?.trim();
  const password = process.env[ADMIN_PASSWORD_ENV_VAR]?.trim();

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

function decodeBasicCredentials(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(authorizationHeader.slice(6).trim());
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function timingSafeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export function authorizeAdminRequest(authorizationHeader: string | null): AdminAuthorizationResult {
  const credentials = getAdminCredentials();
  if (!credentials) {
    return {
      ok: false,
      status: 503,
      message: `Admin authentication is not configured. Set ${ADMIN_USERNAME_ENV_VAR} and ${ADMIN_PASSWORD_ENV_VAR}.`,
    };
  }

  const supplied = decodeBasicCredentials(authorizationHeader);
  if (!supplied) {
    return {
      ok: false,
      status: 401,
      message: "Authentication required.",
      headers: {
        "WWW-Authenticate": `Basic realm=\"${ADMIN_REALM}\", charset=\"UTF-8\"`,
      },
    };
  }

  if (
    !timingSafeEqual(supplied.username, credentials.username) ||
    !timingSafeEqual(supplied.password, credentials.password)
  ) {
    return {
      ok: false,
      status: 401,
      message: "Authentication required.",
      headers: {
        "WWW-Authenticate": `Basic realm=\"${ADMIN_REALM}\", charset=\"UTF-8\"`,
      },
    };
  }

  return { ok: true };
}