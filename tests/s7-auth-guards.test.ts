import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_PASSWORD, SESSION_SECRET, TEST_ENV } from "./env";
import {
  countLinks,
  createLink,
  followCode,
  loginAsAdmin,
  postLinkRequest,
  sessionCookiePair,
  postLogin,
  setEnv,
} from "./helpers";

/**
 * S7: one guard for every admin surface. APIs answer `401`, pages redirect to
 * `/login`, and the public surface stays open.
 *
 * `next/headers` and `next/navigation` are stubbed because `requireAdminPage`
 * is meant to run inside a Next request scope; the guard's own logic is what
 * this file exercises.
 */
const fakeRequestScope = vi.hoisted(() => ({ cookies: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = fakeRequestScope.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { redirectPath: path });
  },
}));

import { POST as CREATE } from "@/app/api/links/route";
import { requireAdminApi, requireAdminPage, UNAUTHORIZED_ERROR } from "@/lib/admin-guard";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

const EIGHT_DAYS_SECONDS = 8 * 24 * 60 * 60;

function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

/** A syntactically valid session token whose `exp` is already in the past. */
async function expiredSessionToken(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000) - EIGHT_DAYS_SECONDS;
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 60)
    .sign(new TextEncoder().encode(SESSION_SECRET));
}

function redirectPathFrom(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const path = (error as { redirectPath?: unknown }).redirectPath;
  return typeof path === "string" ? path : null;
}

beforeEach(() => {
  fakeRequestScope.cookies.clear();
});

afterEach(() => {
  for (const [name, value] of Object.entries(TEST_ENV)) {
    setEnv(name, value);
  }
  vi.unstubAllGlobals();
});

describe("S7 requireAdminApi", () => {
  it("returns 401 with no cookie", async () => {
    const response = await requireAdminApi(
      new Request("http://localhost:3000/api/analytics"),
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect((await response?.json()) as { error: string }).toEqual({
      error: UNAUTHORIZED_ERROR,
    });
  });

  it("returns 401 for an expired cookie", async () => {
    const response = await requireAdminApi(
      new Request("http://localhost:3000/api/analytics", {
        headers: { cookie: sessionCookieHeader(await expiredSessionToken()) },
      }),
    );

    expect(response?.status).toBe(401);
  });

  it("returns 401 for a cookie signed with another secret", async () => {
    const forged = await new SignJWT({ sub: "owner" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("another-secret"));

    const response = await requireAdminApi(
      new Request("http://localhost:3000/api/analytics", {
        headers: { cookie: sessionCookieHeader(forged) },
      }),
    );

    expect(response?.status).toBe(401);
  });

  it("returns 401 for a cookie value that is not a token", async () => {
    const response = await requireAdminApi(
      new Request("http://localhost:3000/api/analytics", {
        headers: { cookie: sessionCookieHeader("not-a-jwt") },
      }),
    );

    expect(response?.status).toBe(401);
  });

  it("lets a valid session through", async () => {
    const cookie = await loginAsAdmin();

    const response = await requireAdminApi(
      new Request("http://localhost:3000/api/analytics", {
        headers: { cookie },
      }),
    );

    expect(response).toBeNull();
  });
});

describe("S7 requireAdminPage", () => {
  it("redirects to /login without a session", async () => {
    const failure = await requireAdminPage().then(
      () => null,
      (error: unknown) => error,
    );

    expect(redirectPathFrom(failure)).toBe("/login");
  });

  it("redirects to /login for an expired session", async () => {
    fakeRequestScope.cookies.set(
      SESSION_COOKIE_NAME,
      await expiredSessionToken(),
    );

    const failure = await requireAdminPage().then(
      () => null,
      (error: unknown) => error,
    );

    expect(redirectPathFrom(failure)).toBe("/login");
  });

  it("returns the session for a logged in owner", async () => {
    const pair = sessionCookiePair(await postLogin({ password: ADMIN_PASSWORD }));
    fakeRequestScope.cookies.set(
      SESSION_COOKIE_NAME,
      pair.slice(pair.indexOf("=") + 1),
    );

    const session = await requireAdminPage();

    expect(session.subject).toBe("owner");
    expect(session.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe("S7 public surface stays open", () => {
  it("creates links without a session", async () => {
    const response = await postLinkRequest({ url: "https://example.com/open" });
    expect(response.status).toBe(201);
    expect(await countLinks()).toBe(1);
  });

  it("resolves codes without a session", async () => {
    const link = await createLink("https://example.com/open-code");
    expect((await followCode(link.code)).status).toBe(302);
  });

  it("exposes the public creation handler with no cookie header at all", async () => {
    const response = await CREATE(
      new Request("http://localhost:3000/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/no-cookie" }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await countLinks()).toBe(1);
  });
});
