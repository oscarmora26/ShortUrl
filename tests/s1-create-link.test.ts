import { describe, expect, it } from "vitest";

import {
  continueFromGo,
  countLinks,
  followCode,
  postLinkRequest,
  postRawBody,
} from "./helpers";

const TARGET_URL = "https://example.com/some/path?q=1";
const CODE_PATTERN = /^[0-9A-Za-z]{7}$/;
const RESERVED_CODES = [
  "admin",
  "login",
  "api",
  "_next",
  "favicon.ico",
  "health",
  "stats",
];

describe("S1 POST /api/links", () => {
  it("returns 201 with code, shortUrl and targetUrl and the code redirects", async () => {
    const response = await postLinkRequest({ url: TARGET_URL });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      code: string;
      shortUrl: string;
      targetUrl: string;
    };
    expect(Object.keys(body).sort()).toEqual([
      "code",
      "expiresAt",
      "shortUrl",
      "targetUrl",
    ]);
    expect(body.code).toMatch(CODE_PATTERN);
    expect(body.targetUrl).toBe(TARGET_URL);
    expect(body.shortUrl).toBe(`http://localhost:3000/${body.code}`);
    expect(await countLinks()).toBe(1);

    // S4: the very first visit asks for confirmation before redirecting.
    const interstitial = await followCode(body.code);
    expect(interstitial.status).toBe(302);
    expect(interstitial.headers.get("location")).toBe(`/go/${body.code}`);

    expect((await continueFromGo(body.code)).status).toBe(302);

    const redirect = await followCode(body.code);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe(TARGET_URL);
  });

  it("gives every link a unique 7 character code from [0-9A-Za-z]", async () => {
    const codes = new Set<string>();

    for (let index = 0; index < 12; index += 1) {
      const response = await postLinkRequest({ url: `${TARGET_URL}&i=${index}` });
      expect(response.status).toBe(201);
      const { code } = (await response.json()) as { code: string };
      expect(code).toMatch(CODE_PATTERN);
      expect(codes.has(code)).toBe(false);
      codes.add(code);
    }

    expect(codes.size).toBe(12);
    expect(await countLinks()).toBe(12);
  });

  it("never returns a reserved word as the code", async () => {
    for (let index = 0; index < 20; index += 1) {
      const response = await postLinkRequest({ url: `${TARGET_URL}&r=${index}` });
      expect(response.status).toBe(201);
      const { code } = (await response.json()) as { code: string };
      expect(RESERVED_CODES).not.toContain(code);
    }
  });

  it("rejects a non-http(s) url with 400 and creates no row", async () => {
    const invalidUrls = [
      "ftp://example.com/file.txt",
      "javascript:alert(1)",
      "mailto:owner@example.com",
      "example.com",
      "not a url",
      "",
    ];

    for (const url of invalidUrls) {
      const response = await postLinkRequest({ url });
      expect(response.status, `url: ${url}`).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeGreaterThan(0);
    }

    expect(await countLinks()).toBe(0);
  });

  it("accepts a 2048 character url and rejects 2049 characters without creating a row", async () => {
    const prefix = "https://example.com/";
    const exactlyMax = prefix + "a".repeat(2048 - prefix.length);
    expect(exactlyMax).toHaveLength(2048);

    const accepted = await postLinkRequest({ url: exactlyMax });
    expect(accepted.status).toBe(201);
    expect((await accepted.json()) as { targetUrl: string }).toMatchObject({
      targetUrl: exactlyMax,
    });
    expect(await countLinks()).toBe(1);

    const tooLong = prefix + "a".repeat(2049 - prefix.length);
    expect(tooLong).toHaveLength(2049);

    const rejected = await postLinkRequest({ url: tooLong });
    expect(rejected.status).toBe(400);
    const body = (await rejected.json()) as { error: string };
    expect(body.error.length).toBeGreaterThan(0);
    expect(await countLinks()).toBe(1);
  });

  it("rejects a body without a usable url field with 400 and creates no row", async () => {
    const bodies: unknown[] = [
      {},
      { url: 42 },
      { url: null },
      { link: TARGET_URL },
      [],
      "https://example.com",
    ];

    for (const body of bodies) {
      const response = await postLinkRequest(body);
      expect(response.status).toBe(400);
      expect(
        ((await response.json()) as { error: string }).error.length,
      ).toBeGreaterThan(0);
    }

    expect(await countLinks()).toBe(0);
  });

  it("rejects a malformed json body with 400 and creates no row", async () => {
    const response = await postRawBody('{"url": ');

    expect(response.status).toBe(400);
    expect(
      ((await response.json()) as { error: string }).error.length,
    ).toBeGreaterThan(0);
    expect(await countLinks()).toBe(0);
  });
});
