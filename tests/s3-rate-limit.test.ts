import { afterEach, describe, expect, it } from "vitest";

import { TEST_ENV } from "./env";
import {
  clearEnv,
  countLinks,
  forwardedFor,
  postLinkRequest,
  setEnv,
} from "./helpers";

/**
 * S3: 20 links per IP per hour, counted in Postgres.
 *
 * The counter is stored, not held in memory, so the assertions below only look
 * at what a client can observe: the status codes and the number of link rows.
 */
const LIMIT = 20;
const URL_FOR = (index: number) => `https://example.com/rate/${index}`;

function restoreTrustProxy(): void {
  setEnv("TRUST_PROXY", TEST_ENV.TRUST_PROXY);
}

afterEach(restoreTrustProxy);

async function createUntilLimit(headers: Record<string, string>): Promise<void> {
  for (let index = 0; index < LIMIT; index += 1) {
    const response = await postLinkRequest({ url: URL_FOR(index) }, headers);
    expect(response.status, `request ${index + 1}`).toBe(201);
  }
}

describe("S3 creation rate limit", () => {
  it("returns 429 for the 21st link from one IP in an hour and writes no row", async () => {
    setEnv("TRUST_PROXY", "true");
    const headers = forwardedFor("203.0.113.7");

    await createUntilLimit(headers);
    expect(await countLinks()).toBe(LIMIT);

    const rejected = await postLinkRequest({ url: URL_FOR(LIMIT) }, headers);
    expect(rejected.status).toBe(429);
    const body = (await rejected.json()) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);

    expect(await countLinks()).toBe(LIMIT);
  });

  it("keeps a separate budget for every client IP", async () => {
    setEnv("TRUST_PROXY", "true");
    const firstClient = forwardedFor("198.51.100.10");
    const secondClient = forwardedFor("198.51.100.20");

    await createUntilLimit(firstClient);
    expect((await postLinkRequest({ url: URL_FOR(90) }, firstClient)).status).toBe(
      429,
    );
    expect(await countLinks()).toBe(LIMIT);

    const otherClient = await postLinkRequest({ url: URL_FOR(91) }, secondClient);
    expect(otherClient.status).toBe(201);
    expect(await countLinks()).toBe(LIMIT + 1);
  });

  it("ignores X-Forwarded-For while TRUST_PROXY is not enabled", async () => {
    clearEnv("TRUST_PROXY");

    // Twenty different spoofed headers must not buy a 21st link.
    for (let index = 0; index < LIMIT; index += 1) {
      const response = await postLinkRequest(
        { url: URL_FOR(index) },
        forwardedFor(`10.0.0.${index}`),
      );
      expect(response.status, `request ${index + 1}`).toBe(201);
    }

    const rejected = await postLinkRequest(
      { url: URL_FOR(LIMIT) },
      forwardedFor("10.0.0.200"),
    );
    expect(rejected.status).toBe(429);
    expect(await countLinks()).toBe(LIMIT);
  });

  it("trusts only the last X-Forwarded-For entry", async () => {
    setEnv("TRUST_PROXY", "true");
    const realClient = "198.51.100.9";

    for (let index = 0; index < LIMIT; index += 1) {
      const response = await postLinkRequest(
        { url: URL_FOR(index) },
        forwardedFor(`10.0.0.${index}`, realClient),
      );
      expect(response.status, `request ${index + 1}`).toBe(201);
    }

    // Same last hop, different first hop: still the same client, still spent.
    const exhausted = await postLinkRequest(
      { url: URL_FOR(LIMIT) },
      forwardedFor("172.16.0.1", realClient),
    );
    expect(exhausted.status).toBe(429);
    expect(await countLinks()).toBe(LIMIT);

    // The first hop is not what gets counted, so moving it to the end means a
    // different client with a fresh budget.
    const otherClient = await postLinkRequest(
      { url: URL_FOR(LIMIT + 1) },
      forwardedFor(realClient, "172.16.0.1"),
    );
    expect(otherClient.status).toBe(201);
    expect(await countLinks()).toBe(LIMIT + 1);
  });
});
