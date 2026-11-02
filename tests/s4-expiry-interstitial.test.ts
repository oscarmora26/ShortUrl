import { describe, expect, it } from "vitest";

import {
  continueFromGo,
  countClicks,
  countClicksForCode,
  countLinks,
  createLink,
  disableLink,
  expireLink,
  followCode,
  followGo,
  postLinkRequest,
} from "./helpers";

/** S4: anonymous links live 30 days. */
const LINK_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOLERANCE_MS = 120_000;

const TARGET_URL = "https://example.com/destino?campania=verano&origen=short";

describe("S4 link expiry", () => {
  it("returns expiresAt 30 days after creation", async () => {
    const before = Date.now();
    const link = await createLink(TARGET_URL);
    const after = Date.now();

    const expiresAt = Date.parse(link.expiresAt);
    expect(Number.isNaN(expiresAt)).toBe(false);
    expect(expiresAt).toBeGreaterThanOrEqual(
      before + LINK_TTL_DAYS * DAY_MS - TOLERANCE_MS,
    );
    expect(expiresAt).toBeLessThanOrEqual(
      after + LINK_TTL_DAYS * DAY_MS + TOLERANCE_MS,
    );
  });

  it("returns 410 for an expired code and records no click", async () => {
    const link = await createLink(TARGET_URL);
    await expireLink(link.code);

    const response = await followCode(link.code);
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const repeated = await followCode(link.code);
    expect(repeated.status).toBe(410);

    expect(await countClicksForCode(link.code)).toBe(0);
    expect(await countClicks()).toBe(0);
    expect(await countLinks()).toBe(1);
  });

  it("returns 410 on the interstitial of an expired code and records no click", async () => {
    const link = await createLink(TARGET_URL);
    await expireLink(link.code);

    expect((await followGo(link.code)).status).toBe(410);
    expect((await continueFromGo(link.code)).status).toBe(410);
    expect(await countClicks()).toBe(0);
  });
});

describe("S4 interstitial for a link with no click yet", () => {
  it("shows the destination, a warning, Continuar and Volver without recording a click", async () => {
    const link = await createLink(TARGET_URL);

    const response = await followGo(link.code);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const html = await response.text();
    expect(html).toContain("https://example.com/destino?campania=verano&amp;origen=short");
    expect(html.toLowerCase()).toContain("anónimo");
    expect(html).toContain("Continuar");
    expect(html).toContain("Volver");
    expect(html).toContain(`/go/${link.code}`);

    // Nothing is recorded until `Continuar` is pressed.
    expect(await countClicksForCode(link.code)).toBe(0);
    expect(await countLinks()).toBe(1);
  });

  it("escapes the destination instead of injecting it into the page", async () => {
    const hostile = "https://example.com/x?q=<script>alert(1)</script>";
    const link = await createLink(hostile);

    const html = await (await followGo(link.code)).text();

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sends the first visit of /:code to the interstitial instead of the target", async () => {
    const link = await createLink(TARGET_URL);

    const first = await followCode(link.code);
    expect(first.status).toBe(302);
    expect(first.headers.get("location")).toBe(`/go/${link.code}`);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await countClicksForCode(link.code)).toBe(0);

    const interstitial = await followGo(link.code);
    expect(interstitial.status).toBe(200);
    expect(await countClicksForCode(link.code)).toBe(0);
  });

  it("records the click on Continuar and redirects to the destination", async () => {
    const link = await createLink(TARGET_URL);

    const continued = await continueFromGo(link.code);

    expect(continued.status).toBe(302);
    expect(continued.headers.get("location")).toBe(TARGET_URL);
    expect(continued.headers.get("cache-control")).toBe("no-store");
    expect(await countClicksForCode(link.code)).toBe(1);

    // Once clicked, the interstitial is gone and /:code redirects directly.
    const direct = await followCode(link.code);
    expect(direct.status).toBe(302);
    expect(direct.headers.get("location")).toBe(TARGET_URL);
    expect(await countClicksForCode(link.code)).toBe(2);

    const reopened = await followGo(link.code);
    expect(reopened.status).toBe(302);
    expect(reopened.headers.get("location")).toBe(`/${link.code}`);
    expect(await countClicks()).toBe(2);
  });

  it("cannot be skipped: only Continuar records the click", async () => {
    const link = await createLink(TARGET_URL);

    for (let index = 0; index < 3; index += 1) {
      expect((await followGo(link.code)).status).toBe(200);
      expect((await followCode(link.code)).status).toBe(302);
    }
    expect(await countClicks()).toBe(0);

    expect((await continueFromGo(link.code)).status).toBe(302);
    expect(await countClicks()).toBe(1);
  });

  it("returns 404 for an unknown code on the interstitial and records no click", async () => {
    expect((await followGo("zzzzzzz")).status).toBe(404);
    expect((await continueFromGo("zzzzzzz")).status).toBe(404);
    expect(await countLinks()).toBe(0);
    expect(await countClicks()).toBe(0);
  });

  it("returns 410 for a disabled code on the interstitial and records no click", async () => {
    const link = await createLink(TARGET_URL);
    await disableLink(link.code);

    expect((await followGo(link.code)).status).toBe(410);
    expect((await continueFromGo(link.code)).status).toBe(410);
    expect(await countClicksForCode(link.code)).toBe(0);
  });

  it("rejects a rejected url without changing stored state", async () => {
    const before = await countLinks();
    const response = await postLinkRequest({ url: "javascript:alert(1)" });
    expect(response.status).toBe(400);
    expect(await countLinks()).toBe(before);
    expect(await countClicks()).toBe(0);
  });
});
