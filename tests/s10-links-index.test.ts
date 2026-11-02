import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as LIST } from "@/app/api/links/route";
import { SESSION_SECRET, TEST_ENV } from "./env";
import {
  backdateLink,
  countClicks,
  countLinks,
  createLink,
  disableLink,
  loginAsAdmin,
  recordClicksAt,
  setEnv,
} from "./helpers";

/**
 * S10: `GET /api/links?q=&status=all|active|disabled&page=1&perPage=20`
 * returns the paginated index of every link.
 */
type Item = {
  code: string;
  targetUrl: string;
  clicks: number;
  createdAt: string;
  status: "active" | "disabled";
};

type Page = {
  items: Item[];
  total: number;
  page: number;
  pageCount: number;
};

function listRequest(query = "", cookie?: string): Promise<Response> {
  return LIST(
    new Request(`http://localhost:3000/api/links${query}`, {
      headers: cookie === undefined ? {} : { cookie },
    }),
  );
}

async function readPage(query: string, cookie: string): Promise<Page> {
  const response = await listRequest(query, cookie);
  expect(response.status, query).toBe(200);
  return (await response.json()) as Page;
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

describe("S10 GET /api/links", () => {
  it("requires an owner session", async () => {
    await createLink("https://example.com/index-auth");

    const anonymous = await listRequest();
    expect(anonymous.status).toBe(401);
    expect(
      ((await anonymous.json()) as { error: string }).error.length,
    ).toBeGreaterThan(0);

    expect((await listRequest("", await expiredCookie())).status).toBe(401);
    expect(await countLinks()).toBe(1);
  });

  it("returns the documented shape with the newest link first", async () => {
    const oldest = await createLink("https://example.com/order/oldest");
    const middle = await createLink("https://example.com/order/middle");
    const newest = await createLink("https://example.com/order/newest");

    await backdateLink(oldest.code, "2025-01-01T12:00:00.000Z");
    await backdateLink(middle.code, "2025-02-01T12:00:00.000Z");
    await backdateLink(newest.code, "2025-03-01T12:00:00.000Z");
    await recordClicksAt(middle.code, [
      new Date("2025-02-10T15:00:00.000Z"),
      new Date("2025-02-11T15:00:00.000Z"),
    ]);

    const page = await readPage("", cookie);

    expect(Object.keys(page).sort()).toEqual([
      "items",
      "page",
      "pageCount",
      "total",
    ]);
    expect(page.total).toBe(3);
    expect(page.page).toBe(1);
    expect(page.pageCount).toBe(1);
    expect(page.items.map((item) => item.code)).toEqual([
      newest.code,
      middle.code,
      oldest.code,
    ]);

    const middleItem = page.items[1];
    expect(Object.keys(middleItem ?? {}).sort()).toEqual([
      "clicks",
      "code",
      "createdAt",
      "status",
      "targetUrl",
    ]);
    expect(middleItem?.targetUrl).toBe("https://example.com/order/middle");
    expect(middleItem?.clicks).toBe(2);
    expect(middleItem?.status).toBe("active");
    expect(middleItem?.createdAt).toBe("2025-02-01T12:00:00.000Z");
  });

  it("matches q against code or target url, case insensitively", async () => {
    const alpha = await createLink("https://example.com/alpha/report");
    const beta = await createLink("https://example.com/beta/invoice");

    const byUrl = await readPage("?q=REPORT", cookie);
    expect(byUrl.total).toBe(1);
    expect(byUrl.items[0]?.code).toBe(alpha.code);

    const byCode = await readPage(
      `?q=${alpha.code.slice(0, 4).toUpperCase()}`,
      cookie,
    );
    expect(byCode.items.map((item) => item.code)).toEqual([alpha.code]);

    const none = await readPage("?q=no-such-thing", cookie);
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);
    expect(none.pageCount).toBe(1);

    expect(beta.code).toMatch(/^[0-9A-Za-z]{7}$/);
    expect(await countLinks()).toBe(2);
  });

  it("filters by status", async () => {
    const active = await createLink("https://example.com/status/active");
    const disabled = await createLink("https://example.com/status/disabled");
    await disableLink(disabled.code);

    const all = await readPage("?status=all", cookie);
    expect(all.total).toBe(2);

    const onlyActive = await readPage("?status=active", cookie);
    expect(onlyActive.items.map((item) => item.code)).toEqual([active.code]);
    expect(onlyActive.total).toBe(1);

    const onlyDisabled = await readPage("?status=disabled", cookie);
    expect(onlyDisabled.items.map((item) => item.code)).toEqual([
      disabled.code,
    ]);
    expect(onlyDisabled.items[0]?.status).toBe("disabled");

    const rejected = await listRequest("?status=archived", cookie);
    expect(rejected.status).toBe(400);
    expect(
      ((await rejected.json()) as { error: string }).error.length,
    ).toBeGreaterThan(0);
  });

  it("paginates with page and perPage", async () => {
    const codes: string[] = [];
    for (let index = 0; index < 5; index += 1) {
      const link = await createLink(`https://example.com/page/${index}`);
      await backdateLink(link.code, `2025-04-0${index + 1}T12:00:00.000Z`);
      codes.push(link.code);
    }
    const newestFirst = [...codes].reverse();

    const first = await readPage("?page=1&perPage=2", cookie);
    expect(first.total).toBe(5);
    expect(first.page).toBe(1);
    expect(first.pageCount).toBe(3);
    expect(first.items.map((item) => item.code)).toEqual(newestFirst.slice(0, 2));

    const second = await readPage("?page=2&perPage=2", cookie);
    expect(second.items.map((item) => item.code)).toEqual(
      newestFirst.slice(2, 4),
    );

    const third = await readPage("?page=3&perPage=2", cookie);
    expect(third.items.map((item) => item.code)).toEqual(newestFirst.slice(4));

    const beyond = await readPage("?page=9&perPage=2", cookie);
    expect(beyond.items).toEqual([]);
    expect(beyond.total).toBe(5);
  });

  it("rejects an invalid page or perPage with 400 and changes nothing", async () => {
    await createLink("https://example.com/page/invalid");

    for (const query of [
      "?page=0",
      "?page=-1",
      "?page=abc",
      "?perPage=0",
      "?perPage=-5",
      "?perPage=abc",
      "?perPage=101",
    ]) {
      const response = await listRequest(query, cookie);
      expect(response.status, query).toBe(400);
      expect(
        ((await response.json()) as { error: string }).error.length,
      ).toBeGreaterThan(0);
    }

    expect(await countLinks()).toBe(1);
  });

  it("does not record a click while listing", async () => {
    const link = await createLink("https://example.com/page/read-only");
    await recordClicksAt(link.code, [new Date()]);

    await readPage("", cookie);
    await readPage("?q=read-only", cookie);

    expect(await countClicks()).toBe(1);
  });
});

/**
 * S10: `q` is a plain substring search. LIKE wildcards in the term must be
 * escaped, otherwise `_` matches any character and `%` matches everything.
 */
describe("S10 search escapes LIKE wildcards", () => {
  it("finds a link whose destination contains an underscore", async () => {
    const created = await createLink("https://example.com/a_b_c");
    const page = await readPage("?q=a_b", cookie);
    expect(page.items.map((item) => item.code)).toContain(created.code);
  });

  it("does not treat a percent sign in the term as a wildcard", async () => {
    await createLink("https://example.com/a_c");
    const page = await readPage("?q=a%25c", cookie);
    expect(page.items).toHaveLength(0);
  });
});
