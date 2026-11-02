import { afterEach, describe, expect, it } from "vitest";

import { ADMIN_PASSWORD, TEST_ENV } from "./env";
import {
  countLinks,
  createLink,
  postLinkRequest,
  postLogin,
  postLogout,
  sessionCookiePair,
  setCookieHeader,
  setEnv,
} from "./helpers";

/**
 * S6: the owner logs in with one password. The session is a signed cookie that
 * lasts 7 days, is `HttpOnly` and `SameSite=Lax`, and is `Secure` only when the
 * public origin is https.
 */
const SESSION_COOKIE_NAME = "shorturl_session";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

function restoreEnv(): void {
  for (const [name, value] of Object.entries(TEST_ENV)) {
    setEnv(name, value);
  }
}

afterEach(restoreEnv);

describe("S6 POST /api/auth/login", () => {
  it("sets an HttpOnly, SameSite=Lax, 7 day cookie for the owner password", async () => {
    const response = await postLogin({ password: ADMIN_PASSWORD });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");

    const cookie = setCookieHeader(response);
    expect(cookie).not.toBeNull();
    const header = cookie ?? "";

    expect(header.startsWith(`${SESSION_COOKIE_NAME}=`)).toBe(true);
    expect(header).toContain("HttpOnly");
    expect(header.toLowerCase()).toContain("samesite=lax");
    expect(header).toContain(`Max-Age=${SEVEN_DAYS_SECONDS}`);
    expect(header).toContain("Path=/");
    // BASE_URL is http in the test environment, so the cookie stays usable.
    expect(header).not.toContain("Secure");
  });

  it("rejects a wrong password with 401, no cookie and no stored change", async () => {
    const response = await postLogin({ password: "not-the-owner-password" });

    expect(response.status).toBe(401);
    expect(setCookieHeader(response)).toBeNull();
    const body = (await response.json()) as { error: string };
    expect(body.error.length).toBeGreaterThan(0);
    expect(await countLinks()).toBe(0);
  });

  it("gives the same answer for a missing, empty or wrong password", async () => {
    const wrong = await postLogin({ password: "not-the-owner-password" });
    const wrongBody = (await wrong.json()) as { error: string };

    for (const body of [{}, { password: "" }, { password: 42 }, null]) {
      const response = await postLogin(body);
      expect(response.status, JSON.stringify(body)).toBe(401);
      expect(setCookieHeader(response)).toBeNull();
      expect((await response.json()) as { error: string }).toEqual(wrongBody);
    }
  });

  it("marks the cookie Secure when BASE_URL is https", async () => {
    setEnv("BASE_URL", "https://short.example.com");

    const response = await postLogin({ password: ADMIN_PASSWORD });

    expect(response.status).toBe(204);
    expect(setCookieHeader(response) ?? "").toContain("Secure");
  });

  it("does not accept the password when no hash is configured", async () => {
    setEnv("ADMIN_PASSWORD_HASH", "");

    const response = await postLogin({ password: ADMIN_PASSWORD });

    expect(response.status).toBe(401);
    expect(setCookieHeader(response)).toBeNull();
  });
});

describe("S6 POST /api/auth/logout", () => {
  it("clears the session cookie for a logged in owner", async () => {
    const login = await postLogin({ password: ADMIN_PASSWORD });
    const cookie = sessionCookiePair(login);

    const response = await postLogout(cookie);

    expect(response.status).toBe(204);
    const header = setCookieHeader(response) ?? "";
    expect(header.startsWith(`${SESSION_COOKIE_NAME}=`)).toBe(true);
    expect(header).toContain("Max-Age=0");
    expect(header).toContain("HttpOnly");
  });

  it("returns 401 without a session and clears nothing", async () => {
    const response = await postLogout();

    expect(response.status).toBe(401);
    expect(setCookieHeader(response)).toBeNull();
  });

  it("never creates a link while logging in or out", async () => {
    await postLogin({ password: ADMIN_PASSWORD });
    await postLogout();

    expect(await countLinks()).toBe(0);
    // PRESERVE: public creation still works without any session.
    const created = await createLink("https://example.com/public");
    expect(created.code.length).toBe(7);
    expect(await countLinks()).toBe(1);
  });
});

describe("S6 tampered session", () => {
  it("does not accept a cookie signed with another secret", async () => {
    const login = await postLogin({ password: ADMIN_PASSWORD });
    const pair = sessionCookiePair(login);
    const name = pair.slice(0, pair.indexOf("="));
    const token = pair.slice(pair.indexOf("=") + 1);

    // Flip the last character of the signature.
    const lastCharacter = token.at(-1) ?? "A";
    const tampered = `${token.slice(0, -1)}${lastCharacter === "A" ? "B" : "A"}`;

    const response = await postLogout(`${name}=${tampered}`);
    expect(response.status).toBe(401);
  });

  it("still shortens links for an anonymous visitor", async () => {
    const response = await postLinkRequest({ url: "https://example.com/anon" });
    expect(response.status).toBe(201);
    expect(await countLinks()).toBe(1);
  });
});
