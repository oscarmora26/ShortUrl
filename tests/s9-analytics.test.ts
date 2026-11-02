import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as ANALYTICS } from "@/app/api/analytics/route";
import { SESSION_SECRET, TEST_ENV } from "./env";
import {
  countClicks,
  createLink,
  localDateInTimeZone,
  loginAsAdmin,
  recordClicksAt,
  setEnv,
  shiftDate,
} from "./helpers";

/**
 * S9: `GET /api/analytics?range=7|30|90` aggregates every link. Days are
 * bucketed in `ANALYTICS_TZ` and weekday index 0 is Sunday.
 */
const TIME_ZONE = TEST_ENV.ANALYTICS_TZ;

type Day = { date: string; count: number };
type Analytics = {
  range: number;
  totalClicks: number;
  days: Day[];
  topLinks: { code: string; targetUrl: string; clicks: number; share: number }[];
  byWeekday: number[];
  comparison: {
    bestWeekday: number | null;
    averageClicksPerLink: number;
    linksWithZeroClicks: number;
  };
};

function analyticsRequest(query = "", cookie?: string): Promise<Response> {
  return ANALYTICS(
    new Request(`http://localhost:3000/api/analytics${query}`, {
      headers: cookie === undefined ? {} : { cookie },
    }),
  );
}

async function readAnalytics(
  query: string,
  cookie: string,
): Promise<Analytics> {
  const response = await analyticsRequest(query, cookie);
  expect(response.status).toBe(200);
  return (await response.json()) as Analytics;
}

function localNoonUtc(localDate: string): Date {
  // Argentina is UTC-3 all year, so local noon is 15:00 UTC.
  return new Date(`${localDate}T15:00:00.000Z`);
}

function expectedWeekday(localDate: string): number {
  return new Date(`${localDate}T12:00:00Z`).getUTCDay();
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

describe("S9 GET /api/analytics", () => {
  it("requires an owner session", async () => {
    const link = await createLink("https://example.com/analytics-auth");
    await recordClicksAt(link.code, [new Date()]);

    expect((await analyticsRequest("?range=7")).status).toBe(401);

    const expired = await analyticsRequest("?range=7", await expiredCookie());
    expect(expired.status).toBe(401);

    expect(await countClicks()).toBe(1);
  });

  it("defaults to 30 days ending today in ANALYTICS_TZ", async () => {
    const analytics = await readAnalytics("", cookie);
    const today = localDateInTimeZone(new Date(), TIME_ZONE);

    expect(Object.keys(analytics).sort()).toEqual([
      "byWeekday",
      "comparison",
      "days",
      "range",
      "topLinks",
      "totalClicks",
    ]);
    expect(analytics.range).toBe(30);
    expect(analytics.days).toHaveLength(30);
    expect(analytics.days.at(-1)).toEqual({ date: today, count: 0 });
    expect(analytics.days[0]?.date).toBe(shiftDate(today, -29));
    expect(analytics.totalClicks).toBe(0);
    expect(analytics.topLinks).toEqual([]);
    expect(analytics.byWeekday).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(analytics.comparison).toEqual({
      bestWeekday: null,
      averageClicksPerLink: 0,
      linksWithZeroClicks: 0,
    });
  });

  it("accepts 7, 30 and 90 and rejects any other range with 400", async () => {
    for (const range of [7, 30, 90]) {
      const analytics = await readAnalytics(`?range=${range}`, cookie);
      expect(analytics.range).toBe(range);
      expect(analytics.days).toHaveLength(range);
    }

    for (const range of ["0", "15", "365", "-7", "abc", ""]) {
      const response = await analyticsRequest(`?range=${range}`, cookie);
      expect(response.status, `range=${range}`).toBe(400);
      expect(
        ((await response.json()) as { error: string }).error.length,
      ).toBeGreaterThan(0);
    }

    expect(await countClicks()).toBe(0);
  });

  it("counts only the clicks inside the requested range", async () => {
    const link = await createLink("https://example.com/analytics-range");
    const today = localDateInTimeZone(new Date(), TIME_ZONE);

    await recordClicksAt(link.code, [
      localNoonUtc(today),
      localNoonUtc(shiftDate(today, -3)),
      localNoonUtc(shiftDate(today, -40)),
    ]);

    const last7 = await readAnalytics("?range=7", cookie);
    expect(last7.totalClicks).toBe(2);
    expect(last7.days.at(-1)).toEqual({ date: today, count: 1 });

    const last30 = await readAnalytics("?range=30", cookie);
    expect(last30.totalClicks).toBe(2);

    const last90 = await readAnalytics("?range=90", cookie);
    expect(last90.totalClicks).toBe(3);
    expect(last90.days[0]?.date).toBe(shiftDate(today, -89));
  });

  it("ranks the five busiest links with relative counts", async () => {
    const links = [];
    for (let index = 0; index < 6; index += 1) {
      links.push(await createLink(`https://example.com/rank/${index}`));
    }
    const today = localDateInTimeZone(new Date(), TIME_ZONE);

    // Busiest last, so ordering cannot come from insertion order.
    const clickCounts = [1, 2, 3, 4, 5, 6];
    for (const [index, link] of links.entries()) {
      const count = clickCounts[index] ?? 0;
      await recordClicksAt(
        link.code,
        Array.from({ length: count }, () => localNoonUtc(today)),
      );
    }

    const analytics = await readAnalytics("?range=7", cookie);

    expect(analytics.totalClicks).toBe(21);
    expect(analytics.topLinks).toHaveLength(5);
    expect(analytics.topLinks.map((link) => link.clicks)).toEqual([6, 5, 4, 3, 2]);
    expect(analytics.topLinks.map((link) => link.code)).toEqual(
      links.slice(1).reverse().map((link) => link.code),
    );
    expect(analytics.topLinks[0]?.targetUrl).toBe("https://example.com/rank/5");
    expect(analytics.topLinks[0]?.share).toBe(0.29);
    expect(analytics.topLinks[4]?.share).toBe(0.1);
  });

  it("groups clicks by weekday and reports the comparison block", async () => {
    const busy = await createLink("https://example.com/weekday/busy");
    const quiet = await createLink("https://example.com/weekday/quiet");
    await createLink("https://example.com/weekday/never");
    const dormant = await createLink("https://example.com/weekday/dormant");

    const today = localDateInTimeZone(new Date(), TIME_ZONE);
    const older = shiftDate(today, -30);

    await recordClicksAt(busy.code, [
      localNoonUtc(today),
      localNoonUtc(today),
      localNoonUtc(today),
    ]);
    await recordClicksAt(quiet.code, [localNoonUtc(today)]);
    await recordClicksAt(dormant.code, [localNoonUtc(older)]);

    const analytics = await readAnalytics("?range=7", cookie);

    const weekday = expectedWeekday(today);
    expect(analytics.byWeekday).toHaveLength(7);
    expect(analytics.byWeekday[weekday]).toBe(4);
    expect(
      analytics.byWeekday.reduce((sum, count) => sum + count, 0),
    ).toBe(4);

    expect(analytics.comparison.bestWeekday).toBe(weekday);
    // 4 links, 4 clicks inside the range.
    expect(analytics.comparison.averageClicksPerLink).toBe(1);
    // `never` and `dormant` have no clicks inside the range.
    expect(analytics.comparison.linksWithZeroClicks).toBe(2);
  });

  it("rounds the average to two decimals", async () => {
    const first = await createLink("https://example.com/avg/1");
    const second = await createLink("https://example.com/avg/2");
    const third = await createLink("https://example.com/avg/3");
    const today = localDateInTimeZone(new Date(), TIME_ZONE);

    await recordClicksAt(first.code, [localNoonUtc(today), localNoonUtc(today)]);
    await recordClicksAt(second.code, [localNoonUtc(today)]);

    const analytics = await readAnalytics("?range=7", cookie);

    expect(third.code).toMatch(/^[0-9A-Za-z]{7}$/);
    expect(analytics.totalClicks).toBe(3);
    expect(analytics.comparison.averageClicksPerLink).toBe(1);
  });

  it("does not record a click while reading analytics", async () => {
    const link = await createLink("https://example.com/analytics-read-only");
    await recordClicksAt(link.code, [new Date()]);

    await readAnalytics("?range=7", cookie);
    await readAnalytics("?range=90", cookie);

    expect(await countClicks()).toBe(1);
  });
});
