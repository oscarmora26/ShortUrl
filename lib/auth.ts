import { compare } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

import {
  getAdminPasswordHash,
  getBaseUrl,
  getSessionSecret,
} from "@/lib/config";

/**
 * S6: the owner session.
 *
 * There is no user model (S16): one password (`ADMIN_PASSWORD_HASH`) mints one
 * signed cookie. The cookie is self-contained and signed with
 * `SESSION_SECRET`, so no session table and no filesystem state are needed.
 */
export const SESSION_COOKIE_NAME = "shorturl_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const INVALID_CREDENTIALS_ERROR = "invalid credentials";
export const SESSION_UNAVAILABLE_ERROR = "session signing is not configured";

const SESSION_ALGORITHM = "HS256";
const SESSION_SUBJECT = "owner";

export type AdminSession = {
  subject: string;
  issuedAt: number;
  expiresAt: number;
};

function sessionKey(): Uint8Array | null {
  const secret = getSessionSecret();
  return secret === null ? null : new TextEncoder().encode(secret);
}

/** S6: `Secure` only when the public origin is https. */
export function isSecureCookie(): boolean {
  return getBaseUrl().startsWith("https://");
}

/**
 * S6: compares the submitted password with `ADMIN_PASSWORD_HASH`. A missing or
 * malformed hash simply never matches, so the endpoint cannot be unlocked by
 * misconfiguration.
 */
export async function verifyAdminPassword(password: unknown): Promise<boolean> {
  if (typeof password !== "string" || password === "") {
    return false;
  }

  const hash = getAdminPasswordHash();
  if (hash === null) {
    return false;
  }

  try {
    return await compare(password, hash);
  } catch {
    return false;
  }
}

/** S6: mints a signed token valid for 7 days, or `null` without a secret. */
export async function createSessionToken(
  now: Date = new Date(),
): Promise<string | null> {
  const key = sessionKey();
  if (key === null) {
    return null;
  }

  const issuedAt = Math.floor(now.getTime() / 1000);

  return new SignJWT({ sub: SESSION_SUBJECT })
    .setProtectedHeader({ alg: SESSION_ALGORITHM, typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(key);
}

/** S6: verifies signature and expiry. Anything else is unauthenticated. */
export async function verifySessionToken(
  token: string | null,
): Promise<AdminSession | null> {
  const key = sessionKey();
  if (key === null || token === null || token === "") {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: [SESSION_ALGORITHM],
    });

    if (
      payload.sub !== SESSION_SUBJECT ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      subject: payload.sub,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

function serializeSessionCookie(value: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (maxAgeSeconds <= 0) {
    parts.push(`Expires=${new Date(0).toUTCString()}`);
  } else if (isSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createSessionCookie(token: string): string {
  return serializeSessionCookie(token, SESSION_TTL_SECONDS);
}

export function createClearedSessionCookie(): string {
  return serializeSessionCookie("", 0);
}

/** Reads one cookie without depending on the framework request context. */
export function readCookie(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (cookieHeader === null) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator).trim() !== name) {
      continue;
    }
    return decodeURIComponent(part.slice(separator + 1));
  }

  return null;
}

export async function getAdminSessionFromCookieValue(
  value: string | null,
): Promise<AdminSession | null> {
  return verifySessionToken(value);
}

/** S6/S7: the session attached to an incoming request, if any. */
export async function getAdminSession(
  request: Request,
): Promise<AdminSession | null> {
  return getAdminSessionFromCookieValue(
    readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME),
  );
}
