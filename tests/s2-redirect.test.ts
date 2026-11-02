import { describe, expect, it } from "vitest";

import {
  countClicks,
  countClicksForCode,
  countLinks,
  disableLink,
  followCode,
  postLinkRequest,
} from "./helpers";

async function createLink(targetUrl: string) {
  const response = await postLinkRequest({ url: targetUrl });
  expect(response.status).toBe(201);
  return (await response.json()) as {
    code: string;
    shortUrl: string;
    targetUrl: string;
  };
}

describe("S2 GET /:code", () => {
  it("redirects with 302 to the target and Cache-Control no-store, recording exactly one click", async () => {
    const link = await createLink("https://example.com/landing");

    const response = await followCode(link.code);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(link.targetUrl);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await countClicksForCode(link.code)).toBe(1);
    expect(await countClicks()).toBe(1);

    const second = await followCode(link.code);
    expect(second.status).toBe(302);
    expect(await countClicksForCode(link.code)).toBe(2);
  });

  it("returns 404 for an unknown code and records no click", async () => {
    const response = await followCode("zzzzzzz");

    expect(response.status).toBe(404);
    expect(await countLinks()).toBe(0);
    expect(await countClicks()).toBe(0);
  });

  it("returns 410 for a disabled code and records no click", async () => {
    const link = await createLink("https://example.com/disabled");
    await disableLink(link.code);

    const response = await followCode(link.code);
    expect(response.status).toBe(410);
    expect(await countClicksForCode(link.code)).toBe(0);

    const repeated = await followCode(link.code);
    expect(repeated.status).toBe(410);
    expect(await countClicks()).toBe(0);
  });
});
