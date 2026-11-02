import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE, PATCH } from "@/app/api/links/[code]/route";
import { SESSION_SECRET, TEST_ENV } from "./env";
import {
  countClicks,
  countClicksForCode,
  countLinks,
  createLink,
  followCode,
  loginAsAdmin,
  recordClicksAt,
  setEnv,
} from "./helpers";

/**
 * S11: disabling is a soft delete. The redirect becomes `410` and the click
 * history stays, so the link can be re-enabled without losing analytics.
 */
type RouteContext = { params: Promise<{ code: string }> };

function patchRequest(
  code: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  return PATCH(
    new Request(`http://localhost:3000/api/links/${code}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(cookie === undefined ? {} : { cookie }),
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ code }) } as RouteContext,
  );
}

function deleteRequest(code: string, cookie?: string): Promise<Response> {
  return DELETE(
    new Request(`http://localhost:3000/api/links/${code}`, {
      method: "DELETE",
      headers: cookie === undefined ? {} : { cookie },
    }),
    { params: Promise.resolve({ code }) } as RouteContext,
  );
}

async function expiredCookie(): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60;
  const token = await new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 60)
    .sign(new TextEncoder().encode(SESSION_SECRET));
  return `shorturl_session=${token}`;
}

let cookie = "";

beforeEach(async () => {
  cookie = await loginAsAdmin();
});

afterEach(() => {
  for (const [name, value] of Object.entries(TEST_ENV)) {
    setEnv(name, value);
  }
});

describe("S11 PATCH /api/links/:code", () => {
  it("requires an owner session and changes nothing otherwise", async () => {
    const link = await createLink("https://example.com/status/auth");

    const anonymous = await patchRequest(link.code, { status: "disabled" });
    expect(anonymous.status).toBe(401);
    expect(
      ((await anonymous.json()) as { error: string }).error.length,
    ).toBeGreaterThan(0);

    expect(
      (await patchRequest(link.code, { status: "disabled" }, await expiredCookie()))
        .status,
    ).toBe(401);

    // Still active: the rejected request must not have disabled anything.
    expect((await followCode(link.code)).status).toBe(302);
  });

  it("disables and re-enables a link, preserving its click history", async () => {
    const link = await createLink("https://example.com/status/toggle");
    await recordClicksAt(link.code, [new Date(), new Date()]);
    expect(await countClicksForCode(link.code)).toBe(2);

    const disabled = await patchRequest(
      link.code,
      { status: "disabled" },
      cookie,
    );
    expect(disabled.status).toBe(200);
    expect(await disabled.json()).toEqual({
      code: link.code,
      status: "disabled",
    });
    expect((await followCode(link.code)).status).toBe(410);
    expect(await countClicksForCode(link.code)).toBe(2);
    expect(await countClicks()).toBe(2);

    const active = await patchRequest(link.code, { status: "active" }, cookie);
    expect(active.status).toBe(200);
    expect(await active.json()).toEqual({ code: link.code, status: "active" });
    expect((await followCode(link.code)).status).toBe(302);
    // The two historical clicks survive and the new visit adds one more.
    expect(await countClicksForCode(link.code)).toBe(3);
  });

  it("returns 404 for an unknown code and changes nothing", async () => {
    const response = await patchRequest("zzzzzzz", { status: "disabled" }, cookie);

    expect(response.status).toBe(404);
    expect(
      ((await response.json()) as { error: string }).error.length,
    ).toBeGreaterThan(0);
    expect(await countLinks()).toBe(0);
  });

  it("rejects an unknown status with 400 and leaves the link untouched", async () => {
    const link = await createLink("https://example.com/status/invalid");

    for (const body of [
      { status: "archived" },
      { status: "" },
      { status: 42 },
      {},
      { status: "DISABLED" },
    ]) {
      const response = await patchRequest(link.code, body, cookie);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect(
        ((await response.json()) as { error: string }).error.length,
      ).toBeGreaterThan(0);
    }

    expect((await followCode(link.code)).status).toBe(302);
    expect(await countLinks()).toBe(1);
  });
});

describe("S11 DELETE /api/links/:code", () => {
  it("requires an owner session and removes nothing otherwise", async () => {
    const link = await createLink("https://example.com/delete/auth");

    expect((await deleteRequest(link.code)).status).toBe(401);
    expect((await deleteRequest(link.code, await expiredCookie())).status).toBe(
      401,
    );

    expect((await followCode(link.code)).status).toBe(302);
    expect(await countLinks()).toBe(1);
  });

  it("soft-disables the link and keeps its history", async () => {
    const link = await createLink("https://example.com/delete/soft");
    await recordClicksAt(link.code, [new Date()]);

    const response = await deleteRequest(link.code, cookie);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      code: link.code,
      status: "disabled",
    });
    expect((await followCode(link.code)).status).toBe(410);
    // Soft delete: the row and its clicks survive.
    expect(await countLinks()).toBe(1);
    expect(await countClicksForCode(link.code)).toBe(1);
    expect(await countClicks()).toBe(1);
  });

  it("returns 404 for an unknown code", async () => {
    const response = await deleteRequest("zzzzzzz", cookie);

    expect(response.status).toBe(404);
    expect(await countLinks()).toBe(0);
  });
});
