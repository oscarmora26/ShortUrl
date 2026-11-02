import { afterEach, describe, expect, it, vi } from "vitest";

import { clearEnv, countLinks, createLink, postLinkRequest, setEnv } from "./helpers";

/**
 * S5: Google Safe Browsing is optional hardening. When the key is present the
 * destination is checked before insert; when it is absent the check is skipped
 * and the app still works. The HTTP call is stubbed, never real.
 */
const TARGET_URL = "https://example.com/safe-browsing";
const SAFE_BROWSING_ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

type FetchCall = { url: string; body: unknown };

function stubFetch(
  response: () => Promise<Response> | Response,
): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      calls.push({ url: String(input), body: init?.body });
      return response();
    }),
  );
  return calls;
}

function flaggedResponse(): Response {
  return new Response(
    JSON.stringify({
      matches: [
        {
          threatType: "SOCIAL_ENGINEERING",
          threat: { url: TARGET_URL },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function cleanResponse(): Response {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearEnv("SAFE_BROWSING_API_KEY");
});

describe("S5 Safe Browsing", () => {
  it("rejects a flagged destination with 400 before inserting anything", async () => {
    setEnv("SAFE_BROWSING_API_KEY", "test-key");
    const calls = stubFetch(flaggedResponse);

    const response = await postLinkRequest({ url: TARGET_URL });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error.length).toBeGreaterThan(0);
    expect(await countLinks()).toBe(0);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(SAFE_BROWSING_ENDPOINT);
    expect(calls[0]?.url).toContain("key=test-key");
    expect(String(calls[0]?.body)).toContain(TARGET_URL);
  });

  it("creates the link when the destination is not flagged", async () => {
    setEnv("SAFE_BROWSING_API_KEY", "test-key");
    const calls = stubFetch(cleanResponse);

    const link = await createLink(TARGET_URL);

    expect(link.targetUrl).toBe(TARGET_URL);
    expect(await countLinks()).toBe(1);
    expect(calls).toHaveLength(1);
  });

  it("skips the check and still boots when the key is absent", async () => {
    const calls = stubFetch(() => {
      throw new Error("Safe Browsing must not be called without a key");
    });

    const response = await postLinkRequest({ url: TARGET_URL });

    expect(response.status).toBe(201);
    expect(await countLinks()).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("fails open when the Safe Browsing service is unreachable", async () => {
    setEnv("SAFE_BROWSING_API_KEY", "test-key");
    stubFetch(() => {
      throw new Error("network down");
    });

    const response = await postLinkRequest({ url: TARGET_URL });

    expect(response.status).toBe(201);
    expect(await countLinks()).toBe(1);
  });

  it("fails open when Safe Browsing answers with an error status", async () => {
    setEnv("SAFE_BROWSING_API_KEY", "test-key");
    stubFetch(() => new Response("upstream sad", { status: 503 }));

    const response = await postLinkRequest({ url: TARGET_URL });

    expect(response.status).toBe(201);
    expect(await countLinks()).toBe(1);
  });

  it("still rejects an invalid url without calling Safe Browsing", async () => {
    setEnv("SAFE_BROWSING_API_KEY", "test-key");
    const calls = stubFetch(cleanResponse);

    const response = await postLinkRequest({ url: "javascript:alert(1)" });

    expect(response.status).toBe(400);
    expect(await countLinks()).toBe(0);
    expect(calls).toHaveLength(0);
  });
});
